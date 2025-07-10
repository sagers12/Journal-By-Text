import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

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

    console.log('Starting TEST reminder - ignoring time constraints...')

    // Get your specific profile for testing
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, phone_number, reminder_enabled, reminder_time, reminder_timezone')
      .eq('id', 'e782ba7a-141d-4ef5-81ec-067555292e33')
      .single()

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError)
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Testing reminder for user ${profile.id}`)

    // Get a prompt for this user
    const { data: promptResult, error: promptError } = await supabaseClient
      .rpc('get_next_prompt_for_user', { user_uuid: profile.id })

    if (promptError || !promptResult || promptResult.length === 0) {
      console.error(`Error getting prompt for user ${profile.id}:`, promptError)
      return new Response(JSON.stringify({ error: 'No prompts available' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const prompt = promptResult[0]
    console.log(`Selected prompt: ${prompt.category} - ${prompt.prompt_text}`)

    // Format phone number to international format
    const formattedPhoneNumber = formatPhoneNumber(profile.phone_number);
    console.log('Original phone number:', profile.phone_number);
    console.log('Formatted phone number:', formattedPhoneNumber);

    // Send SMS reminder with prompt
    await sendReminderSMS(formattedPhoneNumber, prompt.prompt_text)

    console.log(`TEST reminder sent successfully to ${profile.phone_number}`)

    return new Response(JSON.stringify({ 
      message: 'Test reminder sent successfully',
      phone: profile.phone_number,
      prompt: prompt.prompt_text,
      category: prompt.category
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Test reminder error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function sendReminderSMS(phoneNumber: string, prompt: string) {
  const surgeApiToken = Deno.env.get('SURGE_API_TOKEN')
  const surgeAccountId = Deno.env.get('SURGE_ACCOUNT_ID')

  if (!surgeApiToken || !surgeAccountId) {
    throw new Error('Surge credentials not configured')
  }

  const message = `TEST: Here's a friendly reminder to journal today! Not sure what to write about? Here's a prompt: ${prompt}`

  // Updated payload structure to match working signup function
  const payload = {
    conversation: {
      contact: {
        phone_number: phoneNumber
      }
    },
    body: message,
    attachments: []
  }

  console.log('Sending to Surge API:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(`https://api.surge.app/accounts/${surgeAccountId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${surgeApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })

    const responseText = await response.text();
    console.log('Surge API response status:', response.status);
    console.log('Surge API response body:', responseText);

    if (!response.ok) {
      console.error('Surge error:', responseText)
      throw new Error(`Failed to send SMS: ${responseText}`)
    }

    const result = JSON.parse(responseText);
    console.log('SMS sent successfully via Surge:', result)
  } catch (error) {
    console.error(`Failed to send SMS to ${phoneNumber}:`, error)
    throw error
  }
}