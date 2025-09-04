-- Security Fix: Implement proper RLS policies for admin tables
-- This addresses the security finding about administrator password and session token exposure

-- 1. Create security definer function to get current admin user ID
-- This prevents RLS recursion issues
CREATE OR REPLACE FUNCTION public.get_current_admin_user_id()
RETURNS UUID AS $$
DECLARE
  user_email TEXT;
  admin_user_id UUID;
BEGIN
  -- Get the email from the authenticated user
  SELECT auth.email() INTO user_email;
  
  -- If no authenticated user, return null
  IF user_email IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Look up admin user by email
  SELECT id INTO admin_user_id 
  FROM public.admin_users 
  WHERE email = user_email AND is_active = true;
  
  RETURN admin_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 2. Create function to check if current user is an active admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_current_admin_user_id() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 3. Drop existing overly restrictive policies
DROP POLICY IF EXISTS "Block all client access to admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Block all client access to admin_sessions" ON public.admin_sessions;

-- 4. Create proper RLS policies for admin_users table
-- Admins can only view their own profile
CREATE POLICY "Admins can view own profile" 
ON public.admin_users 
FOR SELECT 
USING (id = public.get_current_admin_user_id());

-- Admins can update their own profile (but not create or delete)
CREATE POLICY "Admins can update own profile" 
ON public.admin_users 
FOR UPDATE 
USING (id = public.get_current_admin_user_id())
WITH CHECK (id = public.get_current_admin_user_id());

-- Block all other operations (INSERT/DELETE should only be done by superusers)
CREATE POLICY "Block admin user creation by clients" 
ON public.admin_users 
FOR INSERT 
WITH CHECK (false);

CREATE POLICY "Block admin user deletion by clients" 
ON public.admin_users 
FOR DELETE 
USING (false);

-- 5. Create proper RLS policies for admin_sessions table
-- Admins can only view their own sessions
CREATE POLICY "Admins can view own sessions" 
ON public.admin_sessions 
FOR SELECT 
USING (admin_user_id = public.get_current_admin_user_id());

-- Admins can create their own sessions (for login)
CREATE POLICY "Admins can create own sessions" 
ON public.admin_sessions 
FOR INSERT 
WITH CHECK (admin_user_id = public.get_current_admin_user_id());

-- Admins can update their own sessions (for session refresh)
CREATE POLICY "Admins can update own sessions" 
ON public.admin_sessions 
FOR UPDATE 
USING (admin_user_id = public.get_current_admin_user_id())
WITH CHECK (admin_user_id = public.get_current_admin_user_id());

-- Admins can delete their own sessions (for logout)
CREATE POLICY "Admins can delete own sessions" 
ON public.admin_sessions 
FOR DELETE 
USING (admin_user_id = public.get_current_admin_user_id());

-- 6. Add additional security: Ensure sessions expire automatically
-- Add trigger to clean up expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_admin_sessions()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete expired sessions whenever a new one is created
  DELETE FROM public.admin_sessions 
  WHERE expires_at < NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic cleanup
DROP TRIGGER IF EXISTS cleanup_expired_sessions_trigger ON public.admin_sessions;
CREATE TRIGGER cleanup_expired_sessions_trigger
  AFTER INSERT ON public.admin_sessions
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.cleanup_expired_admin_sessions();

-- 7. Add function to validate admin session tokens (for enhanced security)
CREATE OR REPLACE FUNCTION public.validate_admin_session(session_token TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  session_count INTEGER;
BEGIN
  -- Check if session exists and is not expired
  SELECT COUNT(*) INTO session_count
  FROM public.admin_sessions s
  JOIN public.admin_users u ON s.admin_user_id = u.id
  WHERE s.session_token = validate_admin_session.session_token
    AND s.expires_at > NOW()
    AND u.is_active = true;
    
  RETURN session_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 8. Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_admin_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_admin_session(TEXT) TO authenticated;