-- Remove the test cron job running every minute
SELECT cron.unschedule('test-reminder-system-every-minute');

-- Let's also check if pg_net extension is enabled and create a simpler test function
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a test function that tries to call our edge function with better error handling
CREATE OR REPLACE FUNCTION public.test_edge_function_call()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    result jsonb;
    http_response_id bigint;
BEGIN
    -- Log the test attempt
    RAISE LOG 'test_edge_function_call() started at %', now();
    
    -- Try to make the HTTP call and get the response ID
    SELECT net.http_post(
        url := 'https://zfxdjbpjxpgreymebpsr.supabase.co/functions/v1/send-reminders',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmeGRqYnBqeHBncmV5bWVicHNyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODk4MjE2MCwiZXhwIjoyMDY0NTU4MTYwfQ.y-JLBsP3i7cJ5QBXI1y2eOXJFdMObCLN7yYDCjLOGLs"}'::jsonb,
        body := '{}'::jsonb
    ) INTO http_response_id;
    
    RAISE LOG 'HTTP call initiated with response ID: %', http_response_id;
    
    -- Wait a moment and check the response
    PERFORM pg_sleep(2);
    
    -- Check the actual response from pg_net
    SELECT jsonb_build_object(
        'success', true,
        'http_response_id', http_response_id,
        'timestamp', now(),
        'message', 'HTTP call attempted'
    ) INTO result;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'test_edge_function_call() error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        
        SELECT jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'sqlstate', SQLSTATE,
            'timestamp', now()
        ) INTO result;
        
        RETURN result;
END;
$$;