
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
    const signature = req.headers.get('x-surge-signature')
    const webhookSecret = Deno.env.get('SURGE_WEBHOOK_SECRET')

    console.log('SMS webhook received:', {
      hasSignature: !!signature,
      hasSecret: !!webhookSecret,
      bodyLength: body.length,
      headers: Object.fromEntries(req.headers.entries())
    })

    // Validate signature if secret is configured
    if (webhookSecret && signature) {
      const expectedSignature = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(webhookSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      ).then(key =>
        crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
      ).then(signature =>
        Array.from(new Uint8Array(signature))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
      )

      if (`sha256=${expectedSignature}` !== signature) {
        console.error('Invalid webhook signature')
        return new Response('Unauthorized', { status: 401, headers: corsHeaders })
      }
    }

    const data = JSON.parse(body)
    console.log('Parsed webhook data:', JSON.stringify(data, null, 2))

    // Filter for message.received events only
    if (data.event !== 'message.received') {
      console.log('Ignoring non-message event:', data.event)
      return new Response('OK', { status: 200, headers: corsHeaders })
    }

    // Extract message data from Surge webhook format
    const messageId = data.data?.id || data.id
    const messageBody = data.data?.body || data.body
    const fromPhone = data.data?.from?.phone_number || data.from?.phone_number
    const attachments = data.data?.attachments || data.attachments || []

    console.log('Extracted message data:', {
      messageId,
      messageBody,
      fromPhone,
      attachmentsCount: attachments.length
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

    // Normalize phone number for matching
    const normalizedPhone = fromPhone.replace(/[\s\-\+\(\)]/g, '')
    console.log('Looking for user with phone:', { original: fromPhone, normalized: normalizedPhone })

    // Find user by phone number with multiple format attempts
    const { data: profiles, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, phone_number')
      .or(`phone_number.eq.${fromPhone},phone_number.eq.${normalizedPhone},phone_number.eq.+1${normalizedPhone},phone_number.eq.1${normalizedPhone}`)

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
          error_message: 'User not found'
        })

      return new Response('User not found - message logged', {
        status: 404,
        headers: corsHeaders
      })
    }

    const profile = profiles[0]
    const userId = profile.id
    const entryDate = new Date().toISOString().split('T')[0]
    const timestamp = new Date().toLocaleTimeString()

    console.log('Processing message for user:', { userId, entryDate })

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
        if (attachment.content_type?.startsWith('image/') && attachment.url) {
          try {
            // Download the image
            const imageResponse = await fetch(attachment.url)
            if (imageResponse.ok) {
              const imageBuffer = await imageResponse.arrayBuffer()
              const fileExt = attachment.content_type === 'image/jpeg' ? 'jpg' : 
                             attachment.content_type === 'image/png' ? 'png' : 'jpg'
              const fileName = `${userId}/${entryId}/${Date.now()}.${fileExt}`
              
              // Upload to Supabase storage
              const { error: uploadError } = await supabaseClient.storage
                .from('journal-photos')
                .upload(fileName, imageBuffer, {
                  contentType: attachment.content_type
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
                    file_name: attachment.filename || `sms_photo_${Date.now()}.${fileExt}`,
                    file_size: imageBuffer.byteLength,
                    mime_type: attachment.content_type
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

    // Send auto-reply confirmation if configured
    const surgeApiToken = Deno.env.get('SURGE_API_TOKEN')
    const surgeAccountId = Deno.env.get('SURGE_ACCOUNT_ID')

    if (surgeApiToken && surgeAccountId) {
      try {
        const conversationId = data.data?.conversation?.id || data.conversation?.id
        
        if (conversationId) {
          const responsePayload = {
            conversation: { id: conversationId },
            body: '✅ Your journal entry has been saved!'
          }

          const surgeUrl = `https://api.surge.app/v1/accounts/${surgeAccountId}/messages`
          
          const surgeResponse = await fetch(surgeUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${surgeApiToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(responsePayload)
          })

          console.log('Auto-reply sent, status:', surgeResponse.status)
        }
      } catch (responseError) {
        console.error('Error sending auto-reply:', responseError)
      }
    }

    return new Response(
      JSON.stringify({ success: true, entryId, messageId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('SMS webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
