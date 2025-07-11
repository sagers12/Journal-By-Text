-- Create cron job for weekly recap messages every Sunday at 6pm
-- This will run every hour on Sundays and the edge function will handle timezone checking
SELECT cron.schedule(
  'weekly-recap-messages',
  '0 * * * 0', -- Every hour on Sunday
  $$
  SELECT net.http_post(
    url := 'https://zfxdjbpjxpgreymebpsr.supabase.co/functions/v1/send-weekly-recap',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmeGRqYnBqeHBncmV5bWVicHNyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODk4MjE2MCwiZXhwIjoyMDY0NTU4MTYwfQ.y-JLBsP3i7cJ5QBXI1y2eOXJFdMObCLN7yYDCjLOGLs"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);