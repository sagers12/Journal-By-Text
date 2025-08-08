-- Deduplicate cron jobs that invoke our trigger functions, keeping the lowest jobid per type
-- Safe/idempotent: runs with no effect if there is only one job or none

DO $$
DECLARE
  keep_id integer;
  rec RECORD;
BEGIN
  -- Clean up duplicates for daily reminders
  SELECT MIN(jobid) INTO keep_id FROM cron.job WHERE command ILIKE '%trigger_reminder_system%';
  IF keep_id IS NOT NULL THEN
    FOR rec IN SELECT jobid FROM cron.job WHERE command ILIKE '%trigger_reminder_system%' AND jobid <> keep_id LOOP
      PERFORM cron.unschedule(rec.jobid);
    END LOOP;
  END IF;

  -- Clean up duplicates for weekly recap
  SELECT MIN(jobid) INTO keep_id FROM cron.job WHERE command ILIKE '%trigger_weekly_recap_system%';
  IF keep_id IS NOT NULL THEN
    FOR rec IN SELECT jobid FROM cron.job WHERE command ILIKE '%trigger_weekly_recap_system%' AND jobid <> keep_id LOOP
      PERFORM cron.unschedule(rec.jobid);
    END LOOP;
  END IF;

  -- Clean up duplicates for trial reminders
  SELECT MIN(jobid) INTO keep_id FROM cron.job WHERE command ILIKE '%trigger_trial_reminder_system%';
  IF keep_id IS NOT NULL THEN
    FOR rec IN SELECT jobid FROM cron.job WHERE command ILIKE '%trigger_trial_reminder_system%' AND jobid <> keep_id LOOP
      PERFORM cron.unschedule(rec.jobid);
    END LOOP;
  END IF;
END$$;