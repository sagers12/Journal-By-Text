import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.9';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { phone_number, message, user_id } = await req.json();

    if (!phone_number || !message || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`Sending milestone message to ${phone_number} for user ${user_id}`);

    // Get Surge credentials from Supabase secrets
    const surgeApiToken = Deno.env.get('SURGE_API_TOKEN');
    const surgeAccountId = Deno.env.get('SURGE_ACCOUNT_ID');
    const surgePhoneNumber = Deno.env.get('SURGE_PHONE_NUMBER');

    if (!surgeApiToken || !surgeAccountId || !surgePhoneNumber) {
      throw new Error('Surge credentials not configured');
    }

    // Send SMS via Surge API
    const surgeResponse = await fetch('https://api.surgehq.ai/v1/message', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${surgeApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account_id: surgeAccountId,
        recipient: phone_number,
        message: message,
        from: surgePhoneNumber
      }),
    });

    if (!surgeResponse.ok) {
      const errorText = await surgeResponse.text();
      console.error('Surge API error:', errorText);
      throw new Error(`Surge API error: ${surgeResponse.status} ${errorText}`);
    }

    const surgeResult = await surgeResponse.json();
    console.log('Milestone message sent successfully:', surgeResult);

    // Store the milestone message in our database for tracking
    const entryDate = new Date().toISOString().split('T')[0];
    const { error: dbError } = await supabase
      .from('sms_messages')
      .insert({
        user_id: user_id,
        phone_number: phone_number,
        message_content: message,
        entry_date: entryDate,
        processed: true,
        surge_message_id: surgeResult.id || null
      });

    if (dbError) {
      console.error('Error storing milestone message in database:', dbError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        surge_message_id: surgeResult.id,
        message: 'Milestone message sent successfully' 
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Error in send-milestone-message function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});