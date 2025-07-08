-- Fix the cron job to work with the new pg_net extension schema
-- First, unschedule the existing job
SELECT cron.unschedule('send-journal-reminders');

-- Schedule the updated reminder function to run every 15 minutes with correct pg_net schema
SELECT cron.schedule(
  'send-journal-reminders',
  '*/15 * * * *', -- Every 15 minutes
  $$
  SELECT
    extensions.net.http_post(
        url:='https://zfxdjbpjxpgreymebpsr.supabase.co/functions/v1/send-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmeGRqYnBqeHBncmV5bWVicHNyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODk4MjE2MCwiZXhwIjoyMDY0NTU4MTYwfQ.y-JLBsP3i7cJ5QBXI1y2eOXJFdMObCLN7yYDCjLOGLs"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);