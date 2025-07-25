-- Optimize RLS policies to prevent Auth RLS Initialization Plan warnings
-- Replace auth.uid() with (select auth.uid()) for better performance

-- Drop and recreate all problematic RLS policies with optimized auth function calls

-- Profiles table policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can view their own profile" ON profiles
FOR SELECT USING ((select auth.uid()) = id);

CREATE POLICY "Users can update their own profile" ON profiles
FOR UPDATE USING ((select auth.uid()) = id);

CREATE POLICY "Users can insert their own profile" ON profiles
FOR INSERT WITH CHECK ((select auth.uid()) = id);

-- Journal entries policies
DROP POLICY IF EXISTS "Users can view own entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can view own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can view their own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can create own entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can create own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can create their own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can insert their own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can update own entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can update own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can update their own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can delete own entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can delete own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can delete their own journal entries" ON journal_entries;

CREATE POLICY "Users can view their own journal entries" ON journal_entries
FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own journal entries" ON journal_entries
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own journal entries" ON journal_entries
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own journal entries" ON journal_entries
FOR DELETE USING ((select auth.uid()) = user_id);

-- Journal photos policies
DROP POLICY IF EXISTS "Users can view own entry photos" ON journal_photos;
DROP POLICY IF EXISTS "Users can view own journal photos" ON journal_photos;
DROP POLICY IF EXISTS "Users can view photos for their own entries" ON journal_photos;
DROP POLICY IF EXISTS "Users can view their own journal photos" ON journal_photos;
DROP POLICY IF EXISTS "Users can create own journal photos" ON journal_photos;
DROP POLICY IF EXISTS "Users can create photos for own entries" ON journal_photos;
DROP POLICY IF EXISTS "Users can create their own journal photos" ON journal_photos;
DROP POLICY IF EXISTS "Users can insert photos for their own entries" ON journal_photos;
DROP POLICY IF EXISTS "Users can update photos for their own entries" ON journal_photos;
DROP POLICY IF EXISTS "Users can delete own entry photos" ON journal_photos;
DROP POLICY IF EXISTS "Users can delete own journal photos" ON journal_photos;
DROP POLICY IF EXISTS "Users can delete photos for their own entries" ON journal_photos;
DROP POLICY IF EXISTS "Users can delete their own journal photos" ON journal_photos;

CREATE POLICY "Users can view their own journal photos" ON journal_photos
FOR SELECT USING (EXISTS (
  SELECT 1 FROM journal_entries 
  WHERE journal_entries.id = journal_photos.entry_id 
  AND journal_entries.user_id = (select auth.uid())
));

CREATE POLICY "Users can insert their own journal photos" ON journal_photos
FOR INSERT WITH CHECK (EXISTS (
  SELECT 1 FROM journal_entries 
  WHERE journal_entries.id = journal_photos.entry_id 
  AND journal_entries.user_id = (select auth.uid())
));

CREATE POLICY "Users can update their own journal photos" ON journal_photos
FOR UPDATE USING (EXISTS (
  SELECT 1 FROM journal_entries 
  WHERE journal_entries.id = journal_photos.entry_id 
  AND journal_entries.user_id = (select auth.uid())
));

CREATE POLICY "Users can delete their own journal photos" ON journal_photos
FOR DELETE USING (EXISTS (
  SELECT 1 FROM journal_entries 
  WHERE journal_entries.id = journal_photos.entry_id 
  AND journal_entries.user_id = (select auth.uid())
));

-- SMS messages policies
DROP POLICY IF EXISTS "Users can view own SMS messages" ON sms_messages;
DROP POLICY IF EXISTS "Users can view their own SMS messages" ON sms_messages;
DROP POLICY IF EXISTS "Users can create own SMS messages" ON sms_messages;
DROP POLICY IF EXISTS "Users can create their own SMS messages" ON sms_messages;
DROP POLICY IF EXISTS "Users can insert own SMS messages" ON sms_messages;
DROP POLICY IF EXISTS "Users can insert their own SMS messages" ON sms_messages;
DROP POLICY IF EXISTS "Users can update their own SMS messages" ON sms_messages;
DROP POLICY IF EXISTS "Users can delete their own SMS messages" ON sms_messages;

CREATE POLICY "Users can view their own SMS messages" ON sms_messages
FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own SMS messages" ON sms_messages
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own SMS messages" ON sms_messages
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own SMS messages" ON sms_messages
FOR DELETE USING ((select auth.uid()) = user_id);

-- Phone verifications policies
DROP POLICY IF EXISTS "Users can view their own phone verifications" ON phone_verifications;

CREATE POLICY "Users can view their own phone verifications" ON phone_verifications
FOR SELECT USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.phone_number = phone_verifications.phone_number 
  AND profiles.id = (select auth.uid())
));

-- SMS consents policies
DROP POLICY IF EXISTS "Users can view their own SMS consents" ON sms_consents;
DROP POLICY IF EXISTS "Users can create their own SMS consents" ON sms_consents;

CREATE POLICY "Users can view their own SMS consents" ON sms_consents
FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create their own SMS consents" ON sms_consents
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- User last prompt category policies
DROP POLICY IF EXISTS "Users can view their own last prompt category" ON user_last_prompt_category;
DROP POLICY IF EXISTS "Users can insert their own last prompt category" ON user_last_prompt_category;
DROP POLICY IF EXISTS "Users can update their own last prompt category" ON user_last_prompt_category;

CREATE POLICY "Users can view their own last prompt category" ON user_last_prompt_category
FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own last prompt category" ON user_last_prompt_category
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own last prompt category" ON user_last_prompt_category
FOR UPDATE USING ((select auth.uid()) = user_id);

-- User prompt history policies
DROP POLICY IF EXISTS "Users can view their own prompt history" ON user_prompt_history;
DROP POLICY IF EXISTS "Users can insert their own prompt history" ON user_prompt_history;

CREATE POLICY "Users can view their own prompt history" ON user_prompt_history
FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own prompt history" ON user_prompt_history
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- Subscribers policies
DROP POLICY IF EXISTS "select_own_subscription" ON subscribers;

CREATE POLICY "select_own_subscription" ON subscribers
FOR SELECT USING (((select auth.uid()) = user_id) OR (email = (select auth.email())));

-- Account lockouts policies
DROP POLICY IF EXISTS "Users can view their own lockout status" ON account_lockouts;

CREATE POLICY "Users can view their own lockout status" ON account_lockouts
FOR SELECT USING ((select auth.uid()) = user_id);

-- Trial reminder history policies
DROP POLICY IF EXISTS "Users can view their own trial reminder history" ON trial_reminder_history;

CREATE POLICY "Users can view their own trial reminder history" ON trial_reminder_history
FOR SELECT USING ((select auth.uid()) = user_id);

-- Weekly recap history policies
DROP POLICY IF EXISTS "Users can view their own weekly recap history" ON weekly_recap_history;

CREATE POLICY "Users can view their own weekly recap history" ON weekly_recap_history
FOR SELECT USING ((select auth.uid()) = user_id);

-- Journal prompts policies (already optimized, but ensuring it uses subquery)
DROP POLICY IF EXISTS "Authenticated users can view active prompts" ON journal_prompts;

CREATE POLICY "Authenticated users can view active prompts" ON journal_prompts
FOR SELECT USING (((select auth.uid()) IS NOT NULL) AND (is_active = true));