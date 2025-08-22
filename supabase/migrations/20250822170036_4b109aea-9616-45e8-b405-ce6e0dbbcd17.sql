-- CRITICAL SECURITY FIX: Fix account_lockouts RLS policy
-- The existing policy is PERMISSIVE which allows access when false evaluates to false
-- We need RESTRICTIVE policies to properly block access

-- Drop the existing permissive policy
DROP POLICY IF EXISTS "Account lockouts - block clients" ON public.account_lockouts;

-- Create proper restrictive policies that block ALL client access
-- Using RESTRICTIVE ensures the false condition actually blocks access
CREATE POLICY "Block all client SELECT on account_lockouts" 
ON public.account_lockouts 
FOR SELECT 
TO authenticated
AS RESTRICTIVE
USING (false);

CREATE POLICY "Block all client INSERT on account_lockouts" 
ON public.account_lockouts 
FOR INSERT 
TO authenticated
AS RESTRICTIVE
WITH CHECK (false);

CREATE POLICY "Block all client UPDATE on account_lockouts" 
ON public.account_lockouts 
FOR UPDATE 
TO authenticated
AS RESTRICTIVE
USING (false)
WITH CHECK (false);

CREATE POLICY "Block all client DELETE on account_lockouts" 
ON public.account_lockouts 
FOR DELETE 
TO authenticated
AS RESTRICTIVE
USING (false);

-- Also block anonymous access explicitly
CREATE POLICY "Block all anon access to account_lockouts" 
ON public.account_lockouts 
FOR ALL
TO anon
AS RESTRICTIVE
USING (false)
WITH CHECK (false);