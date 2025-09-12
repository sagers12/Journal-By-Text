-- Enable RLS on phone_verification_tokens table (if not already enabled)
ALTER TABLE public.phone_verification_tokens ENABLE ROW LEVEL SECURITY;

-- Block all client access to phone verification tokens
-- These tokens should only be managed by edge functions via service role
CREATE POLICY "Block all client access to phone_verification_tokens"
ON public.phone_verification_tokens
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);

-- Allow service role full access for edge function operations
CREATE POLICY "Service role can manage phone_verification_tokens"
ON public.phone_verification_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);