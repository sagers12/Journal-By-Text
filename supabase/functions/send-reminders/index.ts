
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
    console.log(`Current UTC time: ${now.toISOString()}`)

    // Find users who should receive reminders at this time
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
        const userTimezone = profile.reminder_timezone || 'America/New_York'
        const reminderTime = profile.reminder_time || '20:00'
        
        // Parse the reminder time (stored as HH:MM format)
        const [reminderHour, reminderMinute] = reminderTime.split(':').map(Number)
        
        // Get current time in user's timezone
        const userCurrentTime = new Intl.DateTimeFormat('en-US', {
          timeZone: userTimezone,
          hour12: false,
          hour: '2-digit',
          minute: '2-digit'
        }).format(now)
        
        const [currentHour, currentMinute] = userCurrentTime.split(':').map(Number)
        
        console.log(`User ${profile.id}: Current time in ${userTimezone}: ${userCurrentTime}, Reminder time: ${reminderTime}`)

        // Check if current time matches reminder time (within 15-minute window)
        const currentMinutes = currentHour * 60 + currentMinute
        const reminderMinutes = reminderHour * 60 + reminderMinute
        const timeDiff = Math.abs(currentMinutes - reminderMinutes)
        
        // Allow for 15-minute window to account for cron timing
        if (timeDiff > 15) {
          console.log(`User ${profile.id}: Not time for reminder (diff: ${timeDiff} minutes)`)
          continue
        }

        console.log(`User ${profile.id}: Time matches, checking if already journaled...`)

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
          category: prompt.category,
          userTimezone: userTimezone,
          userCurrentTime: userCurrentTime,
          reminderTime: reminderTime
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
      remindersSent,
      currentUTC: now.toISOString()
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
      throw new Error(`Surge API error: ${response.status} ${errorText}`)
    }

    console.log(`SMS sent successfully to ${phoneNumber}`)
  } catch (error) {
    console.error(`Failed to send SMS to ${phoneNumber}:`, error)
    throw error
  }
}
