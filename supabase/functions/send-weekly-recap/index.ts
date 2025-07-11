import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting weekly recap function...');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get SMS API credentials
    const surgeApiToken = Deno.env.get('SURGE_API_TOKEN')!;
    const surgeAccountId = Deno.env.get('SURGE_ACCOUNT_ID')!;
    const surgePhoneNumber = Deno.env.get('SURGE_PHONE_NUMBER')!;

    if (!surgeApiToken || !surgeAccountId || !surgePhoneNumber) {
      throw new Error('Missing required SMS credentials');
    }

    console.log('Fetching users eligible for weekly recap...');

    // Get all users who have weekly recap enabled and phone verified
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

        // Check if it's Sunday 6pm in the user's timezone
        const now = new Date();
        const userTimezone = profile.reminder_timezone || 'America/New_York';
        
        // Convert current time to user's timezone
        const userTime = new Date(now.toLocaleString("en-US", { timeZone: userTimezone }));
        const dayOfWeek = userTime.getDay(); // 0 = Sunday
        const hour = userTime.getHours();

        console.log(`User ${profile.id} timezone: ${userTimezone}, day: ${dayOfWeek}, hour: ${hour}`);

        // Only send if it's Sunday (0) and 6pm (18)
        if (dayOfWeek !== 0 || hour !== 18) {
          console.log(`Skipping user ${profile.id} - not Sunday 6pm in their timezone`);
          continue;
        }

        // Calculate the start and end of the week (Sunday to Saturday)
        const startOfWeek = new Date(userTime);
        startOfWeek.setDate(userTime.getDate() - userTime.getDay()); // Go to Sunday
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Go to Saturday
        endOfWeek.setHours(23, 59, 59, 999);

        console.log(`Counting journal entries for user ${profile.id} from ${startOfWeek.toISOString()} to ${endOfWeek.toISOString()}`);

        // Count journal entries for this week
        const { count, error: countError } = await supabase
          .from('journal_entries')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .gte('entry_date', startOfWeek.toISOString().split('T')[0])
          .lte('entry_date', endOfWeek.toISOString().split('T')[0]);

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

        // Send SMS via Surge API
        const smsPayload = {
          to: profile.phone_number,
          from: surgePhoneNumber,
          body: message
        };

        console.log(`Sending weekly recap SMS to ${profile.phone_number}`);

        const smsResponse = await fetch('https://api.surge.sh/messages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${surgeApiToken}`,
            'Content-Type': 'application/json',
            'X-Account-ID': surgeAccountId
          },
          body: JSON.stringify(smsPayload)
        });

        if (!smsResponse.ok) {
          const errorText = await smsResponse.text();
          console.error(`Failed to send SMS to user ${profile.id}:`, errorText);
          results.push({
            user_id: profile.id,
            success: false,
            error: `SMS sending failed: ${errorText}`
          });
          continue;
        }

        const smsData = await smsResponse.json();
        console.log(`Successfully sent weekly recap to user ${profile.id}`, smsData);

        results.push({
          user_id: profile.id,
          success: true,
          entry_count: entryCount,
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

    console.log('Weekly recap function completed. Results:', results);

    return new Response(
      JSON.stringify({
        message: 'Weekly recap processing completed',
        results: results,
        total_processed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
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
});