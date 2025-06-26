
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

    // Extract message data from Surge webhook
    const messageBody = body.body || body.message?.body
    const fromPhoneNumber = body.conversation?.contact?.phone_number
    const attachments = body.attachments || []

    if (!messageBody || !fromPhoneNumber) {
      console.error('Missing required fields:', { messageBody, fromPhoneNumber })
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Find user by phone number
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('phone_number', fromPhoneNumber)
      .single()

    if (profileError || !profile) {
      console.error('User not found for phone number:', fromPhoneNumber)
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const userId = profile.id
    const entryDate = new Date().toISOString().split('T')[0]

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

    // Check for existing journal entry for today
    const { data: existingEntry } = await supabaseClient
      .from('journal_entries')
      .select('id, content')
      .eq('user_id', userId)
      .eq('entry_date', entryDate)
      .eq('source', 'sms')
      .single()

    let entryId: string

    if (existingEntry) {
      // Append to existing entry
      const updatedContent = `${existingEntry.content}\n\n[${new Date().toLocaleTimeString()}] ${messageBody}`
      
      const { data: updatedEntry, error: updateError } = await supabaseClient
        .from('journal_entries')
        .update({ content: updatedContent })
        .eq('id', existingEntry.id)
        .select()
        .single()

      if (updateError) throw updateError
      entryId = existingEntry.id
    } else {
      // Create new journal entry
      const title = `Journal Entry - ${new Date(entryDate).toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      })}`
      
      const content = `[${new Date().toLocaleTimeString()}] ${messageBody}`

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

      if (entryError) throw entryError
      entryId = newEntry.id
    }

    // Process attachments (photos)
    if (attachments && attachments.length > 0) {
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

    // Send confirmation response using correct Surge API structure
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
        
        await fetch(surgeUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${surgeApiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(responsePayload)
        })
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
