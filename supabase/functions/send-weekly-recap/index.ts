import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Profile {
  id: string;
  phone_number: string;
  reminder_timezone: string;
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

// Mask phone for logs
function maskPhone(phone: string): string {
  return phone ? phone.replace(/.(?=.{4})/g, '*') : '';
}

// Function to get start of week (Sunday) in user's timezone
function getWeekStartDate(userTimezone: string): string {
  const now = new Date();
  
  // Get current date in user's timezone
  const userDateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: userTimezone
  }).format(now);
  
  const userDate = new Date(userDateStr + 'T12:00:00'); // Add noon to avoid timezone issues
  
  // Calculate start of week (Sunday)
  const startOfWeek = new Date(userDate);
  startOfWeek.setDate(userDate.getDate() - userDate.getDay()); // Go to Sunday
  
  return startOfWeek.toISOString().split('T')[0]; // Return YYYY-MM-DD format
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

  try {
    console.log('Creating Supabase client...')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

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
      .select('id, phone_number, reminder_timezone, weekly_recap_enabled')
      .eq('weekly_recap_enabled', true)
      .eq('phone_verified', true)
      .not('phone_number', 'is', null);

    if (profileError) {
      console.error('Error fetching profiles:', profileError);
      throw profileError;
    }

    console.log(`Found ${profiles?.length || 0} users eligible for weekly recap`);

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No users eligible for weekly recap' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const profile of profiles as Profile[]) {
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
        
        // Get current time in user's timezone using the SAME method as working reminders
        const userCurrentTime = new Intl.DateTimeFormat('en-US', {
          timeZone: userTimezone,
          hour12: false,
          hour: '2-digit',
          minute: '2-digit'
        }).format(now)
        
        const [currentHour, currentMinute] = userCurrentTime.split(':').map(Number)
        
        // Get current day of week in user's timezone
        const dayOfWeek = new Date().toLocaleDateString('en-US', { 
          timeZone: userTimezone, 
          weekday: 'long' 
        })

        console.log(`User ${profile.id}: timezone: ${userTimezone}, time: ${userCurrentTime}, day: ${dayOfWeek}, current hour: ${currentHour}`)

        // Check if it's Sunday and between 6:00pm-7:30pm (expanded window as requested)
        const isSunday = dayOfWeek === 'Sunday'
        const isCorrectTime = (currentHour === 18) || (currentHour === 19 && currentMinute <= 30) // 6:00pm-7:30pm window
        
        if (!isSunday || !isCorrectTime) {
          console.log(`User ${profile.id}: Skipping - Day: ${dayOfWeek} (need Sunday), Hour: ${currentHour}:${currentMinute} (need 18:00-19:30)`)
          continue;
        }
        
        console.log(`User ${profile.id}: ✅ Sunday 6:00pm-7:30pm window - proceeding with weekly recap`)

        // Get week start date for tracking
        const weekStartDate = getWeekStartDate(userTimezone);
        console.log(`User ${profile.id}: Week start date: ${weekStartDate}`);

        // Check if we already sent a recap for this week
        const { data: existingRecap, error: historyError } = await supabase
          .from('weekly_recap_history')
          .select('*')
          .eq('user_id', profile.id)
          .eq('week_start_date', weekStartDate)
          .single();

        if (historyError && historyError.code !== 'PGRST116') { // PGRST116 is "not found" which is expected
          console.error(`Error checking recap history for user ${profile.id}:`, historyError);
          continue;
        }

        if (existingRecap) {
          console.log(`User ${profile.id}: ⏭️ Already sent weekly recap for week ${weekStartDate} on ${existingRecap.sent_at}`);
          continue;
        }

        console.log(`User ${profile.id}: 📝 No recap sent yet for week ${weekStartDate} - proceeding`);

        // Calculate the start and end of the week for entry counting
        const userDateStr = new Intl.DateTimeFormat('en-CA', {
          timeZone: userTimezone
        }).format(now);
        
        const userDate = new Date(userDateStr + 'T12:00:00');
        
        const startOfWeek = new Date(userDate);
        startOfWeek.setDate(userDate.getDate() - userDate.getDay()); // Go to Sunday
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Go to Saturday

        const startDateStr = startOfWeek.toISOString().split('T')[0];
        const endDateStr = endOfWeek.toISOString().split('T')[0];

        console.log(`User ${profile.id}: Counting journal entries from ${startDateStr} to ${endDateStr}`);

        // Count journal entries for this week
        const { count, error: countError } = await supabase
          .from('journal_entries')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .gte('entry_date', startDateStr)
          .lte('entry_date', endDateStr);

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
        console.log(`User ${profile.id} has ${entryCount} journal entries this week`);

        // Create the message
        const message = `Weekly Recap: You journaled ${entryCount} ${entryCount === 1 ? 'time' : 'times'} this week. To read your journal, visit journalbytext.com and login to your account.`;

        // Format phone number using the same approach as working reminders
        const formattedPhoneNumber = formatPhoneNumber(profile.phone_number);
        console.log(`User ${profile.id}: Original phone: ${maskPhone(profile.phone_number)}, Formatted: ${maskPhone(formattedPhoneNumber)}`);

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

        results.push({
          user_id: profile.id,
          success: true,
          entry_count: entryCount,
          week_start_date: weekStartDate,
          message_sent: message
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