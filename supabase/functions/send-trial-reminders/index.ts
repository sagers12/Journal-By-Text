import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import Stripe from 'https://esm.sh/stripe@14.21.0'
import { DateTime } from 'https://esm.sh/luxon@3.4.4'
import { createSurgePayload, maskPhone } from '../_shared/sms-utils.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

// Function to format phone number to international format
function formatPhoneNumber(phoneNumber: string): string {
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }
  
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  }
  
  if (phoneNumber.startsWith('+')) {
    return phoneNumber;
  }
  
  return `+1${digitsOnly}`;
}

serve(async (req) => {
  console.log('=== SEND TRIAL REMINDERS FUNCTION CALLED ===')
  console.log('Request method:', req.method)
  console.log('Timestamp:', new Date().toISOString())

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting trial reminder check process...')

    // Fetch users with active trials in a single query (more efficient)
    const { data: usersWithTrials, error: fetchError } = await supabaseClient
      .from('profiles')
      .select(`
        id, 
        phone_number, 
        timezone,
        reminder_timezone,
        subscribers!inner(trial_end, created_at, is_trial, email)
      `)
      .not('phone_number', 'is', null)
      .eq('phone_verified', true)
      .eq('subscribers.is_trial', true)
      .gt('subscribers.trial_end', new Date().toISOString())

    if (fetchError) {
      console.error('Error fetching users with trials:', fetchError)
      return new Response(JSON.stringify({ error: 'Failed to fetch users with trials' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Found ${usersWithTrials?.length || 0} users with active trials`)

    if (!usersWithTrials || usersWithTrials.length === 0) {
      return new Response(JSON.stringify({ message: 'No users with active trials found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const remindersSent = []
    const nowUTC = DateTime.utc()

    for (const user of usersWithTrials) {
      try {
        console.log(`Processing user ${user.id}`)
        
        const subscription = user.subscribers[0] // We know there's exactly one due to the query
        const userTimezone = user.timezone || user.reminder_timezone || 'America/New_York'

        // Convert dates to user's timezone for proper trial day calculation
        const trialStartUTC = DateTime.fromISO(subscription.created_at, { zone: 'utc' })
        const trialEndUTC = DateTime.fromISO(subscription.trial_end, { zone: 'utc' })

        const trialStartLocal = trialStartUTC.setZone(userTimezone).startOf('day')
        const trialEndLocal = trialEndUTC.setZone(userTimezone).startOf('day') 
        const nowLocal = nowUTC.setZone(userTimezone)

        // Calculate trial day based on user's timezone
        const totalTrialDays = Math.ceil(trialEndLocal.diff(trialStartLocal, 'days').days)
        const daysSinceStart = Math.floor(nowLocal.startOf('day').diff(trialStartLocal, 'days').days)
        const daysRemaining = totalTrialDays - daysSinceStart

        console.log(`User ${user.id}: ${daysRemaining} days remaining (timezone: ${userTimezone})`)

        // Only send reminders for 4, 3, 2, and 1 days remaining
        const reminderDays = [4, 3, 2, 1]
        if (!reminderDays.includes(daysRemaining)) {
          console.log(`User ${user.id}: Not a reminder day (${daysRemaining} days remaining)`)
          continue
        }

        // Only send between 1 PM and 4 PM in user's timezone
        const currentHour = nowLocal.hour
        if (currentHour < 13 || currentHour >= 16) {
          console.log(`User ${user.id}: Outside reminder window (${nowLocal.toFormat('HH:mm')} in ${userTimezone})`)
          continue
        }

        // INSERT-THEN-SEND: Try to insert reminder record first (idempotent due to unique constraint)
        try {
          const { error: insertError } = await supabaseClient
            .from('trial_reminder_history')
            .insert({
              user_id: user.id,
              trial_day: daysRemaining,
              sent_at: nowUTC.toISO()
            })

          if (insertError) {
            // If we get a unique constraint violation, it means reminder was already sent
            if (insertError.code === '23505') { // unique_violation
              console.log(`User ${user.id}: Reminder already sent for ${daysRemaining} days remaining - skipping`)
              continue
            } else {
              console.error(`User ${user.id}: Error recording reminder:`, insertError)
              continue
            }
          }
        } catch (dbError) {
          console.error(`User ${user.id}: Database error:`, dbError)
          continue
        }

        // If we got here, the insert was successful, so send the SMS
        try {
          // Generate checkout URL for this user
          const checkoutUrl = await createCheckoutUrl(subscription.email)
          
          let message = ''
          if (daysRemaining === 1) {
            message = `Hey, this is the last day of your free trial with Journal By Text. Your service will end today unless you subscribe. Check out our monthly or yearly subscription options, and continue to build your journaling habit! Your future self will thank you for it. ${checkoutUrl}`
          } else {
            message = `Hey! Your Journal By Text free trial ends in ${daysRemaining} days. To keep journaling and maintain access to all your entries, subscribe to one of our paid plans today! ${checkoutUrl}`
          }

          // Send SMS reminder
          const formattedPhoneNumber = formatPhoneNumber(user.phone_number)
          await sendTrialReminderSMS(formattedPhoneNumber, message)

          remindersSent.push({
            userId: user.id,
            email: subscription.email,
            phone: maskPhone(user.phone_number),
            trialDaysRemaining: daysRemaining,
            timezone: userTimezone,
            message: message
          })

          console.log(`User ${user.id}: ✅ Trial reminder sent successfully for ${daysRemaining} days remaining`)

        } catch (smsError) {
          console.error(`User ${user.id}: Error sending SMS:`, smsError)
          // Note: We don't remove the reminder history record here because we want to prevent retries
          // The unique constraint ensures we won't try again for this trial day
        }

      } catch (userError) {
        console.error(`User ${user.id}: Error processing:`, userError)
        continue
      }
    }

    console.log(`Trial reminder process completed. Sent ${remindersSent.length} reminders.`)

    return new Response(JSON.stringify({ 
      success: true,
      message: `Sent ${remindersSent.length} trial reminders`,
      remindersSent,
      usersChecked: usersWithTrials.length,
      currentUTC: nowUTC.toISO()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Trial reminder function error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function createCheckoutUrl(email: string): Promise<string> {
  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error('No Stripe key found, returning fallback URL');
      return 'https://zfxdjbpjxpgreymebpsr.supabase.co/upgrade'; 
    }

    // Import Stripe
    const { default: Stripe } = await import("https://esm.sh/stripe@14.21.0");
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Create checkout session for monthly plan by default
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { 
              name: "SMS Journal Monthly Subscription",
              description: "Journal anywhere, anytime - just send a text"
            },
            unit_amount: 799, // $7.99
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `https://zfxdjbpjxpgreymebpsr.supabase.co/journal?success=true`,
      cancel_url: `https://zfxdjbpjxpgreymebpsr.supabase.co/journal?canceled=true`,
    });

    return session.url || 'https://zfxdjbpjxpgreymebpsr.supabase.co/upgrade';
  } catch (error) {
    console.error('Error creating checkout URL:', error);
    return 'https://zfxdjbpjxpgreymebpsr.supabase.co/upgrade'; // Fallback URL
  }
}

async function sendTrialReminderSMS(phoneNumber: string, message: string) {
  const surgeApiToken = Deno.env.get('SURGE_API_TOKEN')
  const surgeAccountId = Deno.env.get('SURGE_ACCOUNT_ID')

  if (!surgeApiToken || !surgeAccountId) {
    throw new Error('Surge credentials not configured')
  }

  console.log('[send-trial-reminders] Using production environment')
  
  // Create Surge payload
  const payload = createSurgePayload(phoneNumber, message)

  const redactedPayload = { ...payload, conversation: { contact: { phone_number: maskPhone(phoneNumber) } } }
  console.log('Sending trial reminder to Surge API:', JSON.stringify(redactedPayload, null, 2));

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
      throw new Error(`Failed to send trial reminder SMS: ${responseText}`)
    }

    const result = JSON.parse(responseText);
    console.log('Trial reminder SMS sent successfully via Surge:', result)
  } catch (error) {
    console.error(`Failed to send trial reminder SMS to ${phoneNumber}:`, error)
    throw error
  }
}