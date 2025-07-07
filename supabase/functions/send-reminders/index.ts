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

    console.log('Starting reminder check process...')

    // Get current UTC time
    const now = new Date()
    const currentHour = now.getUTCHours()
    const currentMinute = now.getUTCMinutes()
    
    console.log(`Current UTC time: ${currentHour}:${currentMinute.toString().padStart(2, '0')}`)

    // Find users who should receive reminders at this time
    // We'll check for times within a 15-minute window to account for cron timing
    const { data: profiles, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, phone_number, reminder_enabled, reminder_time, reminder_timezone')
      .eq('reminder_enabled', true)
      .not('phone_number', 'is', null)
      .eq('phone_verified', true)

    if (profileError) {
      console.error('Error fetching profiles:', profileError)
      return new Response(JSON.stringify({ error: 'Failed to fetch profiles' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Found ${profiles?.length || 0} profiles with reminders enabled`)

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: 'No users with reminders enabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const remindersSent = []

    for (const profile of profiles) {
      try {
        // Convert user's local time to UTC to see if it matches current time
        const userTime = new Date().toLocaleString("en-US", {
          timeZone: profile.reminder_timezone || 'America/New_York'
        })
        const userDate = new Date(userTime)
        const userHour = userDate.getHours()
        const userMinute = userDate.getMinutes()

        // Parse the user's reminder time (stored as HH:MM format)
        const [reminderHour, reminderMinute] = profile.reminder_time.split(':').map(Number)

        // Check if current local time matches reminder time (within 15-minute window)
        const timeDiff = Math.abs((userHour * 60 + userMinute) - (reminderHour * 60 + reminderMinute))
        
        if (timeDiff > 15) {
          continue // Skip this user, not their reminder time
        }

        console.log(`Checking reminder for user ${profile.id} at ${userHour}:${userMinute.toString().padStart(2, '0')} (target: ${reminderHour}:${reminderMinute.toString().padStart(2, '0')})`)

        // Check if user has journaled in the last 23 hours
        const twentyThreeHoursAgo = new Date(Date.now() - (23 * 60 * 60 * 1000))
        
        const { data: recentEntries, error: entriesError } = await supabaseClient
          .from('journal_entries')
          .select('id')
          .eq('user_id', profile.id)
          .gte('created_at', twentyThreeHoursAgo.toISOString())
          .limit(1)

        if (entriesError) {
          console.error(`Error checking entries for user ${profile.id}:`, entriesError)
          continue
        }

        if (recentEntries && recentEntries.length > 0) {
          console.log(`User ${profile.id} has already journaled recently, skipping reminder`)
          continue
        }

        // Get a prompt for this user
        const { data: promptResult, error: promptError } = await supabaseClient
          .rpc('get_next_prompt_for_user', { user_uuid: profile.id })

        if (promptError || !promptResult || promptResult.length === 0) {
          console.error(`Error getting prompt for user ${profile.id}:`, promptError)
          continue
        }

        const prompt = promptResult[0]
        console.log(`Selected prompt for user ${profile.id}: ${prompt.category} - ${prompt.prompt_text}`)

        // Send SMS reminder with prompt
        await sendReminderSMS(profile.phone_number, prompt.prompt_text)

        // Record that we sent this prompt to the user
        const { error: historyError } = await supabaseClient
          .from('user_prompt_history')
          .insert({
            user_id: profile.id,
            prompt_id: prompt.prompt_id
          })

        if (historyError) {
          console.error(`Error recording prompt history for user ${profile.id}:`, historyError)
        }

        // Update the last category sent to this user
        const { error: categoryError } = await supabaseClient
          .from('user_last_prompt_category')
          .upsert({
            user_id: profile.id,
            last_category: prompt.category,
            updated_at: new Date().toISOString()
          })

        if (categoryError) {
          console.error(`Error updating last category for user ${profile.id}:`, categoryError)
        }

        remindersSent.push({
          userId: profile.id,
          phone: profile.phone_number,
          prompt: prompt.prompt_text,
          category: prompt.category
        })

        console.log(`Reminder sent successfully to user ${profile.id}`)

      } catch (error) {
        console.error(`Error processing user ${profile.id}:`, error)
        continue
      }
    }

    console.log(`Reminder process completed. Sent ${remindersSent.length} reminders.`)

    return new Response(JSON.stringify({ 
      message: `Sent ${remindersSent.length} reminders`,
      remindersSent 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Reminder function error:', error)
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

  const message = `📝 Time for your daily journal entry! Here's a prompt to get you started:\n\n${prompt}\n\nSimply reply to this message to create your journal entry.`

  try {
    const response = await fetch(`https://api.surge.sh/v1/accounts/${surgeAccountId}/messages`, {
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
      throw new Error(`Surge API error: ${response.status} ${errorText}`)
    }

    console.log(`SMS sent successfully to ${phoneNumber}`)
  } catch (error) {
    console.error(`Failed to send SMS to ${phoneNumber}:`, error)
    throw error
  }
}