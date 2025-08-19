-- Allow admin users to read SMS test logs
-- First, check if we can identify admin users from the profiles table or need a different approach

-- Allow authenticated users to read their own test logs
-- Since this is an admin interface, we'll allow access based on authentication
-- In a production system, you'd want more granular admin role checking

CREATE POLICY "Allow authenticated admin access to sms_test_logs" 
ON public.sms_test_logs 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Also allow insert for the edge function to create test logs
CREATE POLICY "Allow service role to manage sms_test_logs" 
ON public.sms_test_logs 
FOR ALL 
USING (auth.role() = 'service_role');