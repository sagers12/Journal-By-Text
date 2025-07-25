-- Remove duplicate indexes to improve performance
-- Keep the more descriptively named indexes and drop the duplicates

-- journal_entries: Drop the less descriptive duplicate
DROP INDEX IF EXISTS idx_journal_entries_user_date;
-- Keep: idx_journal_entries_user_id_entry_date

-- profiles: Drop the auto-generated key, keep the unique constraint
DROP INDEX IF EXISTS profiles_phone_number_key;
-- Keep: profiles_phone_number_unique (which is idx_profiles_phone_number)

-- sms_messages: Drop the less descriptive duplicate  
DROP INDEX IF EXISTS idx_sms_messages_user_date;
-- Keep: idx_sms_messages_user_id_entry_date

-- Verify we have the essential indexes we need and no duplicates
-- These should remain:
-- - idx_journal_entries_user_id_entry_date (user_id, entry_date)
-- - idx_profiles_phone_number (phone_number) WHERE phone_number IS NOT NULL
-- - idx_sms_messages_user_id_entry_date (user_id, entry_date)
-- - idx_sms_messages_entry_id (entry_id) 
-- - idx_subscribers_user_id (user_id)