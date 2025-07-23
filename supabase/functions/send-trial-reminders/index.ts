import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting trial reminder check process...')

    // Find users who are on trial and haven't subscribed yet
    const { data: subscribers, error: subscriberError } = await supabaseClient
      .from('subscribers')
      .select(`
        *,
        profiles!inner(phone_number, phone_verified, timezone)
      `)
      .eq('is_trial', true)
      .eq('subscribed', false)
      .not('trial_end', 'is', null)
      .eq('profiles.phone_verified', true)
      .not('profiles.phone_number', 'is', null)

    if (subscriberError) {
      console.error('Error fetching subscribers:', subscriberError)
      return new Response(JSON.stringify({ error: 'Failed to fetch subscribers' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Found ${subscribers?.length || 0} trial users`)

    if (!subscribers || subscribers.length === 0) {
      return new Response(JSON.stringify({ message: 'No trial users found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const remindersSent = []
    const now = new Date()

    for (const subscriber of subscribers) {
      try {
        const trialEnd = new Date(subscriber.trial_end)
        const trialStart = new Date(trialEnd.getTime() - (10 * 24 * 60 * 60 * 1000)) // 10 days before trial end
        
        // Calculate days elapsed since trial started
        const daysElapsed = Math.floor((now.getTime() - trialStart.getTime()) / (24 * 60 * 60 * 1000))
        
        console.log(`User ${subscriber.user_id}: Days elapsed in trial: ${daysElapsed}`)

        // Only send reminders on days 7, 8, 9, and 10
        if (![7, 8, 9, 10].includes(daysElapsed)) {
          console.log(`User ${subscriber.user_id}: Not on reminder day (day ${daysElapsed})`)
          continue
        }

        // Check user's timezone and current time
        const userTimezone = subscriber.profiles.timezone || 'UTC'
        const userCurrentTime = new Intl.DateTimeFormat('en-US', {
          timeZone: userTimezone,
          hour12: false,
          hour: '2-digit',
          minute: '2-digit'
        }).format(now)
        
        const [currentHour] = userCurrentTime.split(':').map(Number)
        
        console.log(`User ${subscriber.user_id}: Current time in ${userTimezone}: ${userCurrentTime}`)

        // Only send reminders between 1pm and 4pm (13:00 - 16:00) in user's timezone
        if (currentHour < 13 || currentHour >= 16) {
          console.log(`User ${subscriber.user_id}: Outside reminder time window (13-16h), current hour: ${currentHour}`)
          continue
        }

        // Check if we already sent a reminder today
        const today = now.toISOString().split('T')[0] // YYYY-MM-DD format
        
        // Check if reminder was already sent today for this day number
        const { data: existingReminder } = await supabaseClient
          .from('trial_reminder_history')
          .select('id')
          .eq('user_id', subscriber.user_id)
          .eq('trial_day', daysElapsed)
          .gte('sent_at', today + 'T00:00:00.000Z')
          .lt('sent_at', today + 'T23:59:59.999Z')
          .single()

        if (existingReminder) {
          console.log(`User ${subscriber.user_id}: Reminder already sent today for day ${daysElapsed}`)
          continue
        }

        // Generate checkout URL for this user
        const checkoutUrl = await createCheckoutUrl(subscriber.email)
        
        let message = ''
        if (daysElapsed === 10) {
          message = `Hey, this is the last day of your free trial with Journal By Text. Your service will end today unless you subscribe. Check out our monthly or yearly subscription options, and continue to build your journaling habit! Your future self will thank you for it. ${checkoutUrl}`
        } else {
          message = `Hey! You are on day ${daysElapsed} of your free trial with Journal By Text. To keep things going (and to continue to have access to all your previously written journal entries) subscribe to one of our paid plans today! ${checkoutUrl}`
        }

        // Send SMS reminder
        const formattedPhoneNumber = formatPhoneNumber(subscriber.profiles.phone_number)
        await sendTrialReminderSMS(formattedPhoneNumber, message)

        // Record that we sent this reminder
        const { error: historyError } = await supabaseClient
          .from('trial_reminder_history')
          .insert({
            user_id: subscriber.user_id,
            trial_day: daysElapsed,
            sent_at: now.toISOString()
          })

        if (historyError) {
          console.error(`Error recording reminder history for user ${subscriber.user_id}:`, historyError)
        }

        remindersSent.push({
          userId: subscriber.user_id,
          email: subscriber.email,
          phone: subscriber.profiles.phone_number,
          trialDay: daysElapsed,
          message: message
        })

        console.log(`Trial reminder sent successfully to user ${subscriber.user_id} for day ${daysElapsed}`)

      } catch (error) {
        console.error(`Error processing user ${subscriber.user_id}:`, error)
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

  const payload = {
    conversation: {
      contact: {
        phone_number: phoneNumber
      }
    },
    body: message,
    attachments: []
  }

  console.log('Sending trial reminder to Surge API:', JSON.stringify(payload, null, 2));

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