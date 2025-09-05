import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to format phone number to international format (same as working reminders)
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


serve(async (req) => {
  // Log every request to ensure function is being called (same as working reminders)
  console.log('=== SEND MILESTONE MESSAGE FUNCTION CALLED ===')
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
    );

    const requestBody = await req.json();
    console.log('Request body:', requestBody);
    
    const { phone_number, message, user_id } = requestBody;

    if (!phone_number || !message || !user_id) {
      console.error('Missing required fields:', { phone_number: !!phone_number, message: !!message, user_id: !!user_id });
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Format phone number using the same approach as working reminders
    const formattedPhoneNumber = formatPhoneNumber(phone_number);
    console.log('Original phone number:', maskPhone(phone_number));
    console.log('Formatted phone number:', maskPhone(formattedPhoneNumber));

    // Get Surge credentials from Supabase secrets
    const surgeApiToken = Deno.env.get('SURGE_API_TOKEN');
    const surgeAccountId = Deno.env.get('SURGE_ACCOUNT_ID');

    if (!surgeApiToken || !surgeAccountId) {
      console.error('Missing Surge credentials:', { 
        hasToken: !!surgeApiToken, 
        hasAccountId: !!surgeAccountId 
      });
      throw new Error('Surge credentials not configured');
    }

    console.log(`Sending milestone message to ${formattedPhoneNumber}`);
    
    // Use the EXACT SAME API approach as working reminders
    await sendMilestoneSMS(formattedPhoneNumber, message, surgeApiToken, surgeAccountId);

    console.log('Milestone message sent successfully via Surge API');

    // Store the milestone message in our database for tracking
    const entryDate = new Date().toISOString().split('T')[0];
    const { error: dbError } = await supabase
      .from('sms_messages')
      .insert({
        user_id: user_id,
        phone_number: formattedPhoneNumber, // Use formatted phone number
        message_content: message,
        entry_date: entryDate,
        processed: true,
        surge_message_id: null // Will be populated from the response if needed
      });

    if (dbError) {
      console.error('Error storing milestone message in database:', dbError);
    } else {
      console.log('Milestone message stored in database successfully');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Milestone message sent successfully',
        phone_number: maskPhone(formattedPhoneNumber),
        user_id: user_id
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

async function sendMilestoneSMS(phoneNumber: string, message: string, surgeApiToken: string, surgeAccountId: string) {
  // Use the EXACT SAME payload structure as working reminders
  // Use phone number ID
  const phoneNumberId = Deno.env.get('SURGE_PHONE_NUMBER')
  
  console.log('[send-milestone-message] Using production environment, Phone ID:', phoneNumberId)
  
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
    return result;
  } catch (error) {
    console.error(`Failed to send SMS to ${phoneNumber}:`, error)
    throw error
  }
}