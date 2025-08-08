-- 1) Secure settings storage
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'system_settings' AND policyname = 'system_settings - block all'
  ) THEN
    CREATE POLICY "system_settings - block all" ON public.system_settings FOR ALL USING (false) WITH CHECK (false);
  END IF;
END $$;

-- Helpers to read/write settings
CREATE OR REPLACE FUNCTION public.get_setting(p_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE v text;
BEGIN
  SELECT value INTO v FROM public.system_settings WHERE key = p_key;
  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_setting(p_key text, p_value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  INSERT INTO public.system_settings(key, value)
  VALUES (p_key, p_value)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
END;
$$;

-- 2) Update existing trigger functions to prefer X-CRON-SECRET, fallback to anon key
-- NOTE: Fallback now uses ANON key (not service role) to eliminate high-privilege exposure

-- trigger_weekly_recap_system
CREATE OR REPLACE FUNCTION public.trigger_weekly_recap_system()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    result jsonb;
    http_response_id bigint;
BEGIN
    RAISE LOG 'trigger_weekly_recap_system() called at %', now();

    SELECT net.http_post(
        url := 'https://zfxdjbpjxpgreymebpsr.supabase.co/functions/v1/send-weekly-recap',
        headers := CASE 
          WHEN public.get_setting('X_CRON_SECRET') IS NOT NULL THEN 
            jsonb_build_object(
              'Content-Type','application/json',
              'X-CRON-SECRET', public.get_setting('X_CRON_SECRET')
            )
          ELSE 
            '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmeGRqYnBqeHBncmV5bWVicHNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5ODIxNjAsImV4cCI6MjA2NDU1ODE2MH0.RKIGrOMAEE3DJfjoH-6BmNqeoTrVtd4Ct3yp3tG-Eww"}'::jsonb
        END,
        body := '{}'::jsonb
    ) INTO http_response_id;

    RAISE LOG 'Weekly recap HTTP request initiated with ID: %', http_response_id;

    result := jsonb_build_object(
        'success', true,
        'request_id', http_response_id,
        'timestamp', now(),
        'status', 'Weekly recap edge function triggered successfully'
    );

    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'trigger_weekly_recap_system() error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        result := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'sqlstate', SQLSTATE,
            'timestamp', now()
        );
        RETURN result;
END;
$function$;

-- trigger_reminder_system
CREATE OR REPLACE FUNCTION public.trigger_reminder_system()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    result jsonb;
    http_response_id bigint;
BEGIN
    RAISE LOG 'trigger_reminder_system() called at %', now();

    SELECT net.http_post(
        url := 'https://zfxdjbpjxpgreymebpsr.supabase.co/functions/v1/send-reminders',
        headers := CASE 
          WHEN public.get_setting('X_CRON_SECRET') IS NOT NULL THEN 
            jsonb_build_object(
              'Content-Type','application/json',
              'X-CRON-SECRET', public.get_setting('X_CRON_SECRET')
            )
          ELSE 
            '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmeGRqYnBqeHBncmV5bWVicHNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5ODIxNjAsImV4cCI6MjA2NDU1ODE2MH0.RKIGrOMAEE3DJfjoH-6BmNqeoTrVtd4Ct3yp3tG-Eww"}'::jsonb
        END,
        body := '{}'::jsonb
    ) INTO http_response_id;

    RAISE LOG 'HTTP request initiated with ID: %', http_response_id;

    result := jsonb_build_object(
        'success', true,
        'request_id', http_response_id,
        'timestamp', now(),
        'status', 'Edge function triggered successfully'
    );

    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'trigger_reminder_system() error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        result := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'sqlstate', SQLSTATE,
            'timestamp', now()
        );
        RETURN result;
END;
$function$;

-- test_edge_function_call
CREATE OR REPLACE FUNCTION public.test_edge_function_call()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    result jsonb;
    http_response_id bigint;
BEGIN
    RAISE LOG 'test_edge_function_call() started at %', now();

    SELECT net.http_post(
        url := 'https://zfxdjbpjxpgreymebpsr.supabase.co/functions/v1/send-reminders',
        headers := CASE 
          WHEN public.get_setting('X_CRON_SECRET') IS NOT NULL THEN 
            jsonb_build_object(
              'Content-Type','application/json',
              'X-CRON-SECRET', public.get_setting('X_CRON_SECRET')
            )
          ELSE 
            '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmeGRqYnBqeHBncmV5bWVicHNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5ODIxNjAsImV4cCI6MjA2NDU1ODE2MH0.RKIGrOMAEE3DJfjoH-6BmNqeoTrVtd4Ct3yp3tG-Eww"}'::jsonb
        END,
        body := '{}'::jsonb
    ) INTO http_response_id;

    RAISE LOG 'HTTP call initiated with response ID: %', http_response_id;

    SELECT jsonb_build_object(
        'success', true,
        'http_response_id', http_response_id,
        'timestamp', now(),
        'message', 'HTTP call attempted'
    ) INTO result;

    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'test_edge_function_call() error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        SELECT jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'sqlstate', SQLSTATE,
            'timestamp', now()
        ) INTO result;
        RETURN result;
