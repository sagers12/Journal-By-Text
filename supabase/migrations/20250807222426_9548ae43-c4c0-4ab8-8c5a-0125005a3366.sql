-- Security hardening: restrict client access to sensitive service tables (public schema only)

-- rate_limits
drop policy if exists "Rate limits service policy" on public.rate_limits;
create policy "Rate limits - block clients" on public.rate_limits
for all to authenticated
using (false)
with check (false);

-- security_events
drop policy if exists "Security events service policy" on public.security_events;
create policy "Security events - block clients" on public.security_events
for all to authenticated
using (false)
with check (false);

-- account_lockouts
drop policy if exists "Account lockouts access policy" on public.account_lockouts;
drop policy if exists "Account lockouts management policy" on public.account_lockouts;
drop policy if exists "Account lockouts update policy" on public.account_lockouts;
drop policy if exists "Account lockouts delete policy" on public.account_lockouts;
create policy "Account lockouts - block clients" on public.account_lockouts
for all to authenticated
using (false)
with check (false);

-- phone_verifications (only allow select for the owner; block mutations)
drop policy if exists "Phone verifications access policy" on public.phone_verifications;
drop policy if exists "Phone verifications management policy" on public.phone_verifications;
drop policy if exists "Phone verifications update policy" on public.phone_verifications;
drop policy if exists "Phone verifications delete policy" on public.phone_verifications;

create policy "Phone verifications - select own" on public.phone_verifications
for select to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.phone_number = phone_verifications.phone_number
      and profiles.id = auth.uid()
  )
);

create policy "Phone verifications - block mutations" on public.phone_verifications
for all to authenticated
using (false)
with check (false);

-- subscribers (block client insert/update; keep existing select policy)
drop policy if exists "Subscribers insert policy" on public.subscribers;
drop policy if exists "Subscribers update policy" on public.subscribers;

create policy "Subscribers - block client insert" on public.subscribers
for insert to authenticated
with check (false);

create policy "Subscribers - block client update" on public.subscribers
for update to authenticated
using (false)
with check (false);

-- trial_reminder_history
drop policy if exists "Trial reminder history access policy" on public.trial_reminder_history;
drop policy if exists "Trial reminder history management policy" on public.trial_reminder_history;
drop policy if exists "Trial reminder history update policy" on public.trial_reminder_history;
drop policy if exists "Trial reminder history delete policy" on public.trial_reminder_history;
create policy "Trial reminder history - block clients" on public.trial_reminder_history
for all to authenticated
using (false)
with check (false);

-- weekly_recap_history
drop policy if exists "Weekly recap history access policy" on public.weekly_recap_history;
drop policy if exists "Weekly recap history management policy" on public.weekly_recap_history;
drop policy if exists "Weekly recap history update policy" on public.weekly_recap_history;
drop policy if exists "Weekly recap history delete policy" on public.weekly_recap_history;
create policy "Weekly recap history - block clients" on public.weekly_recap_history
for all to authenticated
using (false)
with check (false);