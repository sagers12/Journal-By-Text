-- Create admin users table
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.admin_users(id),
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- Create admin sessions table
CREATE TABLE public.admin_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

-- Create dashboard metrics cache table
CREATE TABLE public.dashboard_metrics_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name TEXT NOT NULL,
  metric_value JSONB NOT NULL,
  period_type TEXT, -- 'today', 'week', 'month', etc.
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(metric_name, period_type, period_start, period_end)
);

-- Enable Row Level Security
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_metrics_cache ENABLE ROW LEVEL SECURITY;

-- Create RLS policies to block all client access (admin access via edge functions only)
CREATE POLICY "Block all client access to admin_users" ON public.admin_users FOR ALL USING (false);
CREATE POLICY "Block all client access to admin_sessions" ON public.admin_sessions FOR ALL USING (false);
CREATE POLICY "Block all client access to dashboard_metrics_cache" ON public.dashboard_metrics_cache FOR ALL USING (false);

-- Create indexes for performance
CREATE INDEX idx_admin_sessions_token ON public.admin_sessions(session_token);
CREATE INDEX idx_admin_sessions_admin_user ON public.admin_sessions(admin_user_id);
CREATE INDEX idx_admin_sessions_expires ON public.admin_sessions(expires_at);
CREATE INDEX idx_dashboard_metrics_name_period ON public.dashboard_metrics_cache(metric_name, period_type, period_start);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_admin_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_updated_at();

CREATE TRIGGER update_dashboard_metrics_updated_at
  BEFORE UPDATE ON public.dashboard_metrics_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_updated_at();

-- Insert initial super admin (you'll need to update this with your actual email)
-- Password hash for temporary password "admin123" - change this immediately!
INSERT INTO public.admin_users (email, password_hash, full_name, is_active)
VALUES ('admin@journalbytext.com', '$2b$10$rGKqHQ0x4Wg5W8VQ8VQ8WOg5W8VQ8VQ8VQ8VQ8VQ8VQ8VQ8VQ8VQ8W', 'Super Admin', true);