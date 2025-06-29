
-- Add surge_message_id to sms_messages table for duplicate prevention
ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS surge_message_id TEXT;
ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Create index for faster duplicate checking
CREATE INDEX IF NOT EXISTS idx_sms_messages_surge_id ON sms_messages(surge_message_id);

-- Ensure the storage bucket exists (in case it wasn't created properly)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('journal-photos', 'journal-photos', true)
ON CONFLICT (id) DO NOTHING;
