-- Create the new hashed phone verification tokens table
CREATE TABLE IF NOT EXISTS phone_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '15 minutes',
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS with no client policies (service role bypasses RLS)
ALTER TABLE phone_verification_tokens ENABLE ROW LEVEL SECURITY;

-- Add performance index
CREATE INDEX IF NOT EXISTS idx_pvt_expires ON phone_verification_tokens(expires_at);

-- Enable pg_cron extension for cleanup
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup every 10 minutes
SELECT cron.schedule('cleanup_phone_verif_tokens', '*/10 * * * *',
$$
DELETE FROM phone_verification_tokens
WHERE used_at IS NOT NULL OR expires_at < now();
$$);

-- Create atomic consume function
CREATE OR REPLACE FUNCTION consume_phone_verification_token(p_token_hash text)
RETURNS TABLE (user_id uuid)
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE phone_verification_tokens
     SET used_at = now()
   WHERE token_hash = p_token_hash
     AND used_at IS NULL
     AND expires_at > now()
  RETURNING user_id;
$$;