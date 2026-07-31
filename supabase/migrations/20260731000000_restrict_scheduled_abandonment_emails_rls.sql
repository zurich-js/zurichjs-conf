-- Restrict RLS on scheduled_abandonment_emails.
--
-- The original policy ("Service role full access") specified no role and used
-- USING (true) WITH CHECK (true), which granted anon/authenticated clients
-- full read/write on the table — exposing customer email addresses to
-- enumeration. The service role bypasses RLS entirely and needs no policy,
-- so dropping the policy (with RLS still enabled) denies everything except
-- service-role access.

BEGIN;

DROP POLICY IF EXISTS "Service role full access" ON scheduled_abandonment_emails;

COMMIT;
