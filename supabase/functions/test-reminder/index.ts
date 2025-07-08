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

    // Send SMS reminder with prompt
    await sendReminderSMS(profile.phone_number, prompt.prompt_text)

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
  const surgePhoneNumber = Deno.env.get('SURGE_PHONE_NUMBER')

  if (!surgeApiToken || !surgeAccountId || !surgePhoneNumber) {
    throw new Error('Missing Surge API credentials')
  }

  const message = `📝 TEST: Time for your daily journal entry! Here's a prompt to get you started:\n\n${prompt}\n\nSimply reply to this message to create your journal entry.`

  console.log(`Sending SMS to ${phoneNumber} with message: ${message.substring(0, 100)}...`)

  try {
    const response = await fetch(`https://api.surge.app/accounts/${surgeAccountId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${surgeApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversation: {
          contact: {
            phone_number: phoneNumber
          }
        },
        body: message
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Surge API error: ${response.status} ${errorText}`)
      throw new Error(`Surge API error: ${response.status} ${errorText}`)
    }

    const result = await response.text()
    console.log(`SMS sent successfully to ${phoneNumber}. Surge response: ${result}`)
  } catch (error) {
    console.error(`Failed to send SMS to ${phoneNumber}:`, error)
    throw error
  }
}