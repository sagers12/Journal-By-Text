-- Create subscription_events table to track subscription lifecycle
CREATE TABLE public.subscription_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('trial_started', 'subscribed', 'cancelled', 'resubscribed', 'expired')),
  subscription_tier TEXT,
  stripe_subscription_id TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own subscription events
CREATE POLICY "Users can view their own subscription events" 
ON public.subscription_events 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy for edge functions to insert/update subscription events
CREATE POLICY "Service role can manage subscription events" 
ON public.subscription_events 
FOR ALL 
USING (true);

-- Create index for efficient queries
CREATE INDEX idx_subscription_events_user_id ON public.subscription_events(user_id);
CREATE INDEX idx_subscription_events_event_type ON public.subscription_events(event_type);
CREATE INDEX idx_subscription_events_event_date ON public.subscription_events(event_date);

-- Backfill existing subscription data
INSERT INTO public.subscription_events (user_id, event_type, subscription_tier, event_date)
SELECT 
  user_id,
  CASE 
    WHEN subscribed = true THEN 'subscribed'
    WHEN is_trial = true THEN 'trial_started'
    ELSE 'expired'
  END as event_type,
  subscription_tier,
  COALESCE(first_subscription_date, created_at) as event_date
FROM public.subscribers
WHERE user_id IS NOT NULL;