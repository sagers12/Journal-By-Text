-- Add fields for message length tracking and truncation handling
ALTER TABLE public.sms_messages 
ADD COLUMN char_count integer,
ADD COLUMN byte_count integer,
ADD COLUMN truncated boolean DEFAULT false;

-- Create audit table for oversized messages
CREATE TABLE public.oversized_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  surge_message_id text,
  phone_number text NOT NULL,
  original_content text NOT NULL,
  char_count integer NOT NULL,
  byte_count integer NOT NULL,
  user_id uuid,
  entry_date date NOT NULL,
  received_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on oversized_messages table  
ALTER TABLE public.oversized_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for oversized_messages (admin access only for audit)
CREATE POLICY "Block client access to oversized_messages"
ON public.oversized_messages
FOR ALL
TO public
USING (false)
WITH CHECK (false);

-- Confirm sms_messages.message_content is TEXT type (unbounded)
-- This is just a verification - TEXT columns in Postgres are already unbounded