-- Add weekly recap setting to profiles table
ALTER TABLE public.profiles 
ADD COLUMN weekly_recap_enabled boolean DEFAULT true;