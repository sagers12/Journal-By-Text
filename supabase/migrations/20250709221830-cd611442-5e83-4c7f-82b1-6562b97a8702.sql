-- Fix the trigger_reminder_system function to use correct net.http_post syntax
CREATE OR REPLACE FUNCTION public.trigger_reminder_system()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    result jsonb;
    http_result record;
BEGIN
    -- Log the trigger attempt
    RAISE LOG 'trigger_reminder_system() called at %', now();
    
    -- Call the send-reminders edge function using net.http_post (NOT extensions.net.http_post)
    SELECT * INTO http_result FROM net.http_post(
        url := 'https://zfxdjbpjxpgreymebpsr.supabase.co/functions/v1/send-reminders',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmeGRqYnBqeHBncmV5bWVicHNyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODk4MjE2MCwiZXhwIjoyMDY0NTU4MTYwfQ.y-JLBsP3i7cJ5QBXI1y2eOXJFdMObCLN7yYDCjLOGLs"}'::jsonb,
        body := '{}'::jsonb
    );
    
    -- Log the result
    RAISE LOG 'HTTP request result: request_id=%, status=%', http_result.id, COALESCE(http_result.status, 'unknown');
    
    result := jsonb_build_object(
        'success', true,
        'request_id', http_result.id,
        'timestamp', now(),
        'status', 'Edge function triggered successfully'
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error
        RAISE LOG 'trigger_reminder_system() error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        
        result := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'sqlstate', SQLSTATE,
            'timestamp', now()
        );
        RETURN result;
END;
$$;