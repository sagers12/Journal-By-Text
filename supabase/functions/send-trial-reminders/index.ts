import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import Stripe from 'https://esm.sh/stripe@14.21.0'
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

    // Get users with verified phones (using same pattern as working reminders)
    const { data: profiles, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, phone_number, reminder_timezone')
      .eq('phone_verified', true)
      .not('phone_number', 'is', null)

    if (profileError) {
      console.error('Error fetching profiles:', profileError)
      return new Response(JSON.stringify({ error: 'Failed to fetch profiles' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Found ${profiles?.length || 0} profiles to check`)

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: 'No profiles found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const remindersSent = []
    const now = new Date()

    for (const profile of profiles) {
      try {
        console.log(`Processing user ${profile.id}`)
        
        // Check subscription status (same pattern as working reminders)
        const { data: subscriber, error: subError } = await supabaseClient
          .from('subscribers')
          .select('is_trial, trial_end, email')
          .eq('user_id', profile.id)
          .single()

        if (subError || !subscriber) {
          console.log(`User ${profile.id}: No subscription record found - skipping`)
          continue
        }

        // Only process users with active trials
        const hasActiveTrial = subscriber.is_trial && 
          subscriber.trial_end && 
          new Date(subscriber.trial_end) > new Date()

        if (!hasActiveTrial) {
          console.log(`User ${profile.id}: No active trial - skipping`)
          continue
        }

        console.log(`User ${profile.id}: ✅ Has active trial - checking timing`)
        
        // Calculate days until trial ends (more user-friendly than days elapsed)
        const trialEndDate = new Date(subscriber.trial_end)
        const daysUntilEnd = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        
        console.log(`User ${profile.id}: Trial ends in ${daysUntilEnd} days`)

        // Send reminders when 4, 3, 2, and 1 days remain (converted from old 7,8,9,10 logic)
        if (![4, 3, 2, 1].includes(daysUntilEnd)) {
          console.log(`User ${profile.id}: Not a reminder day (${daysUntilEnd} days remaining)`)
          continue
        }

        // Use same timezone approach as working reminders
        const userTimezone = profile.reminder_timezone || 'America/New_York'
        const now_utc = new Date()
        const localTimeString = now_utc.toLocaleString('en-US', { 
          timeZone: userTimezone,
          hour12: false,
          year: 'numeric',
          month: '2-digit', 
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
        
        const [datePart, timePart] = localTimeString.split(', ')
        const currentLocalDate = datePart.split('/').reverse().join('-').replace(/^(\d{4})\/(\d{2})\/(\d{2})$/, '$1-$3-$2')
        const [hours, minutes] = timePart.split(':').map(Number)
        const currentTimeInMinutes = hours * 60 + minutes
        
        console.log(`User ${profile.id}: Current time in ${userTimezone}: ${hours}:${minutes.toString().padStart(2, '0')}`)

        // Send between 1 PM and 4 PM (same window as working reminders)
        if (currentTimeInMinutes < 13 * 60 || currentTimeInMinutes > 16 * 60) {
          console.log(`User ${profile.id}: Outside reminder window (1-4 PM)`)
          continue
        }

        // Check if reminder already sent today for this trial day
        const { data: existingReminder } = await supabaseClient
          .from('trial_reminder_history')
          .select('id')
          .eq('user_id', profile.id)
          .eq('trial_day', daysUntilEnd)
          .gte('sent_at', currentLocalDate + 'T00:00:00.000Z')
          .lt('sent_at', currentLocalDate + 'T23:59:59.999Z')
          .single()

        if (existingReminder) {
          console.log(`User ${profile.id}: Reminder already sent today for ${daysUntilEnd} days remaining`)
          continue
        }

        // Generate checkout URL for this user
        const checkoutUrl = await createCheckoutUrl(subscriber.email)
        
        let message = ''
        if (daysUntilEnd === 1) {
          message = `Hey, this is the last day of your free trial with Journal By Text. Your service will end today unless you subscribe. Check out our monthly or yearly subscription options, and continue to build your journaling habit! Your future self will thank you for it. ${checkoutUrl}`
        } else {
          message = `Hey! Your Journal By Text free trial ends in ${daysUntilEnd} days. To keep journaling and maintain access to all your entries, subscribe to one of our paid plans today! ${checkoutUrl}`
        }

        // Send SMS reminder
        const formattedPhoneNumber = formatPhoneNumber(profile.phone_number)
        await sendTrialReminderSMS(formattedPhoneNumber, message)

        // Record that we sent this reminder
        const { error: historyError } = await supabaseClient
          .from('trial_reminder_history')
          .insert({
            user_id: profile.id,
            trial_day: daysUntilEnd,
            sent_at: now.toISOString()
          })

        if (historyError) {
          console.error(`Error recording reminder history for user ${profile.id}:`, historyError)
        }

        remindersSent.push({
          userId: profile.id,
          email: subscriber.email,
          phone: maskPhone(profile.phone_number),
          trialDaysRemaining: daysUntilEnd,
          message: message
        })

        console.log(`Trial reminder sent successfully to user ${profile.id} for ${daysUntilEnd} days remaining`)

      } catch (error) {
        console.error(`Error processing user ${profile.id}:`, error)
        continue
      }
    }

    console.log(`Trial reminder process completed. Sent ${remindersSent.length} reminders.`)

    return new Response(JSON.stringify({ 
      message: `Sent ${remindersSent.length} trial reminders`,
      remindersSent,
      currentUTC: now.toISOString()
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