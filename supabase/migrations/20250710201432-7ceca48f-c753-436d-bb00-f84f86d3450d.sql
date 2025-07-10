-- Update the handle_new_user function to set reminder_timezone to match the user's actual timezone
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, phone_number, timezone, reminder_timezone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'phone_number',
    COALESCE(NEW.raw_user_meta_data->>'timezone', 'UTC'),
    COALESCE(NEW.raw_user_meta_data->>'timezone', 'UTC')
  );
  RETURN NEW;
END;
$function$;