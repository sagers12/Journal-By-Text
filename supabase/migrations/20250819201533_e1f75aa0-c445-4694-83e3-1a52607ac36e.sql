-- Create unique index on surge_message_id for idempotent message processing
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_sms_messages_surge_id 
ON public.sms_messages (surge_message_id) 
WHERE surge_message_id IS NOT NULL;

-- Add constraint to ensure surge_message_id uniqueness for non-null values
ALTER TABLE public.sms_messages 
ADD CONSTRAINT unique_surge_message_id 
EXCLUDE (surge_message_id WITH =) 
WHERE (surge_message_id IS NOT NULL);