END;
$function$;

-- test_reminder_system (uses extensions.net.http_post in original; keep compatible)
CREATE OR REPLACE FUNCTION public.test_reminder_system()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    result jsonb;
    http_result record;
BEGIN
    SELECT * INTO http_result FROM extensions.net.http_post(
        url := 'https://zfxdjbpjxpgreymebpsr.supabase.co/functions/v1/send-reminders',
        headers := CASE 
          WHEN public.get_setting('X_CRON_SECRET') IS NOT NULL THEN 
            jsonb_build_object(
              'Content-Type','application/json',
              'X-CRON-SECRET', public.get_setting('X_CRON_SECRET')
            )
          ELSE 
            '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmeGRqYnBqeHBncmV5bWVicHNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5ODIxNjAsImV4cCI6MjA2NDU1ODE2MH0.RKIGrOMAEE3DJfjoH-6BmNqeoTrVtd4Ct3yp3tG-Eww"}'::jsonb
        END,
        body := '{}'::jsonb
    );

    result := jsonb_build_object(
        'success', true,
        'request_id', http_result.id,
        'status', 'HTTP request sent successfully'
    );

    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        result := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'sqlstate', SQLSTATE
        );
        RETURN result;
END;
$function$;

-- send_test_reminder
CREATE OR REPLACE FUNCTION public.send_test_reminder()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    result jsonb;
    http_response_id bigint;
    test_user_profile RECORD;
BEGIN
    RAISE LOG 'send_test_reminder() started at %', now();

    SELECT * INTO test_user_profile 
    FROM profiles 
    WHERE reminder_enabled = true 
      AND phone_verified = true 
      AND phone_number IS NOT NULL
    LIMIT 1;

    IF test_user_profile IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No valid user profile found for testing',
            'timestamp', now()
        );
    END IF;

    RAISE LOG 'Found test user: % with phone: %', test_user_profile.id, test_user_profile.phone_number;

    SELECT net.http_post(
        url := 'https://zfxdjbpjxpgreymebpsr.supabase.co/functions/v1/send-reminders',
        headers := CASE 
          WHEN public.get_setting('X_CRON_SECRET') IS NOT NULL THEN 
            jsonb_build_object(
              'Content-Type','application/json',
              'X-CRON-SECRET', public.get_setting('X_CRON_SECRET')
            )
          ELSE 
            '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmeGRqYnBqeHBncmV5bWVicHNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5ODIxNjAsImV4cCI6MjA2NDU1ODE2MH0.RKIGrOMAEE3DJfjoH-6BmNqeoTrVtd4Ct3yp3tG-Eww"}'::jsonb
        END,
        body := '{"force_send": true}'::jsonb
    ) INTO http_response_id;

    RAISE LOG 'Forced reminder HTTP call with response ID: %', http_response_id;

    RETURN jsonb_build_object(
        'success', true,
        'http_response_id', http_response_id,
        'test_user_id', test_user_profile.id,
        'test_user_phone', test_user_profile.phone_number,
        'timestamp', now()
    );
END;
$function$;

-- trigger_trial_reminder_system
CREATE OR REPLACE FUNCTION public.trigger_trial_reminder_system()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    result jsonb;
    http_response_id bigint;
BEGIN
    RAISE LOG 'trigger_trial_reminder_system() called at %', now();

    SELECT net.http_post(
        url := 'https://zfxdjbpjxpgreymebpsr.supabase.co/functions/v1/send-trial-reminders',
        headers := CASE 
          WHEN public.get_setting('X_CRON_SECRET') IS NOT NULL THEN 
            jsonb_build_object(
              'Content-Type','application/json',
              'X-CRON-SECRET', public.get_setting('X_CRON_SECRET')
            )
          ELSE 
            '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmeGRqYnBqeHBncmV5bWVicHNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5ODIxNjAsImV4cCI6MjA2NDU1ODE2MH0.RKIGrOMAEE3DJfjoH-6BmNqeoTrVtd4Ct3yp3tG-Eww"}'::jsonb
        END,
        body := '{}'::jsonb
    ) INTO http_response_id;

    RAISE LOG 'Trial reminder HTTP request initiated with ID: %', http_response_id;

    result := jsonb_build_object(
        'success', true,
        'request_id', http_response_id,
        'timestamp', now(),
        'status', 'Trial reminder edge function triggered successfully'
    );

    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'trigger_trial_reminder_system() error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        result := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'sqlstate', SQLSTATE,
            'timestamp', now()
        );
        RETURN result;
END;
$function$;