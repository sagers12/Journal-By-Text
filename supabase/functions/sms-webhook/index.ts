
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

    const body = await req.json()
    console.log('SMS webhook received:', JSON.stringify(body, null, 2))

    // Extract message data from various SMS provider formats
    let messageBody = body.body || body.message?.body || body.text || body.Body
    let fromPhoneNumber = body.conversation?.contact?.phone_number || body.from || body.From || body.phone_number
    let attachments = body.attachments || body.media || []

    console.log('Extracted data:', { messageBody, fromPhoneNumber, attachments })

    if (!messageBody || !fromPhoneNumber) {
      console.error('Missing required fields:', { messageBody, fromPhoneNumber })
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Normalize phone number format (remove +1, spaces, dashes, etc.)
    const normalizedPhone = fromPhoneNumber.replace(/[\s\-\+\(\)]/g, '')
    console.log('Normalized phone number:', normalizedPhone)

    // Find user by phone number (check multiple formats)
    const { data: profiles, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, phone_number')
      .or(`phone_number.eq.${fromPhoneNumber},phone_number.eq.${normalizedPhone},phone_number.eq.+1${normalizedPhone}`)

    console.log('Profile lookup result:', { profiles, profileError })

    if (profileError || !profiles || profiles.length === 0) {
      console.error('User not found for phone number:', fromPhoneNumber)
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const profile = profiles[0]
    const userId = profile.id
    const entryDate = new Date().toISOString().split('T')[0]
    const timestamp = new Date().toLocaleTimeString()

    console.log('Processing message for user:', userId)

    // Store SMS message record
    const { data: smsMessage, error: smsError } = await supabaseClient
      .from('sms_messages')
      .insert({
        user_id: userId,
        phone_number: fromPhoneNumber,
        message_content: messageBody,
        entry_date: entryDate,
        processed: false
      })
      .select()
      .single()

    if (smsError) {
      console.error('Error storing SMS message:', smsError)
      throw new Error('Failed to store SMS message')
    }

    console.log('SMS message stored:', smsMessage)

    // Check for existing journal entry for today
    const { data: existingEntry, error: existingError } = await supabaseClient
      .from('journal_entries')
      .select('id, content')
      .eq('user_id', userId)
      .eq('entry_date', entryDate)
      .eq('source', 'sms')
      .single()

    console.log('Existing entry check:', { existingEntry, existingError })

    let entryId: string

    if (existingEntry) {
      // Append to existing entry
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
      
      console.log('Updated existing entry:', updatedEntry)
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

      console.log('Created new entry:', newEntry)
      entryId = newEntry.id
    }

    // Process attachments (photos)
    if (attachments && attachments.length > 0) {
      console.log('Processing attachments:', attachments.length)
      
      for (const attachment of attachments) {
        if (attachment.type === 'image' && attachment.url) {
          try {
            // Download the image
            const imageResponse = await fetch(attachment.url)
            if (imageResponse.ok) {
              const imageBuffer = await imageResponse.arrayBuffer()
              const fileName = `${userId}/${entryId}/${Date.now()}.jpg`
              
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
                    file_name: `sms_photo_${Date.now()}.jpg`,
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

    console.log('SMS processing complete, sending confirmation')

    // Send confirmation response
    const surgeApiToken = Deno.env.get('SURGE_API_TOKEN')
    const surgeAccountId = Deno.env.get('SURGE_ACCOUNT_ID')

    if (surgeApiToken && surgeAccountId) {
      try {
        const responsePayload = {
          conversation: {
            contact: {
              phone_number: fromPhoneNumber
            }
          },
          body: '✅ Your journal entry has been saved!',
          attachments: []
        }

        const surgeUrl = `https://api.surge.app/accounts/${surgeAccountId}/messages`
        
        const surgeResponse = await fetch(surgeUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${surgeApiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(responsePayload)
        })

        console.log('Confirmation sent, status:', surgeResponse.status)
      } catch (responseError) {
        console.error('Error sending confirmation response:', responseError)
      }
    }

    return new Response(
      JSON.stringify({ success: true, entryId }),
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
