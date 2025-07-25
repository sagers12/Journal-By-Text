-- Create rate limiting tables for security
CREATE TABLE public.rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL, -- IP address, user ID, or phone number
  endpoint TEXT NOT NULL, -- 'auth_signin', 'auth_signup', 'phone_verification', 'sms_webhook'
  attempts INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  blocked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX idx_rate_limits_identifier_endpoint ON public.rate_limits(identifier, endpoint);
CREATE INDEX idx_rate_limits_window_start ON public.rate_limits(window_start);
CREATE INDEX idx_rate_limits_blocked_until ON public.rate_limits(blocked_until);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Service can manage rate limits
CREATE POLICY "Service can manage rate limits" 
ON public.rate_limits 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create account lockout table
CREATE TABLE public.account_lockouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 1,
  locked_until TIMESTAMP WITH TIME ZONE,
  last_attempt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX idx_account_lockouts_user_id ON public.account_lockouts(user_id);
CREATE INDEX idx_account_lockouts_email ON public.account_lockouts(email);
CREATE INDEX idx_account_lockouts_locked_until ON public.account_lockouts(locked_until);

-- Enable RLS
ALTER TABLE public.account_lockouts ENABLE ROW LEVEL SECURITY;

-- Service can manage account lockouts
CREATE POLICY "Service can manage account lockouts" 
ON public.account_lockouts 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Users can view their own lockout status
CREATE POLICY "Users can view their own lockout status" 
ON public.account_lockouts 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create security monitoring table
CREATE TABLE public.security_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL, -- 'failed_login', 'account_locked', 'suspicious_sms', 'rate_limit_exceeded'
  user_id UUID,
  identifier TEXT NOT NULL, -- IP, phone, email, etc.
  details JSONB,
  severity TEXT NOT NULL DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for monitoring
CREATE INDEX idx_security_events_event_type ON public.security_events(event_type);
CREATE INDEX idx_security_events_user_id ON public.security_events(user_id);
CREATE INDEX idx_security_events_created_at ON public.security_events(created_at);
CREATE INDEX idx_security_events_severity ON public.security_events(severity);

-- Enable RLS
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Service can manage security events
CREATE POLICY "Service can manage security events" 
ON public.security_events 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create function to clean up old rate limit records
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete rate limit records older than 24 hours
  DELETE FROM public.rate_limits 
  WHERE window_start < now() - INTERVAL '24 hours';
  
  -- Delete security events older than 30 days
  DELETE FROM public.security_events 
  WHERE created_at < now() - INTERVAL '30 days';
END;
$function$;

-- Create function to check rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_max_attempts INTEGER DEFAULT 5,
  p_window_minutes INTEGER DEFAULT 15
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_record RECORD;
  window_start_time TIMESTAMP WITH TIME ZONE;
  result JSONB;
BEGIN
  window_start_time := now() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Get or create rate limit record
  SELECT * INTO current_record 
  FROM public.rate_limits 
  WHERE identifier = p_identifier 
    AND endpoint = p_endpoint 
    AND window_start > window_start_time
  ORDER BY window_start DESC 
  LIMIT 1;
  
  -- Check if currently blocked
  IF current_record.blocked_until IS NOT NULL AND current_record.blocked_until > now() THEN
    result := jsonb_build_object(
      'allowed', false,
      'blocked_until', current_record.blocked_until,
      'attempts', current_record.attempts,
      'reason', 'rate_limited'
    );
    RETURN result;
  END IF;
  
  -- If no recent record or window expired, create new one
  IF current_record IS NULL OR current_record.window_start <= window_start_time THEN
    INSERT INTO public.rate_limits (identifier, endpoint, attempts, window_start)
    VALUES (p_identifier, p_endpoint, 1, now());
    
    result := jsonb_build_object(
      'allowed', true,
      'attempts', 1,
      'max_attempts', p_max_attempts
    );
    RETURN result;
  END IF;
  
  -- Update existing record
  UPDATE public.rate_limits 
  SET 
    attempts = attempts + 1,
    updated_at = now(),
    blocked_until = CASE 
      WHEN attempts + 1 >= p_max_attempts 
      THEN now() + INTERVAL '15 minutes'
      ELSE blocked_until 
    END
  WHERE id = current_record.id;
  
  -- Check if this update triggers a block
  IF current_record.attempts + 1 >= p_max_attempts THEN
    -- Log security event
    INSERT INTO public.security_events (event_type, identifier, details, severity)
    VALUES (
      'rate_limit_exceeded',
      p_identifier,
      jsonb_build_object(
        'endpoint', p_endpoint,
        'attempts', current_record.attempts + 1,
        'max_attempts', p_max_attempts
      ),
      'medium'
    );
    
    result := jsonb_build_object(
      'allowed', false,
      'blocked_until', now() + INTERVAL '15 minutes',
      'attempts', current_record.attempts + 1,
      'reason', 'rate_limited'
    );
  ELSE
    result := jsonb_build_object(
      'allowed', true,
      'attempts', current_record.attempts + 1,
      'max_attempts', p_max_attempts
    );
  END IF;
  
  RETURN result;
END;
$function$;