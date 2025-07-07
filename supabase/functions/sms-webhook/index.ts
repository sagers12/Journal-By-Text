import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { validateSurgeSignature } from './signature-validation.ts'
import { sendInstructionMessage, sendConfirmationMessage } from './message-handlers.ts'
import { processPhoneVerification, processJournalEntry } from './sms-processing.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
      signature: surgeSignature,
      headers: Object.fromEntries(req.headers.entries()),
      rawBody: body,
      method: req.method,
      url: req.url
    })

    // Parse the webhook data first to see what we're dealing with
    let data
    try {
      data = JSON.parse(body)
      console.log('Parsed webhook data:', JSON.stringify(data, null, 2))
    } catch (parseError) {
      console.error('Failed to parse webhook body:', parseError)
      return new Response('Invalid JSON', { status: 400, headers: corsHeaders })
    }

    // Handle different webhook formats from Surge
    if (!data || typeof data !== 'object') {
      console.log('Invalid webhook data structure:', data)
      return new Response('Invalid data structure', { status: 400, headers: corsHeaders })
    }

    // Check if this is a test webhook (like {"name": "Functions"})
    if (data.name === "Functions" || (!data.type && !data.event)) {
      console.log('Received test webhook or webhook without type/event field:', data)
      return new Response('OK - Test webhook received', { status: 200, headers: corsHeaders })
    }

    // Validate signature if secret is configured
    if (webhookSecret && surgeSignature) {
      try {
        const isValid = await validateSurgeSignature(body, surgeSignature, webhookSecret)
        if (!isValid) {
          console.error('Invalid webhook signature')
          return new Response('Unauthorized', { status: 401, headers: corsHeaders })
        }
        console.log('Webhook signature validated successfully')
      } catch (sigError) {
        console.error('Signature validation error:', sigError)
        // Continue processing for debugging, but log the error
      }
    } else {
      console.log('Webhook signature validation skipped - missing secret or signature')
    }

    // Determine payload format and extract event type
    let eventType = null
    let messageData = null
    
    // Try new format first (payload.event and payload.properties)
    if (data.event && data.properties) {
      console.log('Using new payload format (event/properties)')
      eventType = data.event
      messageData = data.properties
    }
    // Fall back to old format (payload.type and payload.data)
    else if (data.type && data.data) {
      console.log('Using old payload format (type/data)')
      eventType = data.type
      messageData = data.data
    }
    else {
      console.error('Unknown payload format:', data)
      return new Response('Bad Request: Unknown payload format', { status: 400, headers: corsHeaders })
    }

    // Filter for message.received events only
    if (eventType !== 'message.received') {
      console.log('Ignoring non-message event:', eventType)
      return new Response('OK', { status: 200, headers: corsHeaders })
    }

    if (!messageData) {
      console.error('No message data field in webhook:', data)
      return new Response('Bad Request: No message data field', { status: 400, headers: corsHeaders })
    }

    // Extract message details - handle both formats
    let messageId, messageBody, fromPhone, conversationId, attachments
    
    // New format extraction
    if (data.event) {
      messageId = messageData.id
      messageBody = messageData.content?.trim() || ''
      fromPhone = messageData.contact?.phone_number
      conversationId = messageData.conversation?.id
      attachments = messageData.attachments || []
    }
    // Old format extraction
    else {
      messageId = messageData.id
      messageBody = messageData.body?.trim() || ''
      fromPhone = messageData.conversation?.contact?.phone_number
      conversationId = messageData.conversation?.id
      attachments = messageData.attachments || []
    }

    console.log('DEBUG: conversationId extraction:', {
      conversationId,
      hasConversationId: !!conversationId,
      conversationPath: data.event ? 'messageData.conversation?.id' : 'messageData.conversation?.id',
      conversationObject: data.event ? messageData.conversation : messageData.conversation
    })

    console.log('Extracted message data:', {
      messageId,
      messageBody,
      fromPhone,
      attachmentsCount: attachments.length,
      conversationId,
      format: data.event ? 'new' : 'old',
      rawAttachments: attachments,
      conversationData: data.event ? messageData.conversation : messageData.conversation
    })

    if (!messageId || !messageBody || !fromPhone) {
      console.error('Missing required message data:', { messageId, messageBody, fromPhone })
      return new Response('Bad Request: Missing required message data', {
        status: 400,
        headers: corsHeaders
      })
    }

    // Check for duplicate messages using message ID
    const { data: existingMessage } = await supabaseClient
      .from('sms_messages')
      .select('id')
      .eq('surge_message_id', messageId)
      .single()

    if (existingMessage) {
      console.log('Duplicate message ignored:', messageId)
      return new Response('OK - Duplicate', { status: 200, headers: corsHeaders })
    }

    // Normalize phone number for matching - try multiple formats
    const normalizedPhone = fromPhone.replace(/[\s\-\+\(\)]/g, '')
    const phoneFormats = [
      fromPhone,
      normalizedPhone,
      `+1${normalizedPhone}`,
      `1${normalizedPhone}`,
      `+${normalizedPhone}`
    ]

    console.log('Looking for user with phone formats:', phoneFormats)

    // Find user by phone number with multiple format attempts
    const { data: profiles, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, phone_number, phone_verified')
      .or(phoneFormats.map(format => `phone_number.eq.${format}`).join(','))

    console.log('Profile lookup result:', { profiles, profileError, count: profiles?.length })

    if (profileError || !profiles || profiles.length === 0) {
      console.error('User not found for phone number:', fromPhone)
      
      // Create SMS message record even if user not found for debugging
      await supabaseClient
        .from('sms_messages')
        .insert({
          surge_message_id: messageId,
          phone_number: fromPhone,
          message_content: messageBody,
          entry_date: new Date().toISOString().split('T')[0],
          processed: false,
          error_message: 'User not found',
          user_id: '00000000-0000-0000-0000-000000000000' // Placeholder UUID
        })

      return new Response(
        JSON.stringify({ error: 'User not found', phone: fromPhone, messageId }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const profile = profiles[0]
    const userId = profile.id
    const entryDate = new Date().toISOString().split('T')[0]

    console.log('Processing message for user:', { userId, entryDate, phoneVerified: profile.phone_verified })

    // Check if this is a "YES" response to verify phone number
    if (messageBody.toUpperCase() === 'YES' && !profile.phone_verified) {
      const result = await processPhoneVerification(
        supabaseClient,
        messageBody,
        userId,
        messageId,
        fromPhone,
        entryDate
      )

      // Send follow-up instruction message
      console.log('About to send instruction message with conversationId:', conversationId)
      if (conversationId) {
        await sendInstructionMessage(conversationId)
      } else {
        console.error('No conversationId available for instruction message')
      }

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Only process journal entries for verified phone numbers
    if (!profile.phone_verified) {
      console.log('Phone not verified, skipping journal entry creation')
      
      await supabaseClient
        .from('sms_messages')
        .insert({
          user_id: userId,
          surge_message_id: messageId,
          phone_number: fromPhone,
          message_content: messageBody,
          entry_date: entryDate,
          processed: false,
          error_message: 'Phone not verified'
        })

      return new Response(
        JSON.stringify({ error: 'Phone not verified', messageId }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process journal entry
    const result = await processJournalEntry(
      supabaseClient,
      messageBody,
      userId,
      messageId,
      fromPhone,
      entryDate,
      attachments
    )

    // Send auto-reply confirmation
    if (conversationId) {
      await sendConfirmationMessage(conversationId)
    } else {
      console.error('No conversationId available for confirmation message')
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('SMS webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})