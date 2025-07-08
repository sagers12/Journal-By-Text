-- Fix the cross-database reference issue for pg_net
-- The issue is that we need to call pg_net functions directly, not through schema qualification

-- Clean up and recreate the cron job with the correct syntax
SELECT cron.unschedule('send-journal-reminders');

-- Use the correct function call syntax for pg_net
SELECT cron.schedule(
    'send-journal-reminders',
    '*/15 * * * *', -- Every 15 minutes
    $$
    SELECT net.http_post(
        url := 'https://zfxdjbpjxpgreymebpsr.supabase.co/functions/v1/send-reminders',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmeGRqYnBqeHBncmV5bWVicHNyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODk4MjE2MCwiZXhwIjoyMDY0NTU4MTYwfQ.y-JLBsP3i7cJ5QBXI1y2eOXJFdMObCLN7yYDCjLOGLs"}'::jsonb,
        body := '{}'::jsonb
    ) as request_id;
    $$
);

-- Update the test function to use the correct syntax
CREATE OR REPLACE FUNCTION public.test_reminder_system()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
    http_result record;
BEGIN
    -- Test if we can make HTTP calls using net.http_post directly
    SELECT * INTO http_result FROM net.http_post(
        url := 'https://zfxdjbpjxpgreymebpsr.supabase.co/functions/v1/send-reminders',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmeGRqYnBqeHBncmV5bWVicHNyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODk4MjE2MCwiZXhwIjoyMDY0NTU4MTYwfQ.y-JLBsP3i7cJ5QBXI1y2eOXJFdMObCLN7yYDCjLOGLs"}'::jsonb,
        body := '{}'::jsonb
    );
    
    result := jsonb_build_object(
        'success', true,
        'request_id', http_result.id,
        'status', 'HTTP request sent successfully'
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        result := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'sqlstate', SQLSTATE
        );
        RETURN result;
END;
$$;

-- Test the system again
SELECT public.test_reminder_system() as test_result;