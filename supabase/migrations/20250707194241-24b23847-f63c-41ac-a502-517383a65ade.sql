-- Enable pg_cron extension for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the reminder function to run every 15 minutes
-- This provides good coverage for all reminder times while not being too frequent
SELECT cron.schedule(
  'send-journal-reminders',
  '*/15 * * * *', -- Every 15 minutes
  $$
  SELECT
    net.http_post(
        url:='https://zfxdjbpjxpgreymeprsr.supabase.co/functions/v1/send-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmeGRqYnBqeHBncmV5bWVicHNyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODk4MjE2MCwiZXhwIjoyMDY0NTU4MTYwfQ.y-JLBsP3i7cJ5QBXI1y2eOXJFdMObCLN7yYDCjLOGLs"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);