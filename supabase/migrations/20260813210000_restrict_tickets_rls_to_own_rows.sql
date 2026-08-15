-- Restrict RLS on tickets to own-row access.
--
-- 20260813180833_extend_rls_ticket_table.sql created "tickets_authenticated_full_access"
-- as FOR ALL TO authenticated USING (true) WITH CHECK (true), letting any logged-in user
-- read and modify every ticket row (attendee PII, Stripe identifiers, amounts, check-in
-- state) and self-issue tickets via the insert grant.
--
-- Attendees now see and edit only their own tickets. Ticket creation stays exclusive to the
-- Stripe webhook, and admin routes keep using the service-role client, which bypasses RLS --
-- neither needs a policy here.

BEGIN;

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Reset grants declaratively so the outcome does not depend on prior state.
REVOKE ALL ON TABLE public.tickets FROM anon;
REVOKE ALL ON TABLE public.tickets FROM authenticated;

GRANT SELECT ON TABLE public.tickets TO authenticated;
-- Column-scoped: attendee-editable identity and badge details only. Postgres enforces column
-- privileges independently of RLS, so this blocks self-upgrade (ticket_type, amount_paid,
-- status, checked_in, coupon_code, user_id) even though the row itself is theirs.
GRANT UPDATE (first_name, last_name, company, job_title, email) ON TABLE public.tickets TO authenticated;

GRANT ALL ON TABLE public.tickets TO service_role;

DROP POLICY IF EXISTS "tickets_authenticated_full_access" ON public.tickets;
DROP POLICY IF EXISTS "tickets_select_own" ON public.tickets;
DROP POLICY IF EXISTS "tickets_update_own" ON public.tickets;

CREATE POLICY "tickets_select_own"
  ON public.tickets FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR lower(email) = lower((SELECT auth.jwt() ->> 'email'))
  );

CREATE POLICY "tickets_update_own"
  ON public.tickets FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR lower(email) = lower((SELECT auth.jwt() ->> 'email'))
  )
  -- Ownership is checked against the existing row by USING. The new row may contain a
  -- different email so guest tickets (whose user_id is NULL) can be transferred.
  -- Column privileges above still limit the fields the attendee can change.
  WITH CHECK (TRUE);

COMMIT;
