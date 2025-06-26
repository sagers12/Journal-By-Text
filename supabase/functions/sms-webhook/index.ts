
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const validateSurgeSignature = (signature: string, payload: string, timestamp: string) => {
  const webhookSecret = Deno.env.get('SURGE_WEBHOOK_SECRET');
  if (!webhookSecret) return false;

  const expectedSignature = createHmac('sha256', webhookSecret)
    .update(timestamp + payload)
    .digest('hex');

  // Extract hash from signature (format: "t=timestamp,v1=hash")
  const hashMatch = signature.match(/v1=([a-f0-9]+)/);
  if (!hashMatch) return false;

  return hashMatch[1] === expectedSignature;
};

const downloadAndStoreMedia = async (mediaUrl: string, entryId: string, userId: string, supabaseClient: any) => {
  try {
    const response = await fetch(mediaUrl);
    if (!response.ok) throw new Error('Failed to download media');

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const fileExt = blob.type.split('/')[1] || 'jpg';
    const fileName = `${userId}/${entryId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabaseClient.storage
      .from('journal-photos')
      .upload(fileName, uint8Array, {
        contentType: blob.type,
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { error: photoError } = await supabaseClient
      .from('journal_photos')
      .insert({
        entry_id: entryId,
        file_path: fileName,
        file_name: `SMS_Photo_${Date.now()}.${fileExt}`,
        file_size: uint8Array.length,
        mime_type: blob.type
      });

    if (photoError) throw photoError;

    return fileName;
  } catch (error) {
    console.error('Error processing media:', error);
    throw error;
  }
};

serve(async (req) => {
  console.log('=== SURGE SMS WEBHOOK CALLED ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', Object.fromEntries(req.headers.entries()));

  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const rawBody = await req.text()
    const webhookData = JSON.parse(rawBody)
    
    console.log('Webhook data:', webhookData);

    // Validate Surge signature for security
    const surgeSignature = req.headers.get('surge-signature')
    if (surgeSignature) {
      console.log('Validating Surge signature...');
      const timestampMatch = surgeSignature.match(/t=(\d+)/);
      if (!timestampMatch) {
        console.error('Invalid signature format')
        return new Response('Unauthorized', { status: 401, headers: corsHeaders })
      }
      
      if (!validateSurgeSignature(surgeSignature, rawBody, timestampMatch[1])) {
        console.error('Invalid Surge signature')
        return new Response('Unauthorized', { status: 401, headers: corsHeaders })
      }
      console.log('Signature validated successfully');
    } else {
      console.log('No Surge signature found - this is normal for testing');
    }

    // Handle only message.received events
    if (webhookData.event !== 'message.received') {
      console.log('Ignoring non-message.received event:', webhookData.event);
      return new Response('OK', { status: 200, headers: corsHeaders })
    }

    const message = webhookData.data
    const from = message.conversation?.phone_number
    const body = message.body || ''
    const attachments = message.attachments || []

    console.log('Parsed data:', { from, body, attachments: attachments.length })

    if (!from) {
      console.error('No phone number in webhook data');
      return new Response('Bad Request: Missing phone number', { status: 400, headers: corsHeaders })
    }

    // Clean phone number (remove +1, spaces, dashes)
    const cleanPhone = from.replace(/[\+\-\s]/g, '')
    console.log('Clean phone number:', cleanPhone);

    // Find user by phone number
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, phone_verified, timezone')
      .eq('phone_number', cleanPhone)
      .single()

    console.log('Profile lookup result:', { profile, profileError });

    if (profileError || !profile) {
      console.error('User not found for phone:', cleanPhone)
      return new Response(
        JSON.stringify({ error: 'Phone number not registered. Please sign up at your journal app first.' }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Handle "YES" confirmation for new users
    if (body.trim().toUpperCase() === 'YES' && !profile.phone_verified) {
      // Mark phone as verified
      const { error: verifyError } = await supabaseClient
        .from('profiles')
        .update({ phone_verified: true })
        .eq('id', profile.id)

      if (verifyError) {
        console.error('Error verifying phone:', verifyError)
      } else {
        console.log('Phone verified for user:', profile.id)
      }

      return new Response(
        JSON.stringify({ message: 'Great! Your phone is now verified. You can start sending journal entries by texting us your thoughts, experiences, or photos. Multiple messages on the same day will be grouped together. Happy journaling! 📝' }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!profile.phone_verified) {
      console.error('Phone not verified for user:', profile.id)
      return new Response(
        JSON.stringify({ message: 'Please reply YES to verify your phone number before sending journal entries.' }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get user's timezone or default to UTC
    const userTimezone = profile.timezone || 'UTC'
    const now = new Date()
    
    // Calculate entry date in user's timezone
    const entryDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now)

    console.log('Processing for user:', profile.id, 'Entry date:', entryDate);

    // Store the SMS message
    const { error: smsError } = await supabaseClient
      .from('sms_messages')
      .insert({
        user_id: profile.id,
        phone_number: cleanPhone,
        message_content: body,
        entry_date: entryDate,
        processed: false
      })

    if (smsError) {
      console.error('Error storing SMS:', smsError)
      return new Response('Error storing SMS', { status: 500, headers: corsHeaders })
    }

    console.log('SMS message stored successfully');

    // Check if there's already an entry for today
    const { data: existingEntry } = await supabaseClient
      .from('journal_entries')
      .select('id, content')
      .eq('user_id', profile.id)
      .eq('entry_date', entryDate)
      .eq('source', 'sms')
      .single()

    console.log('Existing entry check:', existingEntry);

    let entryId: string
    const timestamp = now.toLocaleTimeString('en-US', { 
      timeZone: userTimezone,
      hour12: true 
    })

    if (existingEntry) {
      // Append to existing entry
      const newContent = body ? `[${timestamp}] ${body}` : `[${timestamp}] Photo attachment`
      const updatedContent = `${existingEntry.content}\n\n${newContent}`

      const { error: updateError } = await supabaseClient
        .from('journal_entries')
        .update({ content: updatedContent })
        .eq('id', existingEntry.id)

      if (updateError) {
        console.error('Error updating entry:', updateError)
        return new Response('Error updating entry', { status: 500, headers: corsHeaders })
      }

      console.log('Updated existing entry:', existingEntry.id);
      entryId = existingEntry.id
    } else {
      // Create new entry
      const title = `Journal Entry - ${new Intl.DateTimeFormat('en-US', {
        timeZone: userTimezone,
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }).format(now)}`

      const content = body ? `[${timestamp}] ${body}` : `[${timestamp}] Photo attachment`

      const { data: newEntry, error: createError } = await supabaseClient
        .from('journal_entries')
        .insert({
          user_id: profile.id,
          content,
          title,
          source: 'sms',
          entry_date: entryDate,
          tags: []
        })
        .select('id')
        .single()

      if (createError) {
        console.error('Error creating entry:', createError)
        return new Response('Error creating entry', { status: 500, headers: corsHeaders })
      }

      console.log('Created new entry:', newEntry.id);
      entryId = newEntry.id
    }

    // Process media attachments if any
    if (attachments.length > 0) {
      console.log('Processing', attachments.length, 'media attachments');
      const mediaPromises = []
      for (const attachment of attachments) {
        if (attachment.url) {
          mediaPromises.push(downloadAndStoreMedia(attachment.url, entryId, profile.id, supabaseClient))
        }
      }

      try {
        await Promise.all(mediaPromises)
        console.log('Media attachments processed successfully');
      } catch (mediaError) {
        console.error('Error processing media attachments:', mediaError)
        // Continue processing even if media fails
      }
    }

    // Mark SMS as processed
    const { error: markProcessedError } = await supabaseClient
      .from('sms_messages')
      .update({ 
        processed: true,
        entry_id: entryId 
      })
      .eq('user_id', profile.id)
      .eq('phone_number', cleanPhone)
      .eq('message_content', body)
      .eq('entry_date', entryDate)

    if (markProcessedError) {
      console.error('Error marking SMS as processed:', markProcessedError)
    }

    // Send appropriate response
    const responseMessage = attachments.length > 0 && !body ? 
      'Your photo has been added to your journal! 📸' : 
      'Your journal entry has been recorded! 📝'

    console.log('Sending response:', responseMessage);

    return new Response(
      JSON.stringify({ message: responseMessage }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: 'Sorry, there was an error processing your message. Please try again later.' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
