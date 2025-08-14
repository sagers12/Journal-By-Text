-- First, let's create a proper bcrypt hash for 'admin123' password
-- Using bcrypt with salt rounds 10, this is the hash for 'admin123'
UPDATE admin_users 
SET password_hash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
WHERE email = 'admin@journalbytext.com';

-- If no admin user exists, create one
INSERT INTO admin_users (email, password_hash, full_name, is_active)
VALUES ('admin@journalbytext.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', true)
ON CONFLICT (email) DO UPDATE SET 
  password_hash = EXCLUDED.password_hash,
  is_active = true;