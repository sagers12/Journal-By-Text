
-- Add unique constraint to prevent duplicate phone numbers
ALTER TABLE profiles ADD CONSTRAINT profiles_phone_number_unique UNIQUE (phone_number);

-- Add a check constraint to ensure phone_number is not null when provided
ALTER TABLE profiles ADD CONSTRAINT profiles_phone_number_not_empty 
CHECK (phone_number IS NULL OR length(trim(phone_number)) > 0);
