-- Create a function that immediately sends a test reminder
CREATE OR REPLACE FUNCTION public.send_test_reminder()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    result jsonb;
    http_response_id bigint;
    test_user_profile RECORD;
BEGIN
    RAISE LOG 'send_test_reminder() started at %', now();
    
    -- Get the user's profile to test with (assuming you have reminder settings configured)
    SELECT * INTO test_user_profile 
    FROM profiles 
    WHERE reminder_enabled = true 
    AND phone_verified = true 
    AND phone_number IS NOT NULL
    LIMIT 1;
    
    IF test_user_profile IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No valid user profile found for testing',
            'timestamp', now()
        );
    END IF;
    
    RAISE LOG 'Found test user: % with phone: %', test_user_profile.id, test_user_profile.phone_number;
    
    -- Force call the edge function
    SELECT net.http_post(
        url := 'https://zfxdjbpjxpgreymebpsr.supabase.co/functions/v1/send-reminders',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmeGRqYnBqeHBncmV5bWVicHNyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODk4MjE2MCwiZXhwIjoyMDY0NTU4MTYwfQ.y-JLBsP3i7cJ5QBXI1y2eOXJFdMObCLN7yYDCjLOGLs"}'::jsonb,
        body := '{"force_send": true}'::jsonb
    ) INTO http_response_id;
    
    RAISE LOG 'Forced reminder HTTP call with response ID: %', http_response_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'http_response_id', http_response_id,
        'test_user_id', test_user_profile.id,
        'test_user_phone', test_user_profile.phone_number,
        'timestamp', now()
    );
END;
$$;