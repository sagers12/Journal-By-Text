-- Create tables to support SMS testing and monitoring

-- SMS test logs to track test executions
CREATE TABLE public.sms_test_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_type TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  message_content TEXT NOT NULL,
  character_count INTEGER NOT NULL DEFAULT 0,
  byte_count INTEGER NOT NULL DEFAULT 0,
  payload JSONB,
  webhook_response TEXT,
  webhook_status INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  success BOOLEAN DEFAULT true
);

-- Health check logs to track system health over time
CREATE TABLE public.health_check_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  overall_status TEXT NOT NULL,
  checks_passed INTEGER NOT NULL DEFAULT 0,
  checks_warned INTEGER NOT NULL DEFAULT 0,
  checks_failed INTEGER NOT NULL DEFAULT 0,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- SMS processing events log for detailed tracking
CREATE TABLE public.sms_processing_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL, -- 'received', 'processing_start', 'processing_complete', 'error', 'journal_created'
  surge_message_id TEXT,
  phone_number TEXT NOT NULL,
  user_id UUID,
  entry_id UUID,
  processing_time_ms INTEGER,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables (block all client access - these are for internal use only)
ALTER TABLE public.sms_test_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_check_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_processing_events ENABLE ROW LEVEL SECURITY;

-- Block all client access to these internal tables
CREATE POLICY "Block all client access to sms_test_logs" ON public.sms_test_logs
FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "Block all client access to health_check_logs" ON public.health_check_logs
FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "Block all client access to sms_processing_events" ON public.sms_processing_events
FOR ALL USING (false) WITH CHECK (false);

-- Create indexes for performance
CREATE INDEX idx_sms_test_logs_created_at ON public.sms_test_logs(created_at DESC);
CREATE INDEX idx_health_check_logs_created_at ON public.health_check_logs(created_at DESC);
CREATE INDEX idx_sms_processing_events_created_at ON public.sms_processing_events(created_at DESC);
CREATE INDEX idx_sms_processing_events_surge_id ON public.sms_processing_events(surge_message_id);
CREATE INDEX idx_sms_processing_events_phone ON public.sms_processing_events(phone_number);