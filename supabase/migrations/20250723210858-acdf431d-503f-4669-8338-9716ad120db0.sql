-- Fix OTP expiry to be more secure (1 hour instead of default)
UPDATE auth.config 
SET 
  otp_exp = 3600, -- 1 hour in seconds
  password_min_length = 8
WHERE true;

-- Enable leaked password protection
UPDATE auth.config 
SET enable_leaked_password_protection = true
WHERE true;