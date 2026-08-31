-- Door check-in schema: per-occasion check-in state, staff identity, and an
-- append-only audit trail.
--
-- WHY PER-OCCASION STATE
-- The event has two check-in occasions with different and only partly
-- overlapping populations: workshop day (2026-09-10) and conference day
-- (2026-09-11). tickets.checked_in is a single nullable boolean with a single
-- checked_in_at, so it cannot express "attended both days", cannot support
-- day-two re-entry, and cannot be audited per occasion.
--
-- Rather than a (subject, occasion) join table, this adds one nullable
-- timestamp per occasion. That makes the check-in write a single conditional
-- UPDATE (... WHERE checked_in_conference_day_at IS NULL), which is atomic and
-- idempotent on its own -- no row lock, no read-modify-write, and no lost
-- update. It also keeps the door's hot path free of a join.
--
-- workshop_registrations needs no equivalent: a workshop happens once, so its
-- existing checked_in/checked_in_at pair is already correct. It only gains an
-- actor column.
--
-- The legacy tickets.checked_in / checked_in_at columns are left in place and
-- are kept in sync by the check-in function (added in a follow-up migration),
-- so existing readers keep working.
--
-- WHY GOODIE HANDOVER IS KEYED ON THE TICKET
-- Goodie entitlement derives from holding a conference ticket: workshop-only
-- attendees are not entitled to one. A person holding both a ticket and a
-- workshop seat has exactly one ticket, so keying handover on tickets.id makes
-- "two lanes both hand over a bag" impossible without any cross-subject
-- uniqueness machinery.

BEGIN;

-- ============================================
-- Staff identity
-- ============================================

-- Deliberately a new table rather than an extension of volunteer_profiles:
-- that table set is public recruitment content (job postings, applications)
-- with no user_id column and no RLS, so it is not a usable authorization
-- foundation. It is also not profiles.role, which is unused dead code whose
-- enum has no door-relevant values.
CREATE TABLE IF NOT EXISTS public.checkin_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'scanner',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invited_by TEXT,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT checkin_staff_role_valid
    CHECK (role IN ('door_lead', 'scanner', 'goodie')),
  -- Emails are stored lowercased so the allow-list lookup is exact rather than
  -- relying on a case-insensitive match at every call site.
  CONSTRAINT checkin_staff_email_lowercase CHECK (email = lower(email))
);

COMMENT ON TABLE public.checkin_staff IS 'Allow-list of door check-in staff. Seeded from the admin panel, one row per volunteer.';
COMMENT ON COLUMN public.checkin_staff.email IS 'Invited address, lowercased. Matched against the authenticated session email at login.';
COMMENT ON COLUMN public.checkin_staff.user_id IS 'Supabase auth user, stamped when the invitation is accepted. NULL until then.';
COMMENT ON COLUMN public.checkin_staff.role IS 'door_lead (full, includes the problem desk) | scanner (check in) | goodie (hand over swag)';
COMMENT ON COLUMN public.checkin_staff.is_active IS 'Revocation switch. Consulted on every door action, so clearing it removes access immediately.';
COMMENT ON COLUMN public.checkin_staff.invited_by IS 'Who issued the invitation. Free text -- the admin session carries no identity.';
COMMENT ON COLUMN public.checkin_staff.accepted_at IS 'When the invitee first authenticated. NULL means the invitation is outstanding.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_checkin_staff_email
  ON public.checkin_staff (email);

-- One staff row per auth user, so a single login cannot hold two roles.
CREATE UNIQUE INDEX IF NOT EXISTS uq_checkin_staff_user_id
  ON public.checkin_staff (user_id)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.checkin_staff ENABLE ROW LEVEL SECURITY;

-- Reset grants declaratively so the outcome does not depend on prior state.
REVOKE ALL ON TABLE public.checkin_staff FROM anon;
REVOKE ALL ON TABLE public.checkin_staff FROM authenticated;
GRANT ALL ON TABLE public.checkin_staff TO service_role;

-- No policies for anon or authenticated, and deliberately NO update-own policy.
-- cfp_reviewers has one (cfp_reviewers_update_own, FOR UPDATE TO authenticated)
-- with no column-scoped GRANT, which combined with Supabase's default
-- GRANT ALL to authenticated appears to let a reviewer promote themselves.
-- Writes here go exclusively through the service-role client behind the
-- application guard, so is_active stays a switch a scanner cannot flip.

