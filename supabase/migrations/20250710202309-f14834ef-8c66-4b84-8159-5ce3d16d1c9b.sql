-- Add last_reminder_sent field to profiles table to track when reminder was last sent
ALTER TABLE public.profiles 
ADD COLUMN last_reminder_sent date;