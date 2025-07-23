-- Create table to track trial reminder history
CREATE TABLE public.trial_reminder_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  trial_day INTEGER NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trial_reminder_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own reminder history
CREATE POLICY "Users can view their own trial reminder history" 
ON public.trial_reminder_history 
FOR SELECT 
USING (auth.uid() = user_id);

-- Service can manage all trial reminder history
CREATE POLICY "Service can manage trial reminder history" 
ON public.trial_reminder_history 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Add index for performance
CREATE INDEX idx_trial_reminder_history_user_day ON public.trial_reminder_history(user_id, trial_day);
CREATE INDEX idx_trial_reminder_history_sent_at ON public.trial_reminder_history(sent_at);

-- Schedule the trial reminder function to run every hour
SELECT cron.schedule(
  'send-trial-reminders',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://zfxdjbpjxpgreymebpsr.supabase.co/functions/v1/send-trial-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmeGRqYnBqeHBncmV5bWVicHNyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODk4MjE2MCwiZXhwIjoyMDY0NTU4MTYwfQ.y-JLBsP3i7cJ5QBXI1y2eOXJFdMObCLN7yYDCjLOGLs"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);