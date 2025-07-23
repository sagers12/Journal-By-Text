-- First, check if the trigger already exists (this will show an error if it doesn't exist, which is expected)
-- If it exists, we'll recreate it to ensure it's correct

-- Drop existing trigger if it exists (no error if it doesn't exist)
DROP TRIGGER IF EXISTS create_subscriber_trigger ON auth.users;

-- Recreate the function with proper error handling
CREATE OR REPLACE FUNCTION public.create_subscriber_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if subscriber already exists to avoid duplicates
  IF NOT EXISTS (SELECT 1 FROM public.subscribers WHERE user_id = NEW.id OR email = NEW.email) THEN
    INSERT INTO public.subscribers (
      user_id,
      email,
      is_trial,
      trial_end,
      subscribed
    ) VALUES (
      NEW.id,
      NEW.email,
      true,
      NOW() + INTERVAL '10 days',
      false
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Create the trigger
CREATE TRIGGER create_subscriber_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_subscriber_on_signup();