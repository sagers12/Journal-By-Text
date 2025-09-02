import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

interface Profile {
  id: string;
  phone_number: string;
  reminder_timezone: string;
  timezone: string;
  weekly_recap_enabled: boolean;
}

interface WeeklyRecapHistory {
  user_id: string;
  week_start_date: string;
  sent_at: string;
  entry_count: number;
}

// Function to format phone number to international format (same as reminders)
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


// Function to get previous week's Sunday-Saturday range in a given timezone
function getPreviousWeekRange(countTimezone: string) {
  const now = new Date();
  const userDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: countTimezone }).format(now);
  const userDate = new Date(userDateStr + 'T12:00:00');

  // Sunday of the current week (in user's tz)
  const currentSunday = new Date(userDate);
  currentSunday.setDate(userDate.getDate() - userDate.getDay());

  // Previous week's Sunday and Saturday
  const prevSunday = new Date(currentSunday);
  prevSunday.setDate(currentSunday.getDate() - 7);

  const prevSaturday = new Date(prevSunday);
  prevSaturday.setDate(prevSunday.getDate() + 6);

  const startDate = prevSunday.toISOString().split('T')[0];
  const endDate = prevSaturday.toISOString().split('T')[0];

  return { startDate, endDate, weekStartDate: startDate };
}

