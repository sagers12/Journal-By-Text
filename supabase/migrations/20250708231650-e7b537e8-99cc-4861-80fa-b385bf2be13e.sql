-- Comprehensive diagnostic and fix for SMS reminder system
-- Step 1: Check if pg_net extension exists and is in the right schema
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
        RAISE NOTICE 'pg_net extension not found';
    ELSE
        RAISE NOTICE 'pg_net extension exists';
    END IF;
END $$;

-- Step 2: Ensure pg_net is in extensions schema (not public)
DROP EXTENSION IF EXISTS pg_net CASCADE;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Step 3: Clean up old cron jobs and recreate
SELECT cron.unschedule('send-journal-reminders');

-- Step 4: Create a test function to verify the system works
CREATE OR REPLACE FUNCTION public.test_reminder_system()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
DECLARE
    result jsonb;
    http_result record;
BEGIN
    -- Test if we can make HTTP calls using extensions.net
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
$$;

-- Step 5: Create the correct cron job with proper schema reference
SELECT cron.schedule(
    'send-journal-reminders',
    '*/15 * * * *', -- Every 15 minutes
    $$
    SELECT extensions.net.http_post(
        url := 'https://zfxdjbpjxpgreymebpsr.supabase.co/functions/v1/send-reminders',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmeGRqYnBqeHBncmV5bWVicHNyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODk4MjE2MCwiZXhwIjoyMDY0NTU4MTYwfQ.y-JLBsP3i7cJ5QBXI1y2eOXJFdMObCLN7yYDCjLOGLs"}'::jsonb,
        body := '{}'::jsonb
    );
    $$
);

-- Step 6: Test the system immediately
SELECT public.test_reminder_system() as test_result;