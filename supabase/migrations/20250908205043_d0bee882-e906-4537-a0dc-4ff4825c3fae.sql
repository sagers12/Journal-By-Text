-- First, identify and remove duplicate trial reminder history entries
-- Keep only the earliest entry for each (user_id, trial_day) combination
WITH duplicates AS (
  SELECT user_id, trial_day, MIN(sent_at) as earliest_sent_at
  FROM public.trial_reminder_history
  GROUP BY user_id, trial_day
  HAVING COUNT(*) > 1
),
to_delete AS (
  SELECT trh.id
  FROM public.trial_reminder_history trh
  INNER JOIN duplicates d ON trh.user_id = d.user_id AND trh.trial_day = d.trial_day
  WHERE trh.sent_at > d.earliest_sent_at
)
DELETE FROM public.trial_reminder_history
WHERE id IN (SELECT id FROM to_delete);

-- Now add the unique constraint to prevent future duplicates
ALTER TABLE public.trial_reminder_history 
ADD CONSTRAINT unique_user_trial_day UNIQUE (user_id, trial_day);

-- Add index for better performance on lookups
CREATE INDEX IF NOT EXISTS idx_trial_reminder_history_user_trial_day 
ON public.trial_reminder_history (user_id, trial_day);