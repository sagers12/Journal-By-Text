-- Create a function to reset rate limits for a specific phone number
CREATE OR REPLACE FUNCTION public.reset_rate_limit_for_phone(phone_number text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete all rate limit records for the specified phone number
  DELETE FROM public.rate_limits 
  WHERE identifier = phone_number;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Also delete any security events for this phone number to reset the history
  DELETE FROM public.security_events 
  WHERE identifier = phone_number 
  AND event_type = 'rate_limit_exceeded';
  
  RETURN jsonb_build_object(
    'success', true,
    'phone_number', phone_number,
    'deleted_rate_limits', deleted_count,
    'timestamp', now(),
    'message', 'Rate limit reset successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'phone_number', phone_number,
      'timestamp', now()
    );
END;
$function$