-- ============================================
-- Per-occasion check-in state
-- ============================================

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS checked_in_workshop_day_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_in_workshop_day_by UUID
    REFERENCES public.checkin_staff(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS checked_in_conference_day_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_in_conference_day_by UUID
    REFERENCES public.checkin_staff(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS goodie_handed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS goodie_handed_by UUID
    REFERENCES public.checkin_staff(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS goodie_note TEXT,
  ADD COLUMN IF NOT EXISTS door_note TEXT;

COMMENT ON COLUMN public.tickets.checked_in_workshop_day_at IS 'Arrival on workshop day (2026-09-10). NULL means not yet checked in for that occasion.';
COMMENT ON COLUMN public.tickets.checked_in_conference_day_at IS 'Arrival on conference day (2026-09-11). Independent of workshop day, so day-two re-entry is a fresh check-in rather than a duplicate.';
COMMENT ON COLUMN public.tickets.goodie_handed_at IS 'When the goodie bag was physically handed over. Separate from check-in because it happens at a different table -- splitting the two removes roughly 3.5s from door service time.';
COMMENT ON COLUMN public.tickets.goodie_note IS 'Free text for a partial handover, e.g. t-shirt given but hoodie out of stock.';
COMMENT ON COLUMN public.tickets.door_note IS 'Free text a volunteer can leave on an attendee. No structured dietary or accessibility data is collected at checkout, so this is the only place such a note can live.';

-- Actor for the existing single-occasion workshop check-in.
ALTER TABLE public.workshop_registrations
  ADD COLUMN IF NOT EXISTS checked_in_by UUID
    REFERENCES public.checkin_staff(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.workshop_registrations.checked_in_by IS 'Staff member who checked in this seat. A workshop happens once, so the existing checked_in/checked_in_at pair needs no occasion dimension.';

-- ============================================
-- Append-only audit trail
-- ============================================

CREATE TABLE IF NOT EXISTS public.door_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  occasion TEXT NOT NULL,
  outcome TEXT NOT NULL,

  -- Two nullable subject references rather than a polymorphic pair, because a
  -- workshop registration may have no ticket at all (workshop-only attendees
  -- have ticket_id IS NULL), so a ticket_id-only foreign key would be wrong.
  -- ON DELETE SET NULL, never CASCADE: erasing an attendee must de-identify
  -- the audit row, not destroy the record of what a volunteer did. That is
  -- also the correct answer to an erasure request.
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE SET NULL,
  workshop_registration_id UUID REFERENCES public.workshop_registrations(id) ON DELETE SET NULL,

  staff_id UUID REFERENCES public.checkin_staff(id) ON DELETE SET NULL,
  -- Denormalised actor snapshot. NOT NULL so the row can always answer "who
  -- did this" even after the staff row is removed, and so the role reflects
  -- what it was at the time rather than what it is now.
  staff_email TEXT NOT NULL,
  staff_role TEXT NOT NULL,

  station TEXT,

  -- Both times are recorded because a station may accept a check-in while
  -- offline and sync later: occurred_at is the client's claim, recorded_at is
  -- the server's. Reports use recorded_at unless they explicitly want the
  -- former, and the pair makes clock skew visible instead of silent.
  occurred_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  failure_reason TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- TEXT + CHECK rather than an enum: ALTER TYPE ... ADD VALUE cannot run
  -- inside a transaction and needs its own migration file, and this is the
  -- column most likely to grow during conference week.
  CONSTRAINT door_events_event_type_valid CHECK (event_type IN (
    'checked_in',
    'check_in_undone',
    'goodie_handed',
    'manual_admit',
    'denied'
  )),
  CONSTRAINT door_events_occasion_valid
    CHECK (occasion IN ('workshop_day', 'conference_day')),
  CONSTRAINT door_events_outcome_valid
    CHECK (outcome IN ('applied', 'duplicate', 'denied', 'not_found')),
  -- A denial must say why; anything else must not invent a reason.
  CONSTRAINT door_events_failure_reason_presence CHECK (
    (outcome IN ('denied', 'not_found')) = (failure_reason IS NOT NULL)
  )
);

COMMENT ON TABLE public.door_events IS 'Append-only audit trail of door actions. UPDATE and DELETE are revoked and trigger-blocked. Retention is at least six months.';
COMMENT ON COLUMN public.door_events.event_type IS 'checked_in | check_in_undone | goodie_handed | manual_admit | denied';
COMMENT ON COLUMN public.door_events.outcome IS 'applied (state changed) | duplicate (already in that state) | denied (refused) | not_found (unknown subject)';
COMMENT ON COLUMN public.door_events.occasion IS 'Which check-in occasion. Derived server-side, never taken from the client -- a device with a wrong date would otherwise write the wrong day into a table that cannot be corrected.';
COMMENT ON COLUMN public.door_events.ticket_id IS 'Subject when the scan resolved to a conference ticket. NULL for a workshop-only attendee.';
COMMENT ON COLUMN public.door_events.workshop_registration_id IS 'Subject when the scan resolved to a workshop seat.';
COMMENT ON COLUMN public.door_events.staff_email IS 'Actor snapshot, retained if the staff row is later removed.';
COMMENT ON COLUMN public.door_events.staff_role IS 'The actor role at the time of the action, not the current one.';
COMMENT ON COLUMN public.door_events.station IS 'Which lane or device, e.g. "lane-2". Free text supplied by the station.';
COMMENT ON COLUMN public.door_events.occurred_at IS 'When the action happened according to the station, which may be earlier than recorded_at if it was queued offline.';
COMMENT ON COLUMN public.door_events.recorded_at IS 'When the server committed the row. Authoritative for ordering.';
COMMENT ON COLUMN public.door_events.metadata IS 'Long-tail context. Must never contain PII beyond the actor snapshot, credentials, or tokens.';

CREATE INDEX IF NOT EXISTS idx_door_events_ticket
  ON public.door_events (ticket_id) WHERE ticket_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_door_events_registration
  ON public.door_events (workshop_registration_id) WHERE workshop_registration_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_door_events_staff
  ON public.door_events (staff_id);
CREATE INDEX IF NOT EXISTS idx_door_events_recorded_at
  ON public.door_events (recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_door_events_type
  ON public.door_events (event_type);

ALTER TABLE public.door_events ENABLE ROW LEVEL SECURITY;

-- RLS alone cannot make this append-only: service_role bypasses row security
-- but NOT table privileges, and every admin route in this repo uses the
-- service-role client. So the grants are the real control.
REVOKE ALL ON TABLE public.door_events FROM anon;
REVOKE ALL ON TABLE public.door_events FROM authenticated;
REVOKE ALL ON TABLE public.door_events FROM service_role;
GRANT SELECT, INSERT ON TABLE public.door_events TO service_role;

-- Third layer, so even a privilege change cannot quietly make the log mutable.
-- SECURITY DEFINER functions that legitimately need to prune must disable this
-- trigger explicitly in their own migration, which is the right amount of
-- friction for an audit table.
--
-- The UPDATE branch has one deliberate exception. Postgres implements
-- ON DELETE SET NULL as an internal UPDATE on the referencing table, so a
-- blanket UPDATE block would make it impossible to delete a ticket or a staff
-- member that has audit rows -- defeating the de-identification the SET NULL
-- is there to provide, and blocking an erasure request outright.
--
-- So an UPDATE is permitted only when it does exactly what a foreign key would
-- do: null out one or more subject/actor references while leaving every other
-- column untouched. Changing a reference to a DIFFERENT value, or editing any
-- content column, is still rejected.
CREATE OR REPLACE FUNCTION public.door_events_reject_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (
      -- every content column identical
      NEW.id, NEW.event_type, NEW.occasion, NEW.outcome,
      NEW.staff_email, NEW.staff_role, NEW.station,
      NEW.occurred_at, NEW.recorded_at,
      NEW.failure_reason, NEW.notes, NEW.metadata
    ) IS NOT DISTINCT FROM (
      OLD.id, OLD.event_type, OLD.occasion, OLD.outcome,
      OLD.staff_email, OLD.staff_role, OLD.station,
      OLD.occurred_at, OLD.recorded_at,
      OLD.failure_reason, OLD.notes, OLD.metadata
    )
      -- and each reference is either unchanged or cleared, never repointed
      AND (NEW.ticket_id IS NULL
           OR NEW.ticket_id IS NOT DISTINCT FROM OLD.ticket_id)
      AND (NEW.workshop_registration_id IS NULL
           OR NEW.workshop_registration_id IS NOT DISTINCT FROM OLD.workshop_registration_id)
      AND (NEW.staff_id IS NULL
           OR NEW.staff_id IS NOT DISTINCT FROM OLD.staff_id)
    THEN
      RETURN NEW;
    END IF;
  END IF;

  RAISE EXCEPTION 'door_events is append-only: % is not permitted', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;

COMMENT ON FUNCTION public.door_events_reject_mutation() IS 'Keeps door_events append-only. Rejects DELETE and TRUNCATE outright, and rejects any UPDATE except the reference-clearing one a foreign key performs on ON DELETE SET NULL.';

DROP TRIGGER IF EXISTS door_events_no_update ON public.door_events;
CREATE TRIGGER door_events_no_update
  BEFORE UPDATE ON public.door_events
  FOR EACH ROW EXECUTE FUNCTION public.door_events_reject_mutation();

DROP TRIGGER IF EXISTS door_events_no_delete ON public.door_events;
CREATE TRIGGER door_events_no_delete
  BEFORE DELETE ON public.door_events
  FOR EACH ROW EXECUTE FUNCTION public.door_events_reject_mutation();

DROP TRIGGER IF EXISTS door_events_no_truncate ON public.door_events;
CREATE TRIGGER door_events_no_truncate
  BEFORE TRUNCATE ON public.door_events
  FOR EACH STATEMENT EXECUTE FUNCTION public.door_events_reject_mutation();

-- ============================================
-- Indexes for door-time lookups
-- ============================================

-- No index anywhere supported case-insensitive email lookup. This also
-- accelerates the existing attendee RLS policies on tickets, which are written
-- lower(email) = lower(auth.jwt() ->> 'email') and sequential-scan today --
-- a win unrelated to the door.
CREATE INDEX IF NOT EXISTS idx_tickets_lower_email
  ON public.tickets (lower(email));

CREATE INDEX IF NOT EXISTS idx_workshop_registrations_lower_email
  ON public.workshop_registrations (lower(email))
  WHERE email IS NOT NULL;

-- The foreign key had no index at all, and the door joins seats to tickets on
-- it. Partial because workshop-only seats have no ticket.
CREATE INDEX IF NOT EXISTS idx_workshop_registrations_ticket_id
  ON public.workshop_registrations (ticket_id)
  WHERE ticket_id IS NOT NULL;

COMMIT;
