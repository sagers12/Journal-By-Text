-- Add missing foreign key indexes for performance optimization

-- Index for sms_messages.entry_id foreign key
CREATE INDEX IF NOT EXISTS idx_sms_messages_entry_id ON sms_messages(entry_id);

-- Index for subscribers.user_id foreign key  
CREATE INDEX IF NOT EXISTS idx_subscribers_user_id ON subscribers(user_id);

-- Additional performance indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_sms_messages_user_id_entry_date ON sms_messages(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id_entry_date ON journal_entries(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON profiles(phone_number) WHERE phone_number IS NOT NULL;