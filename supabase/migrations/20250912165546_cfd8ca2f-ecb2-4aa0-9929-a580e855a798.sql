-- Allow verified admins to read all profiles
CREATE POLICY "Verified admins can view all profiles" ON profiles
FOR SELECT USING (is_verified_admin());

-- Allow verified admins to read all subscribers  
CREATE POLICY "Verified admins can view all subscribers" ON subscribers
FOR SELECT USING (is_verified_admin());