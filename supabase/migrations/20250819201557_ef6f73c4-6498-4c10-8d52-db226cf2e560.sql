-- Create unique index on surge_message_id for idempotent message processing
CREATE UNIQUE INDEX IF NOT EXISTS idx_sms_messages_surge_id 
ON public.sms_messages (surge_message_id) 
WHERE surge_message_id IS NOT NULL;