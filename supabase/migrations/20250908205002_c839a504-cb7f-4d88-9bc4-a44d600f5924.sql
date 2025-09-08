-- Add unique constraint to prevent duplicate trial reminders per user per trial day
ALTER TABLE public.trial_reminder_history 
ADD CONSTRAINT unique_user_trial_day UNIQUE (user_id, trial_day);

-- Add index for better performance on lookups
CREATE INDEX IF NOT EXISTS idx_trial_reminder_history_user_trial_day 
ON public.trial_reminder_history (user_id, trial_day);