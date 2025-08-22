-- Fix security vulnerability in subscribers table RLS policy
-- Remove email-based access that could allow unauthorized data access
-- Only allow access when user_id matches the authenticated user

-- Drop the existing permissive policy
DROP POLICY IF EXISTS "Subscribers select policy" ON public.subscribers;

-- Create a more secure policy that only allows user_id-based access
CREATE POLICY "Users can only view their own subscription data" 
ON public.subscribers 
FOR SELECT 
USING (auth.uid() = user_id);

-- Note: Edge functions use service role key and bypass RLS, so this won't affect them