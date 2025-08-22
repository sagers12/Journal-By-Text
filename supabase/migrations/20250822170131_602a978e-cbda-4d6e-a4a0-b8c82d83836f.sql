-- CRITICAL SECURITY FIX: Fix account_lockouts RLS policy
-- The existing PERMISSIVE policy with false doesn't actually block access
-- We need properly configured RESTRICTIVE policies

-- Drop the existing faulty policy
DROP POLICY IF EXISTS "Account lockouts - block clients" ON public.account_lockouts;

-- Create restrictive policies that properly block ALL client access
-- RESTRICTIVE policies with false expressions will deny access
CREATE POLICY "Block all client SELECT on account_lockouts" 
ON public.account_lockouts 
AS RESTRICTIVE
FOR SELECT 
TO authenticated
USING (false);

CREATE POLICY "Block all client INSERT on account_lockouts" 
ON public.account_lockouts 
AS RESTRICTIVE
FOR INSERT 
TO authenticated
WITH CHECK (false);

CREATE POLICY "Block all client UPDATE on account_lockouts" 
ON public.account_lockouts 
AS RESTRICTIVE
FOR UPDATE 
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Block all client DELETE on account_lockouts" 
ON public.account_lockouts 
AS RESTRICTIVE
FOR DELETE 
TO authenticated
USING (false);

-- Block anonymous access
CREATE POLICY "Block all anon access to account_lockouts" 
ON public.account_lockouts 
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);