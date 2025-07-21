
-- First, create a table to track when weekly recaps were sent to prevent duplicates
CREATE TABLE public.weekly_recap_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  week_start_date date NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  entry_count integer NOT NULL DEFAULT 0,
  UNIQUE(user_id, week_start_date)
);

-- Enable RLS on the new table
ALTER TABLE public.weekly_recap_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for weekly_recap_history
CREATE POLICY "Users can view their own weekly recap history" 
ON public.weekly_recap_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service can manage weekly recap history" 
ON public.weekly_recap_history 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Fix the existing cron job by dropping and recreating it with proper syntax
-- First unschedule the existing problematic job
SELECT cron.unschedule('weekly-recap-messages');

-- Create new cron job using the same pattern as the working reminder system
SELECT cron.schedule(
  'weekly-recap-messages-fixed',
  '0 18-19 * * 0', -- Every hour between 6-7pm on Sundays (covers 6:00pm-7:30pm window)
  $$
  SELECT extensions.net.http_post(
    url := 'https://zfxdjbpjxpgreymebpsr.supabase.co/functions/v1/send-weekly-recap',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmeGRqYnBqeHBncmV5bWVicHNyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODk4MjE2MCwiZXhwIjoyMDY0NTU4MTYwfQ.y-JLBsP3i7cJ5QBXI1y2eOXJFdMObCLN7yYDCjLOGLs"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Create a database function to trigger weekly recap (same pattern as working reminder system)
CREATE OR REPLACE FUNCTION public.trigger_weekly_recap_system()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    result jsonb;
    http_response_id bigint;
BEGIN
    -- Log the trigger attempt
    RAISE LOG 'trigger_weekly_recap_system() called at %', now();
    
    -- Call the send-weekly-recap edge function using net.http_post
    SELECT net.http_post(
        url := 'https://zfxdjbpjxpgreymebpsr.supabase.co/functions/v1/send-weekly-recap',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmeGRqYnBqeHBncmV5bWVicHNyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODk4MjE2MCwiZXhwIjoyMDY0NTU4MTYwfQ.y-JLBsP3i7cJ5QBXI1y2eOXJFdMObCLN7yYDCjLOGLs"}'::jsonb,
        body := '{}'::jsonb
    ) INTO http_response_id;
    
    -- Log the result
    RAISE LOG 'Weekly recap HTTP request initiated with ID: %', http_response_id;
    
    result := jsonb_build_object(
        'success', true,
        'request_id', http_response_id,
        'timestamp', now(),
        'status', 'Weekly recap edge function triggered successfully'
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error
        RAISE LOG 'trigger_weekly_recap_system() error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        
        result := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'sqlstate', SQLSTATE,
            'timestamp', now()
        );
        RETURN result;
END;
$$;

-- Also create an alternative cron job that uses the database function approach
SELECT cron.schedule(
  'weekly-recap-via-function',
  '0 18-19 * * 0', -- Every hour between 6-7pm on Sundays  
  $$SELECT public.trigger_weekly_recap_system();$$
);
