-- Fix search path security issue for admin verification function
CREATE OR REPLACE FUNCTION public.is_verified_admin()
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
STABLE
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if current user exists in admin_users table and is active
  RETURN EXISTS (
    SELECT 1 
    FROM public.admin_users 
    WHERE id = auth.uid() 
      AND is_active = true
  );
END;
$$;