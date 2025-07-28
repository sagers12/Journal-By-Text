-- Remove existing weekly recap cron jobs (there are duplicates)
SELECT cron.unschedule('weekly-recap-reminder');
SELECT cron.unschedule('weekly-recap-reminder-duplicate');

-- Create new cron job that runs every 30 minutes from Saturday through Monday
-- This covers all timezones where Sunday 6-7:30 PM could fall in UTC
SELECT cron.schedule(
  'weekly-recap-universal-timezone',
  '*/30 * * * 6,0,1', -- Every 30 minutes on Saturday (6), Sunday (0), and Monday (1)
  $$
  SELECT
    net.http_post(
        url:='https://zfxdjbpjxpgreymebpsr.supabase.co/functions/v1/send-weekly-recap',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmeGRqYnBqeHBncmV5bWVicHNyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODk4MjE2MCwiZXhwIjoyMDY0NTU4MTYwfQ.y-JLBsP3i7cJ5QBXI1y2eOXJFdMObCLN7yYDCjLOGLs"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);