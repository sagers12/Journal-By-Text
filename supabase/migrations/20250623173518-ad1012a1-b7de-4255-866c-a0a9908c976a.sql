
-- Create table to store SMS consent records
CREATE TABLE public.sms_consents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  phone_number TEXT NOT NULL,
  consent_text TEXT NOT NULL,
  consented_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public.sms_consents ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own consent records
CREATE POLICY "Users can view their own SMS consents" 
  ON public.sms_consents 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy for inserting consent records
CREATE POLICY "Users can create their own SMS consents" 
  ON public.sms_consents 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create index for efficient queries
CREATE INDEX idx_sms_consents_user_id ON public.sms_consents(user_id);
CREATE INDEX idx_sms_consents_phone_number ON public.sms_consents(phone_number);
