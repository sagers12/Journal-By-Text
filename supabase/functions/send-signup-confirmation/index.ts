
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

    const { phoneNumber } = await req.json()
    
    if (!phoneNumber) {
      throw new Error('Phone number is required')
    }

    // Send SMS via Surge with corrected API structure
    const surgeApiToken = Deno.env.get('SURGE_API_TOKEN')
    const surgeAccountId = Deno.env.get('SURGE_ACCOUNT_ID')

    if (!surgeApiToken || !surgeAccountId) {
      throw new Error('Surge credentials not configured')
    }

    // Updated API endpoint to match Surge documentation
    const surgeUrl = `https://api.surge.app/accounts/${surgeAccountId}/messages`
    
    // Updated payload structure based on cURL example
    const payload = {
      conversation: {
        contact: {
          phone_number: phoneNumber
        }
      },
      body: 'Thanks for signing up for Text2Journal! Please respond YES so we can message your prompts and reminders in the future.',
      attachments: []
    }

    const surgeResponse = await fetch(surgeUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${surgeApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })

    if (!surgeResponse.ok) {
      const error = await surgeResponse.text()
      console.error('Surge error:', error)
      throw new Error(`Failed to send SMS: ${error}`)
    }

    const result = await surgeResponse.json()
    console.log('SMS sent successfully via Surge:', result)

    return new Response(
      JSON.stringify({ success: true, message: 'Signup confirmation sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Send signup confirmation error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
