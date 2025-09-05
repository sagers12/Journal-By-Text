-- Phase 1: Add first_subscription_date column to subscribers table
ALTER TABLE public.subscribers 
ADD COLUMN first_subscription_date timestamp with time zone;

-- Backfill existing subscribers with an approximation
-- Use created_at as the best approximation we have for existing paid subscribers
UPDATE public.subscribers 
SET first_subscription_date = created_at 
WHERE subscribed = true 
  AND is_trial = false 
  AND first_subscription_date IS NULL;

-- Add a comment to document this field
COMMENT ON COLUMN public.subscribers.first_subscription_date IS 'The date when the user first converted from trial to paid subscription. This field should only be set once and never updated.';