-- Remove duplicate indexes to improve performance
-- Handle constraints properly

-- journal_entries: Drop the less descriptive duplicate index
DROP INDEX IF EXISTS idx_journal_entries_user_date;
-- Keep: idx_journal_entries_user_id_entry_date

-- profiles: Drop the duplicate constraint and keep our partial index
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_phone_number_key;
-- Keep: idx_profiles_phone_number (partial index WHERE phone_number IS NOT NULL)

-- sms_messages: Drop the less descriptive duplicate index
DROP INDEX IF EXISTS idx_sms_messages_user_date;  
-- Keep: idx_sms_messages_user_id_entry_date