Deno.serve(async (req) => {
  // Log every request to ensure function is being called
  console.log('=== SEND WEEKLY RECAP FUNCTION CALLED ===')
  console.log('Request method:', req.method)
  console.log('Request URL:', req.url)
  console.log('Timestamp:', new Date().toISOString())
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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
  const body = await req.json().catch(() => ({}));
  const preview = Boolean(body?.preview);
  const force = Boolean(body?.force);
  const targetUserId = typeof body?.user_id === 'string' ? body.user_id : undefined;

  console.log('Creating Supabase client...');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  console.log('Request params:', { preview, force, targetUserId });
    // Get SMS API credentials
    const surgeApiToken = Deno.env.get('SURGE_API_TOKEN')!;
    const surgeAccountId = Deno.env.get('SURGE_ACCOUNT_ID')!;
    const surgePhoneNumber = Deno.env.get('SURGE_PHONE_NUMBER')!;

    if (!surgeApiToken || !surgeAccountId || !surgePhoneNumber) {
      throw new Error('Missing required SMS credentials');
    }

    console.log('Fetching users eligible for weekly recap...');

    // First, get all users who have weekly recap enabled and phone verified
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, phone_number, reminder_timezone, timezone, weekly_recap_enabled')
      .eq('weekly_recap_enabled', true)
      .eq('phone_verified', true)
      .not('phone_number', 'is', null);

    if (profileError) {
      console.error('Error fetching profiles:', profileError);
      throw profileError;
    }

    console.log(`Found ${profiles?.length || 0} users eligible for weekly recap`);

    const filteredProfiles = (profiles || []).filter((p: any) => !targetUserId || p.id === targetUserId);

    if (filteredProfiles.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No users eligible for weekly recap', targetUserId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const profile of filteredProfiles as Profile[]) {
      try {
        console.log(`Processing weekly recap for user ${profile.id}`);

        // Check subscription status using the same pattern as working reminders
        const { data: subscriber, error: subError } = await supabase
          .from('subscribers')
          .select('subscribed, is_trial, trial_end')
          .eq('user_id', profile.id)
          .single();

        if (subError || !subscriber) {
          console.log(`User ${profile.id}: No subscription record found - skipping`);
          continue;
        }

        // Check if user has active subscription or trial (same logic as reminders)
        const hasActiveSubscription = subscriber.subscribed;
        const hasActiveTrial = subscriber.is_trial && 
          subscriber.trial_end && 
          new Date(subscriber.trial_end) > new Date();

        if (!hasActiveSubscription && !hasActiveTrial) {
          console.log(`User ${profile.id}: No active subscription or trial - skipping`);
          continue;
        }

        console.log(`User ${profile.id}: ✅ Has active subscription/trial - proceeding`);

        // Use the SAME timezone approach as working reminders
        const now = new Date();
        const userTimezone = profile.reminder_timezone || 'America/New_York';
        
        console.log(`User ${profile.id}: Using timestamp: ${now.toISOString()} for both time and day calculations`);
        
        // Get current time in user's timezone using the SAME method as working reminders
        const userCurrentTime = new Intl.DateTimeFormat('en-US', {
          timeZone: userTimezone,
          hour12: false,
          hour: '2-digit',
          minute: '2-digit'
        }).format(now)
        
        const [currentHour, currentMinute] = userCurrentTime.split(':').map(Number)
        
        // Get current day of week in user's timezone - CRITICAL: Use same 'now' timestamp
        const dayOfWeek = now.toLocaleDateString('en-US', { 
          timeZone: userTimezone, 
          weekday: 'long' 
        })

        console.log(`User ${profile.id}: timezone: ${userTimezone}, time: ${userCurrentTime}, day: ${dayOfWeek}, current hour: ${currentHour}`)

        if (!force) {
          const isSunday = dayOfWeek === 'Sunday';
          const isCorrectTime = (currentHour === 17 && currentMinute >= 59) || 
                                currentHour === 18 || 
                                (currentHour === 19 && currentMinute <= 31); // 5:59pm-7:31pm
          if (!isSunday || !isCorrectTime) {
            console.log(`User ${profile.id}: Skipping - Day: ${dayOfWeek} (need Sunday), Hour: ${currentHour}:${currentMinute} (need 17:59-19:31)`)
            continue;
          }
          console.log(`User ${profile.id}: ✅ Sunday 5:59pm-7:31pm window - proceeding with weekly recap`)
        } else {
          console.log(`User ${profile.id}: ⚙️ Force enabled - bypassing day/time checks`)
        }

        // Determine previous week's range using counting timezone (profile.timezone)
        const countingTimezone = (profile as any).timezone || userTimezone || 'UTC';
        const { startDate, endDate, weekStartDate } = getPreviousWeekRange(countingTimezone);
        console.log(`User ${profile.id}: reminder_timezone=${userTimezone}, counting_timezone=${countingTimezone}`);
        console.log(`User ${profile.id}: Previous week range: ${startDate} to ${endDate} (week_start_date=${weekStartDate})`);

        // Check if we already sent a recap for this previous week
        const { data: existingRecap, error: historyError } = await supabase
          .from('weekly_recap_history')
          .select('*')
          .eq('user_id', profile.id)
          .eq('week_start_date', weekStartDate)
          .single();

        if (historyError && historyError.code !== 'PGRST116') { // PGRST116 is "not found"
          console.error(`Error checking recap history for user ${profile.id}:`, historyError);
          continue;
        }

        if (existingRecap) {
          console.log(`User ${profile.id}: ⏭️ Already sent weekly recap for week ${weekStartDate} on ${existingRecap.sent_at}`);
          continue;
        }

        console.log(`User ${profile.id}: 📝 No recap sent yet for week ${weekStartDate} - proceeding`);

        // Count journal entries for the previous week (inclusive)
        const { count, error: countError } = await supabase
          .from('journal_entries')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .gte('entry_date', startDate)
          .lte('entry_date', endDate);

        if (countError) {
          console.error(`Error counting entries for user ${profile.id}:`, countError);
          results.push({
            user_id: profile.id,
            success: false,
            error: `Failed to count entries: ${countError.message}`
          });
          continue;
        }

        const entryCount = count || 0;
        console.log(`User ${profile.id} has ${entryCount} journal entries in previous week`);

        // Create the message
        const message = `Weekly Recap: You journaled ${entryCount} ${entryCount === 1 ? 'time' : 'times'} this week. To read your journal, visit journalbytext.com and login to your account.`;

        // Format phone number using the same approach as working reminders
        const formattedPhoneNumber = formatPhoneNumber(profile.phone_number);
        console.log(`User ${profile.id}: Original phone: ${maskPhone(profile.phone_number)}, Formatted: ${maskPhone(formattedPhoneNumber)}`);

        if (preview) {
          console.log(`User ${profile.id}: Preview mode - not sending SMS or recording history`);
        } else {
          console.log(`User ${profile.id}: 📱 Sending weekly recap SMS`);
          // Send the SMS
          await sendWeeklyRecapSMS(formattedPhoneNumber, message, surgeApiToken, surgeAccountId);

          // Record that we sent the recap
          const { error: insertError } = await supabase
            .from('weekly_recap_history')
            .insert({
              user_id: profile.id,
              week_start_date: weekStartDate,
              entry_count: entryCount
            });

          if (insertError) {
            console.error(`Error recording recap history for user ${profile.id}:`, insertError);
            // Don't fail the whole operation, just log it
          } else {
            console.log(`User ${profile.id}: ✅ Recorded recap history for week ${weekStartDate}`);
          }

          console.log(`User ${profile.id}: ✅ Successfully sent weekly recap`);
        }

        results.push({
          user_id: profile.id,
          success: true,
          entry_count: entryCount,
          week_start_date: weekStartDate,
          range: { start: startDate, end: endDate },
          message_sent: preview ? null : message,
          preview
        });

      } catch (error) {
        console.error(`Error processing user ${profile.id}:`, error);
        results.push({
          user_id: profile.id,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`=== WEEKLY RECAP COMPLETED ===`);
    console.log(`Total processed: ${results.length}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    console.log('Results:', results);

    return new Response(
      JSON.stringify({
        message: 'Weekly recap processing completed',
        results: results,
        total_processed: results.length,
        successful: successCount,
        failed: failCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in weekly recap function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})

async function sendWeeklyRecapSMS(phoneNumber: string, message: string, surgeApiToken: string, surgeAccountId: string) {
  // Use the EXACT SAME payload structure as working reminders
  // Determine environment based on phone number patterns or dev secrets
  const isDevEnvironment = !!(Deno.env.get('DEV_SUPABASE_URL') && Deno.env.get('SURGE_DEV_PHONE_ID'))
  
  // Get the appropriate phone number ID based on environment
  const phoneNumberId = isDevEnvironment 
    ? Deno.env.get('SURGE_DEV_PHONE_ID') 
    : Deno.env.get('SURGE_PROD_PHONE_ID')
  
  console.log(`[send-weekly-recap] Environment: ${isDevEnvironment ? 'DEV' : 'PROD'}, Phone ID: ${phoneNumberId}`)
  
  const payload = {
    conversation: {
      contact: {
        phone_number: phoneNumber
      },
      phone_number: {
        id: phoneNumberId
      }
    },
    body: message,
    attachments: []
  }

  const redactedPayload = { ...payload, conversation: { contact: { phone_number: maskPhone(phoneNumber) } } }
  console.log('Sending to Surge API:', JSON.stringify(redactedPayload, null, 2));

  try {
    // Use the EXACT SAME API endpoint as working reminders
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