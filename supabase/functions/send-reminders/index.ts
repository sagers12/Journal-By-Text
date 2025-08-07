
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
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

// Mask phone for logs
function maskPhone(phone: string): string {
  return phone ? phone.replace(/.(?=.{4})/g, '*') : '';
}

serve(async (req) => {
  // Log every request to ensure function is being called
  console.log('=== SEND REMINDERS FUNCTION CALLED ===')
  console.log('Request method:', req.method)
  console.log('Request URL:', req.url)
  console.log('Timestamp:', new Date().toISOString())
  
  // Parse the request body to check for force_send
  let requestBody = {}
  try {
    const bodyText = await req.text()
    if (bodyText) {
      requestBody = JSON.parse(bodyText)
      console.log('Request body:', requestBody)
    }
  } catch (e) {
    console.log('No valid JSON body, using empty object')
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Optional X-CRON-SECRET validation (for future JWT-free cron calls)
  const providedSecret = req.headers.get('x-cron-secret')
  const cronSecret = Deno.env.get('X_CRON_SECRET')
  if (providedSecret) {
    if (!cronSecret || providedSecret !== cronSecret) {
      return new Response(JSON.stringify({ error: 'Invalid cron secret' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
  }

  try {
    console.log('Creating Supabase client...')
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting reminder check process...')
    console.log('Current UTC time:', new Date().toISOString())

    // Get current UTC time
    const now = new Date()
    console.log(`Current UTC time: ${now.toISOString()}`)

    // Find users who should receive reminders at this time
    // Only users with active trials or active subscriptions
    const { data: profiles, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, phone_number, reminder_enabled, reminder_time, reminder_timezone, last_reminder_sent')
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
        // Check if user has access (active trial or subscription) 
        const { data: subscriber, error: subscriberError } = await supabaseClient
          .from('subscribers')
          .select('subscribed, is_trial, trial_end')
          .eq('user_id', profile.id)
          .single()

        if (subscriberError || !subscriber) {
          console.log(`User ${profile.id}: No subscription record found - skipping reminder`)
          continue
        }

        const hasActiveSubscription = subscriber.subscribed === true
        const hasActiveTrial = subscriber.is_trial === true && 
          subscriber.trial_end && 
          new Date(subscriber.trial_end) > new Date()
        
        if (!hasActiveSubscription && !hasActiveTrial) {
          console.log(`User ${profile.id}: No active subscription or trial - skipping reminder`)
          continue
        }
        
        console.log(`User ${profile.id}: Has access (subscription: ${hasActiveSubscription}, active trial: ${hasActiveTrial})`)
        
        const userTimezone = profile.reminder_timezone || 'America/New_York'
        const reminderTime = profile.reminder_time || '20:00'
        
        // Parse the reminder time (stored as HH:MM:SS format, we only need HH:MM)
        const timeParts = reminderTime.split(':')
        const reminderHour = parseInt(timeParts[0])
        const reminderMinute = parseInt(timeParts[1])
        
        console.log(`User ${profile.id}: Parsed reminder time - Hour: ${reminderHour}, Minute: ${reminderMinute} from ${reminderTime}`)
        
        // Get current time in user's timezone
        const userCurrentTime = new Intl.DateTimeFormat('en-US', {
          timeZone: userTimezone,
          hour12: false,
          hour: '2-digit',
          minute: '2-digit'
        }).format(now)
        
        const [currentHour, currentMinute] = userCurrentTime.split(':').map(Number)
        
        console.log(`User ${profile.id}: Current time in ${userTimezone}: ${userCurrentTime}, Reminder time: ${reminderTime}`)

        // Check if current time matches reminder time (within 15-minute window) OR if force_send is true
        const currentMinutes = currentHour * 60 + currentMinute
        const reminderMinutes = reminderHour * 60 + reminderMinute
        const timeDiff = currentMinutes - reminderMinutes // Positive means current time is after reminder time
        
        console.log(`User ${profile.id}: Time comparison - Current: ${currentMinutes} min, Reminder: ${reminderMinutes} min, Diff: ${timeDiff} min`)
        
        const forceSend = requestBody.force_send === true
        console.log(`Force send mode: ${forceSend}`)
        
        // Check if reminder was already sent today
        const currentDate = new Intl.DateTimeFormat('en-CA', {
          timeZone: userTimezone
        }).format(now) // Format as YYYY-MM-DD in user's timezone
        
        console.log(`User ${profile.id}: Current date in ${userTimezone}: ${currentDate}, Last reminder sent: ${profile.last_reminder_sent}`)
        
        if (!forceSend && profile.last_reminder_sent === currentDate) {
          console.log(`User ${profile.id}: Reminder already sent today (${currentDate}) - skipping`)
          continue
        }
        
        // Only send if:
        // 1. It's the exact time or after the reminder time, AND
        // 2. We're within 15 minutes of the reminder time (to account for cron intervals)
        // Since cron runs every 15 minutes (at :00, :15, :30, :45), we check if current time is at or after reminder time but within 15 minutes
        if (!forceSend && (timeDiff < 0 || timeDiff > 15)) {
          if (timeDiff < 0) {
            console.log(`User ${profile.id}: Not time for reminder yet (${Math.abs(timeDiff)} minutes early) - waiting until ${reminderTime}`)
          } else {
            console.log(`User ${profile.id}: Reminder window missed (${timeDiff} minutes late) - will try again tomorrow`)
          }
          continue
        }
        
        if (forceSend) {
          console.log(`User ${profile.id}: 🚀 FORCE SEND MODE - bypassing time check!`)
        } else {
          console.log(`User ${profile.id}: ✅ Time matches and no reminder sent today! Proceeding with reminder...`)
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

        // Format phone number to international format
        const formattedPhoneNumber = formatPhoneNumber(profile.phone_number);
        console.log('Original phone number:', maskPhone(profile.phone_number));
        console.log('Formatted phone number:', maskPhone(formattedPhoneNumber));

        // Send SMS reminder with prompt
        await sendReminderSMS(formattedPhoneNumber, prompt.prompt_text)

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

        // Update last_reminder_sent date to prevent duplicate reminders today
        const { error: updateError } = await supabaseClient
          .from('profiles')
          .update({ last_reminder_sent: currentDate })
          .eq('id', profile.id)

        if (updateError) {
          console.error(`Error updating last reminder sent for user ${profile.id}:`, updateError)
        }

        remindersSent.push({
          userId: profile.id,
          phone: maskPhone(profile.phone_number),
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

  if (!surgeApiToken || !surgeAccountId) {
    throw new Error('Surge credentials not configured')
  }

  const message = `Here's a friendly reminder to journal today! Not sure what to write about? Here's a prompt: ${prompt}`

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

  const redactedPayload = { ...payload, conversation: { contact: { phone_number: maskPhone(phoneNumber) } } }
  console.log('Sending to Surge API:', JSON.stringify(redactedPayload, null, 2));

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
