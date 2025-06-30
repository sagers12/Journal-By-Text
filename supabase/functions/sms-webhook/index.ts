
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

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

    console.log('Extracted message data:', {
      messageId,
      messageBody,
      fromPhone,
      attachmentsCount: attachments.length,
      conversationId,
      format: data.event ? 'new' : 'old'
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
    const timestamp = new Date().toLocaleTimeString()

    console.log('Processing message for user:', { userId, entryDate, phoneVerified: profile.phone_verified })

    // Check if this is a "YES" response to verify phone number
    if (messageBody.toUpperCase() === 'YES' && !profile.phone_verified) {
      console.log('Processing YES response for phone verification')
      
      // Update phone verification status
      const { error: verifyError } = await supabaseClient
        .from('profiles')
        .update({ phone_verified: true })
        .eq('id', userId)

      if (verifyError) {
        console.error('Error updating phone verification:', verifyError)
      } else {
        console.log('Phone verified successfully for user:', userId)
      }

      // Send follow-up instruction message
      await sendInstructionMessage(conversationId)

      // Store the YES message
      await supabaseClient
        .from('sms_messages')
        .insert({
          user_id: userId,
          surge_message_id: messageId,
          phone_number: fromPhone,
          message_content: messageBody,
          entry_date: entryDate,
          processed: true
        })

      return new Response(
        JSON.stringify({ success: true, action: 'phone_verified', messageId }),
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

    // Store SMS message record first
    const { data: smsMessage, error: smsError } = await supabaseClient
      .from('sms_messages')
      .insert({
        user_id: userId,
        surge_message_id: messageId,
        phone_number: fromPhone,
        message_content: messageBody,
        entry_date: entryDate,
        processed: false
      })
      .select()
      .single()

    if (smsError) {
      console.error('Error storing SMS message:', smsError)
      throw new Error(`Failed to store SMS message: ${smsError.message}`)
    }

    console.log('SMS message stored:', smsMessage.id)

    // Check for existing journal entry for today
    const { data: existingEntry, error: existingError } = await supabaseClient
      .from('journal_entries')
      .select('id, content')
      .eq('user_id', userId)
      .eq('entry_date', entryDate)
      .eq('source', 'sms')
      .single()

    console.log('Existing entry check:', { hasExisting: !!existingEntry, existingError })

    let entryId: string

    if (existingEntry) {
      // Append to existing entry with timestamp
      const updatedContent = `${existingEntry.content}\n\n[${timestamp}] ${messageBody}`
      
      const { data: updatedEntry, error: updateError } = await supabaseClient
        .from('journal_entries')
        .update({ content: updatedContent })
        .eq('id', existingEntry.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating journal entry:', updateError)
        throw updateError
      }
      
      console.log('Updated existing entry:', updatedEntry.id)
      entryId = existingEntry.id
    } else {
      // Create new journal entry
      const title = `Journal Entry - ${new Date(entryDate).toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      })}`
      
      const content = `[${timestamp}] ${messageBody}`

      const { data: newEntry, error: entryError } = await supabaseClient
        .from('journal_entries')
        .insert({
          user_id: userId,
          content,
          title,
          source: 'sms',
          entry_date: entryDate,
          tags: []
        })
        .select()
        .single()

      if (entryError) {
        console.error('Error creating journal entry:', entryError)
        throw entryError
      }

      console.log('Created new entry:', newEntry.id)
      entryId = newEntry.id
    }

    // Process attachments (photos) if any
    if (attachments && attachments.length > 0) {
      console.log('Processing attachments:', attachments.length)
      
      for (const attachment of attachments) {
        if (attachment.type === 'image' && attachment.url) {
          try {
            // Download the image
            const imageResponse = await fetch(attachment.url)
            if (imageResponse.ok) {
              const imageBuffer = await imageResponse.arrayBuffer()
              const fileExt = 'jpg' // Default to jpg for images
              const fileName = `${userId}/${entryId}/${Date.now()}.${fileExt}`
              
              // Upload to Supabase storage
              const { error: uploadError } = await supabaseClient.storage
                .from('journal-photos')
                .upload(fileName, imageBuffer, {
                  contentType: 'image/jpeg'
                })

              if (uploadError) {
                console.error('Error uploading photo:', uploadError)
              } else {
                // Save photo record
                await supabaseClient
                  .from('journal_photos')
                  .insert({
                    entry_id: entryId,
                    file_path: fileName,
                    file_name: `sms_photo_${Date.now()}.${fileExt}`,
                    file_size: imageBuffer.byteLength,
                    mime_type: 'image/jpeg'
                  })
                
                console.log('Photo uploaded and saved:', fileName)
              }
            }
          } catch (photoError) {
            console.error('Error processing photo attachment:', photoError)
          }
        }
      }
    }

    // Update SMS message as processed
    await supabaseClient
      .from('sms_messages')
      .update({ processed: true, entry_id: entryId })
      .eq('id', smsMessage.id)

    console.log('SMS processing complete')

    // Send auto-reply confirmation
    await sendConfirmationMessage(conversationId)

    return new Response(
      JSON.stringify({ success: true, entryId, messageId }),
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

// Helper function to validate Surge webhook signature (disabled for debugging)
async function validateSurgeSignature(body: string, signature: string, secret: string): Promise<boolean> {
  try {
    // Parse the signature header: t=1737830031,v1=41f947e88a483327c878d6c08b27b22fbe7c9ea5608b035707c6667d1df866dd
    const parts = signature.split(',')
    let timestamp = ''
    const v1Hashes: string[] = []

    for (const part of parts) {
      const [key, value] = part.split('=')
      if (key === 't') {
        timestamp = value
      } else if (key === 'v1') {
        v1Hashes.push(value)
      }
    }

    if (!timestamp || v1Hashes.length === 0) {
      console.error('Invalid signature format')
      return false
    }

    // Check timestamp is within 5 minutes (300 seconds) to prevent replay attacks
    const now = Math.floor(Date.now() / 1000)
    const webhookTime = parseInt(timestamp)
    if (Math.abs(now - webhookTime) > 300) {
      console.error('Webhook timestamp too old or too far in future')
      return false
    }

    // Generate the payload: timestamp + '.' + raw body
    const payload = `${timestamp}.${body}`

    // Compute expected HMAC-SHA256 hash
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const signature_buffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
    const expectedHash = Array.from(new Uint8Array(signature_buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Compare with any of the v1 hashes using constant-time comparison
    for (const v1Hash of v1Hashes) {
      if (constantTimeEqual(expectedHash, v1Hash)) {
        return true
      }
    }

    console.error('Signature validation failed')
    return false
  } catch (error) {
    console.error('Error validating signature:', error)
    return false
  }
  return true // Temporarily return true for debugging
}

// Constant-time string comparison to prevent timing attacks
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  
  return result === 0
}

// Helper function to send instruction message after YES response
async function sendInstructionMessage(conversationId: string) {
  const surgeApiToken = Deno.env.get('SURGE_API_TOKEN')
  const surgeAccountId = Deno.env.get('SURGE_ACCOUNT_ID')

  if (!surgeApiToken || !surgeAccountId || !conversationId) {
    console.log('Missing Surge credentials or conversation ID for instruction message')
    return
  }

  try {
    const responsePayload = {
      conversation: { id: conversationId },
      body: 'Perfect! Your phone is now verified. To create a journal entry, simply send a message to this number. You can view all your entries on our website.'
    }

    const surgeUrl = `https://api.surge.sh/v1/accounts/${surgeAccountId}/messages`
    
    const surgeResponse = await fetch(surgeUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${surgeApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(responsePayload)
    })

    if (surgeResponse.ok) {
      console.log('Instruction message sent successfully')
    } else {
      const errorText = await surgeResponse.text()
      console.error('Failed to send instruction message:', surgeResponse.status, errorText)
    }
  } catch (error) {
    console.error('Error sending instruction message:', error)
  }
}

// Helper function to send confirmation message for journal entries
async function sendConfirmationMessage(conversationId: string) {
  const surgeApiToken = Deno.env.get('SURGE_API_TOKEN')
  const surgeAccountId = Deno.env.get('SURGE_ACCOUNT_ID')

  if (!surgeApiToken || !surgeAccountId || !conversationId) {
    console.log('Missing Surge credentials or conversation ID for confirmation message')
    return
  }

  try {
    const responsePayload = {
      conversation: { id: conversationId },
      body: '✅ Your journal entry has been saved!'
    }

    const surgeUrl = `https://api.surge.sh/v1/accounts/${surgeAccountId}/messages`
    
    const surgeResponse = await fetch(surgeUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${surgeApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(responsePayload)
    })

    if (surgeResponse.ok) {
      console.log('Confirmation message sent successfully')
    } else {
      const errorText = await surgeResponse.text()
      console.error('Failed to send confirmation message:', surgeResponse.status, errorText)
    }
  } catch (error) {
    console.error('Error sending confirmation message:', error)
  }
}
