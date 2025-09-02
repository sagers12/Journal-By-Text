
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { createSurgePayload, maskPhone } from '../_shared/sms-utils.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Function to format phone number to international format
function formatPhoneNumber(phoneNumber: string): string {
  // Remove any non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  
  // If it's a 10-digit US number, add +1
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }
  
  // If it's 11 digits starting with 1, add +
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  }
  
  // If it already starts with +, return as is
  if (phoneNumber.startsWith('+')) {
    return phoneNumber;
  }
  
  // Default: assume US number and add +1
  return `+1${digitsOnly}`;
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

    // Format phone number to international format
    const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
    console.log('Original phone number:', maskPhone(phoneNumber));
    console.log('Formatted phone number:', maskPhone(formattedPhoneNumber));

    // Send SMS via Surge with corrected API structure
    const surgeApiToken = Deno.env.get('SURGE_API_TOKEN')
    const surgeAccountId = Deno.env.get('SURGE_ACCOUNT_ID')

    if (!surgeApiToken || !surgeAccountId) {
      throw new Error('Surge credentials not configured')
    }

    // Updated API endpoint to match Surge documentation
    const surgeUrl = `https://api.surge.app/accounts/${surgeAccountId}/messages`
    
    console.log('[send-signup-confirmation] Using production environment')

    // Create Surge payload
    const payload = createSurgePayload(
      formattedPhoneNumber,
      'Thanks for signing up for Journal By Text! Please respond YES so we can message your prompts and reminders in the future.'
    )

    console.log('Sending to Surge API:', JSON.stringify(payload, null, 2));

    const surgeResponse = await fetch(surgeUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${surgeApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })

    const responseText = await surgeResponse.text();
    console.log('Surge API response status:', surgeResponse.status);
    console.log('Surge API response body:', responseText);

    if (!surgeResponse.ok) {
      console.error('Surge error:', responseText)
      throw new Error(`Failed to send SMS: ${responseText}`)
    }

    const result = JSON.parse(responseText);
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
