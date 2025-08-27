import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import GraphemeSplitter from 'https://esm.sh/grapheme-splitter@1.0.4'
import { validateSurgeSignature } from './signature-validation.ts'
import { sendInstructionMessage, sendConfirmationMessage, sendSubscriptionReminderMessage, sendWelcomeMessage, sendFirstEntryPromptMessage, sendFirstJournalEntryMessage } from './message-handlers.ts'
import { processPhoneVerification, processJournalEntry } from './sms-processing.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Mask phone for logs
function maskPhone(phone: string): string {
  return phone ? phone.replace(/.(?=.{4})/g, '*') : '';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Enhanced logging function
  async function logEvent(supabaseClient: any, eventType: string, data: any) {
    try {
      await supabaseClient
        .from('sms_processing_events')
        .insert({
          event_type: eventType,
          surge_message_id: data.surgeMessageId,
          phone_number: data.phoneNumber,
          user_id: data.userId,
          entry_id: data.entryId,
          processing_time_ms: data.processingTime,
          details: data.details
        })
    } catch (error) {
      console.log('Failed to log event:', error.message)
    }
  }

  // Background processing function for heavy work
  async function processMessageAsync(webhookData: any, supabaseClient: any) {
    const processingStart = Date.now()
    try {
      console.log('Starting background message processing...')
      
      // Extract message details from webhook data
      let messageId = ''
      let messageBody = ''
      let fromPhone = ''
      let conversationId = ''
      let attachments: any[] = []
      
      // Handle both new and old format
      if (webhookData?.data) {
        messageId = webhookData.data.id || ''
        messageBody = webhookData.data.body?.trim() || ''
        fromPhone = webhookData.data.conversation?.contact?.phone_number || ''
        conversationId = webhookData.data.conversation?.id || ''
        attachments = (webhookData.data.attachments || []).filter((att: any) => 
          ['file', 'image', 'link', 'video'].includes(att.type)
        )
      } else if (webhookData?.properties) {
        messageId = webhookData.properties.id || ''
        messageBody = webhookData.properties.content?.trim() || ''
        fromPhone = webhookData.properties.contact?.phone_number || ''
        conversationId = webhookData.properties.conversation?.id || ''
        attachments = (webhookData.properties.attachments || []).filter((att: any) => 
          ['file', 'image', 'link', 'video'].includes(att.type)
        )
      }

      // If message body is empty, log and exit early
      if (!messageBody) {
        console.warn('Empty body from Surge message.received', { 
          eventType: webhookData?.type || webhookData?.event,
          id: messageId,
          hasData: !!webhookData?.data,
          hasProperties: !!webhookData?.properties,
          bodyType: typeof (webhookData?.data?.body || webhookData?.properties?.content)
        })
        return
      }

      // Enhanced message length validation with grapheme-aware counting
      const splitter = new GraphemeSplitter()
      const graphemes = splitter.splitGraphemes(messageBody)
      const charCount = graphemes.length
      const byteCount = new TextEncoder().encode(messageBody).length
      
      const CHAR_LIMIT = 10_000
      let finalMessageBody = messageBody
      let truncated = false
      
      if (charCount > CHAR_LIMIT) {
        finalMessageBody = graphemes.slice(0, CHAR_LIMIT).join('')
        truncated = true
        
        console.warn('Message truncated to limit', { 
          messageId, 
          charCount, 
          byteCount, 
          originalLength: messageBody.length,
          truncatedLength: finalMessageBody.length
        })
      }

      // Find user by phone number
      const normalizedPhone = fromPhone.replace(/[\s\-\+\(\)]/g, '')
      const phoneFormats = [
        fromPhone,
        normalizedPhone,
        `+1${normalizedPhone}`,
        `1${normalizedPhone}`,
        `+${normalizedPhone}`
      ]

      const { data: profiles, error: profileError } = await supabaseClient
        .from('profiles')
        .select('id, phone_number, phone_verified')
        .or(phoneFormats.map(format => `phone_number.eq.${format}`).join(','))

      if (profileError || !profiles || profiles.length === 0) {
        console.error('User not found for phone number:', maskPhone(fromPhone))
        
        // Store message for unknown user using upsert for idempotency
        await supabaseClient
          .from('sms_messages')
          .upsert({
            surge_message_id: messageId,
            phone_number: fromPhone,
            message_content: messageBody,
            entry_date: new Date().toISOString().split('T')[0],
            processed: false,
            error_message: 'User not found',
            user_id: '00000000-0000-0000-0000-000000000000',
            char_count: charCount,
            byte_count: byteCount,
            truncated: false
          }, { onConflict: 'surge_message_id' })
        
        // Check rate limit for unknown user welcome messages (5 per lifetime)
        const rateLimitResult = await supabaseClient.rpc('check_rate_limit', {
          p_identifier: fromPhone,
          p_endpoint: 'sms_welcome_unknown',
          p_max_attempts: 5,
          p_window_minutes: 525600 // 1 year = effectively lifetime limit
        })
        
        if (rateLimitResult.error) {
          console.error('Rate limit check error for unknown user:', rateLimitResult.error)
        } else if (rateLimitResult.data?.allowed) {
          // Send welcome message to unknown user
          await sendWelcomeMessage(fromPhone)
          console.log(`Welcome message sent to unknown user: ${maskPhone(fromPhone)} (attempt ${rateLimitResult.data.attempts}/5)`)
        } else {
          console.log(`Rate limit exceeded for unknown user: ${maskPhone(fromPhone)} - no welcome message sent`)
        }
        
        return
      }

      const profile = profiles[0]
      const userId = profile.id
      const entryDate = new Date().toISOString().split('T')[0]

      console.log('Processing message for user:', { userId, entryDate, phoneVerified: profile.phone_verified })

      // Store oversized message for audit if truncated
      if (truncated) {
        await supabaseClient
          .from('oversized_messages')
          .insert({
            surge_message_id: messageId,
            phone_number: fromPhone,
            original_content: messageBody,
            char_count: charCount,
            byte_count: byteCount,
            user_id: userId,
            entry_date: entryDate
          })
          .then(({ error: auditError }) => {
            if (auditError) {
              console.error('Failed to store oversized message for audit:', auditError)
            }
          })
      }

      // Handle phone verification
      if (finalMessageBody.toUpperCase() === 'YES' && !profile.phone_verified) {
        await processPhoneVerification(
          supabaseClient,
          finalMessageBody,
          userId,
          messageId,
          fromPhone,
          entryDate
        )
        await sendInstructionMessage(fromPhone)
        
        // Add small delay before sending first entry prompt
        await new Promise(resolve => setTimeout(resolve, 2000))
        await sendFirstEntryPromptMessage(fromPhone)
        return
      }

      // Skip processing if phone not verified
      if (!profile.phone_verified) {
        console.log('Phone not verified, storing message only')
        await supabaseClient
          .from('sms_messages')
          .upsert({
            user_id: userId,
            surge_message_id: messageId,
            phone_number: fromPhone,
            message_content: finalMessageBody,
            entry_date: entryDate,
            processed: false,
            error_message: 'Phone not verified',
            char_count: charCount,
            byte_count: byteCount,
            truncated: truncated
          }, { onConflict: 'surge_message_id' })
        return
      }

      // Check subscription status
      const { data: subscriber } = await supabaseClient
        .from('subscribers')
        .select('subscribed, is_trial, trial_end, email')
        .eq('user_id', userId)
        .single()

      const now = new Date()
      const trialEnd = subscriber?.trial_end ? new Date(subscriber.trial_end) : null
      const isTrialActive = subscriber?.is_trial && trialEnd && trialEnd > now
      const hasAccess = subscriber?.subscribed || isTrialActive

      if (!hasAccess) {
        console.log('User does not have access - expired trial or no subscription')
        await supabaseClient
          .from('sms_messages')
          .upsert({
            user_id: userId,
            surge_message_id: messageId,
            phone_number: fromPhone,
            message_content: finalMessageBody,
            entry_date: entryDate,
            processed: false,
            error_message: 'No active subscription',
            char_count: charCount,
            byte_count: byteCount,
            truncated: truncated
          }, { onConflict: 'surge_message_id' })
        
        await sendSubscriptionReminderMessage(fromPhone)
        return
      }

      // Process journal entry
      const entryResult = await processJournalEntry(
        supabaseClient,
        finalMessageBody,
        userId,
        messageId,
        fromPhone,
        entryDate,
        attachments,
        { charCount, byteCount, truncated }
      )

      await sendConfirmationMessage(fromPhone)

      // If this is the user's first entry, send the special congratulatory message
      if (entryResult.isFirstEntry) {
        console.log('User created their first journal entry - sending congratulatory message')
        // Add small delay before sending first entry congratulatory message
        await new Promise(resolve => setTimeout(resolve, 2000))
        await sendFirstJournalEntryMessage(fromPhone)
      }
      
      console.log('Background message processing completed successfully')
    } catch (error) {
      console.error('Error in background message processing:', error)
    }
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the raw body and headers for signature validation
    const body = await req.text()
    const surgeSignature = req.headers.get('Surge-Signature')
    const webhookSecret = Deno.env.get('SURGE_WEBHOOK_SECRET')

    console.log('SMS webhook received:', {
      hasSignature: !!surgeSignature,
      hasSecret: !!webhookSecret,
      bodyLength: body.length,
      method: req.method,
      url: req.url
    })

    // Parse the webhook data first
    let data
    try {
      data = JSON.parse(body)
      console.log('Parsed webhook data:', JSON.stringify(data, null, 2))
    } catch (parseError) {
      console.error('Failed to parse webhook body:', parseError)
      return new Response('Invalid JSON', { status: 400, headers: corsHeaders })
    }

    // Handle different webhook formats
    if (!data || typeof data !== 'object') {
      console.log('Invalid webhook data structure:', data)
      return new Response('Invalid data structure', { status: 400, headers: corsHeaders })
    }

    // Check if this is a test webhook
    if (data.name === "Functions" || (!data.type && !data.event)) {
      console.log('Received test webhook or webhook without type/event field:', data)
      return new Response('OK - Test webhook received', { status: 200, headers: corsHeaders })
    }

    // CRITICAL: Validate signature
    if (!webhookSecret) {
      console.error('SECURITY: Webhook secret not configured')
      return new Response('Server configuration error', { status: 500, headers: corsHeaders })
    }

    if (!surgeSignature) {
      console.error('SECURITY: No webhook signature provided')
      return new Response('Unauthorized - missing signature', { status: 401, headers: corsHeaders })
    }

    try {
      const isValid = await validateSurgeSignature(body, surgeSignature, webhookSecret)
      if (!isValid) {
        console.error('SECURITY: Invalid webhook signature')
        
        await supabaseClient
          .from('security_events')
          .insert({
            event_type: 'invalid_webhook_signature',
            identifier: 'sms_webhook',
            details: {
              provided_signature: surgeSignature,
              body_length: body.length,
              timestamp: new Date().toISOString()
            },
            severity: 'high'
          })
        
        return new Response('Unauthorized', { status: 401, headers: corsHeaders })
      }
      console.log('Webhook signature validated successfully')
    } catch (sigError) {
      console.error('Signature validation error:', sigError)
      return new Response('Signature validation failed', { status: 401, headers: corsHeaders })
    }

    // Determine payload format and extract event type
    let eventType = null
    
    if (data.event && data.properties) {
      eventType = data.event
    } else if (data.type && data.data) {
      eventType = data.type
    } else {
      console.error('Unknown payload format:', data)
      return new Response('Bad Request: Unknown payload format', { status: 400, headers: corsHeaders })
    }

    // Filter for message.received events only
    if (eventType !== 'message.received') {
      console.log('Ignoring non-message event:', eventType)
      return new Response('OK', { status: 200, headers: corsHeaders })
    }

    // Basic validation of message ID for idempotency
    const messageId = data.data?.id || data.properties?.id
    if (!messageId || typeof messageId !== 'string') {
      console.error('Invalid or missing message ID')
      return new Response('Bad Request: Invalid message ID', { status: 400, headers: corsHeaders })
    }

    // Start background processing without waiting
    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    EdgeRuntime.waitUntil(processMessageAsync(data, supabaseClient))

    // Return 200 immediately for fast response
    return new Response('OK', { status: 200, headers: corsHeaders })

  } catch (error) {
    console.error('SMS webhook error:', error)
    return new Response('Internal Server Error', { status: 500, headers: corsHeaders })
  }
})