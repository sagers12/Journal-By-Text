-- Fix the search path issue for our newly created function
CREATE OR REPLACE FUNCTION public.create_subscriber_on_signup()
RETURNS TRIGGER AS $$
BEGIN
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
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';