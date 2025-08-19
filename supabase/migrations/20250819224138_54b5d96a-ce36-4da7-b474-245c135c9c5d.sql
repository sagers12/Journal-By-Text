-- Fix security vulnerability in sms_test_logs RLS policies
-- Remove overly permissive and ineffective policies

DROP POLICY IF EXISTS "Allow authenticated admin access to sms_test_logs" ON public.sms_test_logs;
DROP POLICY IF EXISTS "Block all client access to sms_test_logs" ON public.sms_test_logs;

-- Create secure admin verification function
CREATE OR REPLACE FUNCTION public.is_verified_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if current user exists in admin_users table and is active
  RETURN EXISTS (
    SELECT 1 
    FROM public.admin_users 
    WHERE id = auth.uid() 
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create secure admin-only SELECT policy
CREATE POLICY "Verified admins can view sms_test_logs"
ON public.sms_test_logs
FOR SELECT
TO authenticated
USING (public.is_verified_admin());

-- Create service role policies for backend operations
CREATE POLICY "Service role can insert sms_test_logs"
ON public.sms_test_logs
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update sms_test_logs"
ON public.sms_test_logs
FOR UPDATE
TO service_role
USING (true);

CREATE POLICY "Service role can delete sms_test_logs"
ON public.sms_test_logs
FOR DELETE
TO service_role
USING (true);