-- Make password_hash nullable since we'll use regular Supabase auth
ALTER TABLE admin_users ALTER COLUMN password_hash DROP NOT NULL;

-- Add Ryan as an admin user using his existing auth user ID
INSERT INTO admin_users (id, email, full_name, is_active, created_at)
VALUES (
  '141150e2-7fb5-4057-b39a-2830a9657431',
  'ryan.sagers@gmail.com', 
  'Ryan Sagers',
  true,
  now()
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email,
  is_active = true,
  updated_at = now();