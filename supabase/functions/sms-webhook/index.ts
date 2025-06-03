
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SMSWebhookPayload {
  From: string;
  Body: string;
  MessageSid: string;
  AccountSid: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse the webhook payload
    const formData = await req.formData()
    const from = formData.get('From') as string
    const body = formData.get('Body') as string
    const messageSid = formData.get('MessageSid') as string

    console.log('SMS received:', { from, body, messageSid })

    // Clean phone number (remove +1, spaces, dashes)
    const cleanPhone = from.replace(/[\+\-\s]/g, '')

    // Find user by phone number
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, phone_verified, timezone')
      .eq('phone_number', cleanPhone)
      .single()

    if (profileError || !profile) {
      console.error('User not found for phone:', cleanPhone)
      return new Response('User not found', { status: 404, headers: corsHeaders })
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

    // Check if there's already an entry for today
    const { data: existingEntry } = await supabaseClient
      .from('journal_entries')
      .select('id, content')
      .eq('user_id', profile.id)
      .eq('entry_date', entryDate)
      .eq('source', 'sms')
      .single()

    let entryId: string

    if (existingEntry) {
      // Append to existing entry
      const updatedContent = `${existingEntry.content}\n\n[${now.toLocaleTimeString('en-US', { 
        timeZone: userTimezone,
        hour12: true 
      })}] ${body}`

      const { error: updateError } = await supabaseClient
        .from('journal_entries')
        .update({ content: updatedContent })
        .eq('id', existingEntry.id)

      if (updateError) {
        console.error('Error updating entry:', updateError)
        return new Response('Error updating entry', { status: 500, headers: corsHeaders })
      }

      entryId = existingEntry.id
    } else {
      // Create new entry
      const title = `Journal Entry - ${new Intl.DateTimeFormat('en-US', {
        timeZone: userTimezone,
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }).format(now)}`

      const content = `[${now.toLocaleTimeString('en-US', { 
        timeZone: userTimezone,
        hour12: true 
      })}] ${body}`

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

      entryId = newEntry.id
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

    // Send TwiML response
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Your journal entry has been recorded! 📝</Message>
</Response>`

    return new Response(twimlResponse, {
      headers: { 
        ...corsHeaders,
        'Content-Type': 'text/xml'
      }
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    })
  }
})
