-- Fix security issue: Add search_path to test_reminder_system function
CREATE OR REPLACE FUNCTION public.test_reminder_system()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    result jsonb;
    http_result record;
BEGIN
    -- Test if we can make HTTP calls using net.http_post directly
    SELECT * INTO http_result FROM extensions.net.http_post(
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
$function$