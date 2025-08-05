-- Update the weekly recap cron job to use the database function instead of direct HTTP call
-- This matches the pattern used by the working daily reminders

-- First, unschedule the existing weekly recap cron job
SELECT cron.unschedule('send-weekly-recap');

-- Create the corrected weekly recap cron job that calls the database function
SELECT cron.schedule(
  'send-weekly-recap',
  '*/30 * * * 6,0,1', -- Every 30 minutes on Saturday, Sunday, and Monday to cover all timezones
  'SELECT public.trigger_weekly_recap_system();'
);