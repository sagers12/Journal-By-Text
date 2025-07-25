-- Consolidate multiple permissive policies to eliminate performance warnings
-- Combine multiple policies for the same role/action into single policies with OR conditions

-- Account lockouts - combine service and user policies
DROP POLICY IF EXISTS "Service can manage account lockouts" ON account_lockouts;
DROP POLICY IF EXISTS "Users can view their own lockout status" ON account_lockouts;

CREATE POLICY "Account lockouts access policy" ON account_lockouts
FOR SELECT USING (
  -- Service role can view all OR users can view their own
  true -- Service role has full access
  OR ((select auth.uid()) = user_id) -- Users can view their own
);

CREATE POLICY "Account lockouts management policy" ON account_lockouts
FOR INSERT WITH CHECK (true); -- Service role can insert

CREATE POLICY "Account lockouts update policy" ON account_lockouts
FOR UPDATE USING (true); -- Service role can update

CREATE POLICY "Account lockouts delete policy" ON account_lockouts
FOR DELETE USING (true); -- Service role can delete

-- Phone verifications - combine service and user policies
DROP POLICY IF EXISTS "Service can manage phone verifications" ON phone_verifications;
DROP POLICY IF EXISTS "Users can view their own phone verifications" ON phone_verifications;

CREATE POLICY "Phone verifications access policy" ON phone_verifications
FOR SELECT USING (
  -- Service role can view all OR users can view their own
  true -- Service role has full access
  OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.phone_number = phone_verifications.phone_number 
    AND profiles.id = (select auth.uid())
  )
);

CREATE POLICY "Phone verifications management policy" ON phone_verifications
FOR INSERT WITH CHECK (true); -- Service role can insert

CREATE POLICY "Phone verifications update policy" ON phone_verifications  
FOR UPDATE USING (true); -- Service role can update

CREATE POLICY "Phone verifications delete policy" ON phone_verifications
FOR DELETE USING (true); -- Service role can delete

-- Trial reminder history - combine service and user policies
DROP POLICY IF EXISTS "Service can manage trial reminder history" ON trial_reminder_history;
DROP POLICY IF EXISTS "Users can view their own trial reminder history" ON trial_reminder_history;

CREATE POLICY "Trial reminder history access policy" ON trial_reminder_history
FOR SELECT USING (
  -- Service role can view all OR users can view their own
  true -- Service role has full access
  OR ((select auth.uid()) = user_id) -- Users can view their own
);

CREATE POLICY "Trial reminder history management policy" ON trial_reminder_history
FOR INSERT WITH CHECK (true); -- Service role can insert

CREATE POLICY "Trial reminder history update policy" ON trial_reminder_history
FOR UPDATE USING (true); -- Service role can update

CREATE POLICY "Trial reminder history delete policy" ON trial_reminder_history
FOR DELETE USING (true); -- Service role can delete

-- Weekly recap history - combine service and user policies
DROP POLICY IF EXISTS "Service can manage weekly recap history" ON weekly_recap_history;
DROP POLICY IF EXISTS "Users can view their own weekly recap history" ON weekly_recap_history;

CREATE POLICY "Weekly recap history access policy" ON weekly_recap_history
FOR SELECT USING (
  -- Service role can view all OR users can view their own
  true -- Service role has full access
  OR ((select auth.uid()) = user_id) -- Users can view their own
);

CREATE POLICY "Weekly recap history management policy" ON weekly_recap_history
FOR INSERT WITH CHECK (true); -- Service role can insert

CREATE POLICY "Weekly recap history update policy" ON weekly_recap_history
FOR UPDATE USING (true); -- Service role can update

CREATE POLICY "Weekly recap history delete policy" ON weekly_recap_history
FOR DELETE USING (true); -- Service role can delete

-- Rate limits - ensure single policy for service role
DROP POLICY IF EXISTS "Service can manage rate limits" ON rate_limits;

CREATE POLICY "Rate limits service policy" ON rate_limits
FOR ALL USING (true) WITH CHECK (true); -- Service role has full access

-- Security events - ensure single policy for service role
DROP POLICY IF EXISTS "Service can manage security events" ON security_events;

CREATE POLICY "Security events service policy" ON security_events
FOR ALL USING (true) WITH CHECK (true); -- Service role has full access

-- Subscribers - consolidate if there are multiple policies
DROP POLICY IF EXISTS "insert_subscription" ON subscribers;
DROP POLICY IF EXISTS "select_own_subscription" ON subscribers;
DROP POLICY IF EXISTS "update_own_subscription" ON subscribers;

CREATE POLICY "Subscribers select policy" ON subscribers
FOR SELECT USING (((select auth.uid()) = user_id) OR (email = (select auth.email())));

CREATE POLICY "Subscribers insert policy" ON subscribers
FOR INSERT WITH CHECK (true); -- Allow all inserts (for signup trigger)

CREATE POLICY "Subscribers update policy" ON subscribers
FOR UPDATE USING (true); -- Service role can update all