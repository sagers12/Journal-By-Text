-- Create database function to trigger trial reminder system (matching working pattern)
CREATE OR REPLACE FUNCTION public.trigger_trial_reminder_system()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    result jsonb;
    http_response_id bigint;
BEGIN
    -- Log the trigger attempt
    RAISE LOG 'trigger_trial_reminder_system() called at %', now();
    
    -- Call the send-trial-reminders edge function using net.http_post
    SELECT net.http_post(
        url := 'https://zfxdjbpjxpgreymebpsr.supabase.co/functions/v1/send-trial-reminders',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmeGRqYnBqeHBncmV5bWVicHNyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODk4MjE2MCwiZXhwIjoyMDY0NTU4MTYwfQ.y-JLBsP3i7cJ5QBXI1y2eOXJFdMObCLN7yYDCjLOGLs"}'::jsonb,
        body := '{}'::jsonb
    ) INTO http_response_id;
    
    -- Log the result
    RAISE LOG 'Trial reminder HTTP request initiated with ID: %', http_response_id;
    
    result := jsonb_build_object(
        'success', true,
        'request_id', http_response_id,
        'timestamp', now(),
        'status', 'Trial reminder edge function triggered successfully'
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error
        RAISE LOG 'trigger_trial_reminder_system() error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        
        result := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'sqlstate', SQLSTATE,
            'timestamp', now()
        );
        RETURN result;
END;
$function$;

-- Update the cron job to use the database function pattern (like working reminders)
-- First, unschedule any existing trial reminder jobs
SELECT cron.unschedule('trial-reminder-system');

-- Create new cron job using database function pattern (runs every hour like reminders)
SELECT cron.schedule(
    'trial-reminder-system',
    '0 * * * *', -- Every hour at minute 0
    'SELECT public.trigger_trial_reminder_system();'
);