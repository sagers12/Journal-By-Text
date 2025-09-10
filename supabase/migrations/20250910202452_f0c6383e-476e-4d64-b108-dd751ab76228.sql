-- Fix security issue: Block anonymous access to subscription_events table
-- and ensure only authenticated users can view their own subscription events

-- Drop existing policies to recreate them with better security
DROP POLICY IF EXISTS "Service role can manage subscription events" ON public.subscription_events;
DROP POLICY IF EXISTS "Users can view their own subscription events" ON public.subscription_events;

-- Block all anonymous access explicitly
CREATE POLICY "Block anonymous access to subscription events" 
ON public.subscription_events 
FOR ALL 
TO anon 
USING (false);

-- Allow authenticated users to view only their own subscription events
CREATE POLICY "Users can view their own subscription events" 
ON public.subscription_events 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Allow service role to manage all subscription events (needed for edge functions)
CREATE POLICY "Service role can manage subscription events" 
ON public.subscription_events 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);