
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SMSWebhookPayload {
  From: string;
  Body: string;
  MessageSid: string;
  AccountSid: string;
  NumMedia?: string;
  MediaUrl0?: string;
  MediaContentType0?: string;
}

const validateTwilioSignature = (signature: string, url: string, params: Record<string, string>) => {
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  if (!authToken) return false;

  // Create the signature string
  const data = Object.keys(params)
    .sort()
    .map(key => `${key}${params[key]}`)
    .join('');

  const computedSignature = createHmac('sha1', authToken)
    .update(url + data)
    .digest('base64');

  return signature === `sha1=${computedSignature}`;
};

const downloadAndStoreMedia = async (mediaUrl: string, entryId: string, userId: string, supabaseClient: any) => {
  try {
    // Download the media file
    const response = await fetch(mediaUrl);
    if (!response.ok) throw new Error('Failed to download media');

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Generate filename
    const fileExt = blob.type.split('/')[1] || 'jpg';
    const fileName = `${userId}/${entryId}/${Date.now()}.${fileExt}`;

    // Upload to Supabase storage
    const { error: uploadError } = await supabaseClient.storage
      .from('journal-photos')
      .upload(fileName, uint8Array, {
        contentType: blob.type,
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Save photo record to database
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
  console.log('=== SMS WEBHOOK CALLED ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse the webhook payload
    const formData = await req.formData()
    console.log('Form data entries:');
    for (const [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
    }

    const from = formData.get('From') as string
    const body = formData.get('Body') as string || ''
    const messageSid = formData.get('MessageSid') as string
    const numMedia = parseInt(formData.get('NumMedia') as string || '0')

    console.log('Parsed data:', { from, body, messageSid, numMedia })

    if (!from) {
      console.error('No From field in webhook data');
      return new Response('Bad Request: Missing From field', { status: 400, headers: corsHeaders })
    }

    // Validate Twilio signature for security
    const twilioSignature = req.headers.get('x-twilio-signature')
    if (twilioSignature) {
      console.log('Validating Twilio signature...');
      const url = req.url
      const params: Record<string, string> = {}
      for (const [key, value] of formData.entries()) {
        params[key] = value as string
      }
      
      if (!validateTwilioSignature(twilioSignature, url, params)) {
        console.error('Invalid Twilio signature')
        return new Response('Unauthorized', { status: 401, headers: corsHeaders })
      }
      console.log('Signature validated successfully');
    } else {
      console.log('No Twilio signature found - this is normal for testing');
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
      return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Phone number not registered. Please sign up at your journal app first.</Message>
</Response>`, {
        headers: { 
          ...corsHeaders,
          'Content-Type': 'text/xml'
        }
      })
    }

    if (!profile.phone_verified) {
      console.error('Phone not verified for user:', profile.id)
      return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Please verify your phone number in the app before sending journal entries.</Message>
</Response>`, {
        headers: { 
          ...corsHeaders,
          'Content-Type': 'text/xml'
        }
      })
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
    if (numMedia > 0) {
      console.log('Processing', numMedia, 'media attachments');
      const mediaPromises = []
      for (let i = 0; i < numMedia; i++) {
        const mediaUrl = formData.get(`MediaUrl${i}`) as string
        if (mediaUrl) {
          mediaPromises.push(downloadAndStoreMedia(mediaUrl, entryId, profile.id, supabaseClient))
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

    // Send appropriate TwiML response
    const responseMessage = numMedia > 0 && !body ? 
      'Your photo has been added to your journal! 📸' : 
      'Your journal entry has been recorded! 📝'

    console.log('Sending TwiML response:', responseMessage);

    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${responseMessage}</Message>
</Response>`

    return new Response(twimlResponse, {
      headers: { 
        ...corsHeaders,
        'Content-Type': 'text/xml'
      }
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Sorry, there was an error processing your message. Please try again later.</Message>
</Response>`, { 
      status: 500, 
      headers: { 
        ...corsHeaders,
        'Content-Type': 'text/xml'
      }
    })
  }
})
