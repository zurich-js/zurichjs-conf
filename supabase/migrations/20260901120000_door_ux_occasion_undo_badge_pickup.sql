-- Door UX round two: staff-chosen occasion, undo, per-item goodie handover,
-- early badge pickup, per-volunteer scan counts, and an admin-only delete path
-- for door_events.
--
-- WHY THE OCCASION IS NOW ACCEPTED FROM THE API
-- The original design derived the occasion exclusively from the server clock so
-- a phone with a wrong date could not mislabel an audit row. That protection
-- stays: the CLIENT still never decides by itself — the API validates the value
-- against the two known occasions and the volunteer picks it deliberately on
-- the start screen. What changed is the requirement: badges are picked up and
-- workshops rehearsed on other days, so a lead must be able to say "I am
-- checking people in FOR the workshop day" on a day that is not the workshop
-- day. An invalid value still falls back to the server-derived occasion rather
-- than erroring, so a stale client cannot wedge the door.
--
-- WHY UNDO EXISTS
-- A mis-scan at a queue is routine: the volunteer admits the wrong person of a
-- pair, or taps check-in on the person's second badge. Without an undo the
-- roster keeps the wrong arrival forever and the audit trail cannot explain
-- it. door_check_in_undo clears the per-occasion timestamp and writes a
-- `check_in_undone` audit row — the trail records both the mistake and the
-- correction, which is what an append-only log is for.
--
-- WHY BADGE PICKUP IS AN EVENT AND NOT A TICKET COLUMN
-- Early pickup on the community day (2026-09-09) must not consume the workshop
-- day check-in — the attendee still arrives the next morning. Pickup state
-- lives in door_events itself (EXISTS on the applied badge_pickup row), so it
-- needs no new ticket column and stays consistent with the audit trail by
-- construction.

BEGIN;

-- ============================================
-- Event-type vocabulary
-- ============================================

ALTER TABLE public.door_events
  DROP CONSTRAINT IF EXISTS door_events_event_type_valid;
ALTER TABLE public.door_events
  ADD CONSTRAINT door_events_event_type_valid CHECK (event_type IN (
    'checked_in',
    'check_in_undone',
    'goodie_handed',
    'manual_admit',
    'badge_pickup',
    'denied'
  ));

COMMENT ON COLUMN public.door_events.event_type IS 'checked_in | check_in_undone | goodie_handed | manual_admit | badge_pickup | denied';

-- Badge pickup state is answered from this table (see door_badge_pickup), so
-- the lookup "has this ticket picked up a badge" must be an index hit.
CREATE INDEX IF NOT EXISTS idx_door_events_badge_pickup_ticket
  ON public.door_events (ticket_id)
  WHERE event_type = 'badge_pickup' AND outcome = 'applied' AND ticket_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_door_events_badge_pickup_registration
  ON public.door_events (workshop_registration_id)
  WHERE event_type = 'badge_pickup' AND outcome = 'applied'
    AND workshop_registration_id IS NOT NULL;

-- ============================================
-- Occasion resolution
-- ============================================

-- COALESCE with validation: an explicit, known occasion wins; anything else —
-- NULL from an older client, or garbage — falls back to the server clock. This
-- is what keeps "the client cannot corrupt the audit trail" true while letting
-- a volunteer deliberately work the other day.
CREATE OR REPLACE FUNCTION public.door_occasion_or_current(p_occasion TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_occasion IN ('workshop_day', 'conference_day') THEN p_occasion
    ELSE public.door_current_occasion()
  END;
$$;

COMMENT ON FUNCTION public.door_occasion_or_current(TEXT) IS 'The staff-chosen occasion when it is one of the known two, otherwise the server-derived current occasion. The fallback is what keeps a stale or buggy client from writing an unknown day into door_events.';

-- ============================================
-- Check in (adds p_occasion)
-- ============================================

-- Appending a defaulted parameter changes the signature, and CREATE OR REPLACE
-- would leave the old five-parameter overload behind — two functions PostgREST
-- could no longer disambiguate. Drop the old signature explicitly.
DROP FUNCTION IF EXISTS public.door_check_in(UUID, UUID, TEXT, TIMESTAMPTZ, BOOLEAN, TEXT);

CREATE FUNCTION public.door_check_in(
  p_scanned_id  UUID,
  p_staff_id    UUID,
  p_station     TEXT DEFAULT NULL,
  p_occurred_at TIMESTAMPTZ DEFAULT NULL,
  p_manual      BOOLEAN DEFAULT FALSE,
  p_reason      TEXT DEFAULT NULL,
  p_occasion    TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_staff       public.checkin_staff;
  v_occasion    TEXT := public.door_occasion_or_current(p_occasion);
  v_occurred    TIMESTAMPTZ := COALESCE(p_occurred_at, NOW());
  v_ticket      public.tickets;
  v_reg         public.workshop_registrations;
  v_updated     INT := 0;
  v_kind        TEXT;
  v_outcome     TEXT;
  v_failure     TEXT;
  v_event       TEXT;
BEGIN
  -- A queued offline action must not claim to have happened in the future, and
  -- must not predate the event. Clamp rather than reject, so a device with a
  -- skewed clock still records the check-in.
  IF v_occurred > NOW() THEN v_occurred := NOW(); END IF;

  SELECT * INTO v_staff FROM public.checkin_staff
    WHERE id = p_staff_id AND is_active;

  IF NOT FOUND THEN
    -- No audit row: with no active staff row there is no actor to attribute
    -- one to, and staff_email is NOT NULL by design.
    RETURN jsonb_build_object('outcome', 'denied', 'failureReason', 'staff_not_active');
  END IF;

  v_event := CASE WHEN p_manual THEN 'manual_admit' ELSE 'checked_in' END;

  -- Only a lead may admit someone without a working QR, and the reason is
  -- mandatory -- a manual admission that records no reason is indistinguishable
  -- from a mistake when it is reviewed later.
  IF p_manual AND (v_staff.role <> 'door_lead' OR p_reason IS NULL) THEN
    v_failure := CASE
      WHEN v_staff.role <> 'door_lead' THEN 'manual_admit_requires_lead'
      ELSE 'manual_admit_requires_reason'
    END;
    INSERT INTO public.door_events (event_type, occasion, outcome, staff_id,
      staff_email, staff_role, station, occurred_at, failure_reason)
    VALUES ('denied', v_occasion, 'denied', v_staff.id, v_staff.email,
      v_staff.role, p_station, v_occurred, v_failure);
    RETURN jsonb_build_object('outcome', 'denied', 'failureReason', v_failure);
  END IF;

  -- A goodie-only volunteer may not admit anyone.
  IF v_staff.role = 'goodie' THEN
    INSERT INTO public.door_events (event_type, occasion, outcome, staff_id,
      staff_email, staff_role, station, occurred_at, failure_reason)
    VALUES ('denied', v_occasion, 'denied', v_staff.id, v_staff.email,
      v_staff.role, p_station, v_occurred, 'role_may_not_check_in');
    RETURN jsonb_build_object('outcome', 'denied', 'failureReason', 'role_may_not_check_in');
  END IF;

  SELECT * INTO v_ticket FROM public.tickets WHERE id = p_scanned_id;

  IF FOUND THEN
    v_kind := 'ticket';

    IF v_ticket.status <> 'confirmed' THEN
      INSERT INTO public.door_events (event_type, occasion, outcome, ticket_id,
        staff_id, staff_email, staff_role, station, occurred_at, failure_reason)
      VALUES ('denied', v_occasion, 'denied', v_ticket.id, v_staff.id,
        v_staff.email, v_staff.role, p_station, v_occurred,
        'ticket_' || v_ticket.status::text);
      RETURN jsonb_build_object('outcome', 'denied',
        'failureReason', 'ticket_' || v_ticket.status::text);
    END IF;

    -- The conditional guard IS the mutual exclusion. Two stations racing the
    -- same scan both run this; exactly one matches a row, so the arrival time
    -- and actor of the winner are never overwritten.
    IF v_occasion = 'workshop_day' THEN
      UPDATE public.tickets SET
        checked_in_workshop_day_at = v_occurred,
        checked_in_workshop_day_by = v_staff.id,
        -- Legacy columns kept in step so existing readers keep working.
        checked_in = TRUE,
        checked_in_at = COALESCE(checked_in_at, v_occurred),
        updated_at = NOW()
      WHERE id = v_ticket.id AND checked_in_workshop_day_at IS NULL;
    ELSE
      UPDATE public.tickets SET
        checked_in_conference_day_at = v_occurred,
        checked_in_conference_day_by = v_staff.id,
        checked_in = TRUE,
        checked_in_at = COALESCE(checked_in_at, v_occurred),
        updated_at = NOW()
      WHERE id = v_ticket.id AND checked_in_conference_day_at IS NULL;
    END IF;
    GET DIAGNOSTICS v_updated = ROW_COUNT;

  ELSE
    SELECT * INTO v_reg FROM public.workshop_registrations WHERE id = p_scanned_id;

    IF NOT FOUND THEN
      INSERT INTO public.door_events (event_type, occasion, outcome, staff_id,
        staff_email, staff_role, station, occurred_at, failure_reason, metadata)
      VALUES ('denied', v_occasion, 'not_found', v_staff.id, v_staff.email,
        v_staff.role, p_station, v_occurred, 'subject_not_found',
        jsonb_build_object('scannedId', p_scanned_id));
      RETURN jsonb_build_object('outcome', 'not_found', 'failureReason', 'subject_not_found');
    END IF;

    v_kind := 'workshop_registration';

    IF v_reg.status <> 'confirmed' THEN
      INSERT INTO public.door_events (event_type, occasion, outcome,
        workshop_registration_id, staff_id, staff_email, staff_role, station,
        occurred_at, failure_reason)
      VALUES ('denied', v_occasion, 'denied', v_reg.id, v_staff.id,
        v_staff.email, v_staff.role, p_station, v_occurred,
        'registration_' || v_reg.status::text);
      RETURN jsonb_build_object('outcome', 'denied',
        'failureReason', 'registration_' || v_reg.status::text);
    END IF;

    UPDATE public.workshop_registrations SET
      checked_in = TRUE,
      checked_in_at = v_occurred,
      checked_in_by = v_staff.id,
      updated_at = NOW()
    WHERE id = v_reg.id AND checked_in IS NOT TRUE;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
  END IF;

  v_outcome := CASE WHEN v_updated > 0 THEN 'applied' ELSE 'duplicate' END;

  INSERT INTO public.door_events (event_type, occasion, outcome, ticket_id,
    workshop_registration_id, staff_id, staff_email, staff_role, station,
    occurred_at, notes, metadata)
  VALUES (v_event, v_occasion, v_outcome,
    CASE WHEN v_kind = 'ticket' THEN v_ticket.id END,
    CASE WHEN v_kind = 'workshop_registration' THEN v_reg.id END,
    v_staff.id, v_staff.email, v_staff.role, p_station, v_occurred, p_reason,
    jsonb_build_object('subjectKind', v_kind));

  RETURN jsonb_build_object(
    'outcome', v_outcome,
    'occasion', v_occasion,
    'subjectKind', v_kind,
    'alreadyCheckedInAt', CASE
      WHEN v_outcome = 'duplicate' AND v_kind = 'ticket' THEN
        to_jsonb(CASE WHEN v_occasion = 'workshop_day'
          THEN v_ticket.checked_in_workshop_day_at
          ELSE v_ticket.checked_in_conference_day_at END)
      WHEN v_outcome = 'duplicate' THEN to_jsonb(v_reg.checked_in_at)
    END
  );
END;
$$;

COMMENT ON FUNCTION public.door_check_in(UUID, UUID, TEXT, TIMESTAMPTZ, BOOLEAN, TEXT, TEXT) IS 'Authorise, check in and audit in one commit. p_occasion is a validated staff choice; anything else falls back to the server clock. Returns applied | duplicate | denied | not_found so the UI never reports a second success.';

-- ============================================
-- Undo a check-in
-- ============================================

-- The correction path for a mis-scan. Clears the per-occasion arrival and
-- writes a check_in_undone audit row, so the log shows the mistake AND the
-- correction rather than pretending neither happened.
--
-- `duplicate` here means "there was nothing to undo" — the same already-in-the
-- desired-state semantics the other functions use, so the queue can replay an
-- undo safely: the second attempt is a no-op, never a double correction.
CREATE FUNCTION public.door_check_in_undo(
  p_scanned_id  UUID,
  p_staff_id    UUID,
  p_station     TEXT DEFAULT NULL,
  p_occurred_at TIMESTAMPTZ DEFAULT NULL,
  p_reason      TEXT DEFAULT NULL,
  p_occasion    TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_staff    public.checkin_staff;
  v_occasion TEXT := public.door_occasion_or_current(p_occasion);
  v_occurred TIMESTAMPTZ := COALESCE(p_occurred_at, NOW());
  v_ticket   public.tickets;
  v_reg      public.workshop_registrations;
  v_updated  INT := 0;
  v_kind     TEXT;
BEGIN
  IF v_occurred > NOW() THEN v_occurred := NOW(); END IF;

  SELECT * INTO v_staff FROM public.checkin_staff
    WHERE id = p_staff_id AND is_active;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'denied', 'failureReason', 'staff_not_active');
  END IF;

  -- Whoever can check someone in can also un-check them: a mis-scan is fixed
  -- at the lane it happened at, not by fetching a lead. A goodie volunteer can
  -- do neither.
  IF v_staff.role = 'goodie' THEN
    INSERT INTO public.door_events (event_type, occasion, outcome, staff_id,
      staff_email, staff_role, station, occurred_at, failure_reason)
    VALUES ('denied', v_occasion, 'denied', v_staff.id, v_staff.email,
      v_staff.role, p_station, v_occurred, 'role_may_not_check_in');
    RETURN jsonb_build_object('outcome', 'denied', 'failureReason', 'role_may_not_check_in');
  END IF;

  SELECT * INTO v_ticket FROM public.tickets WHERE id = p_scanned_id;

  IF FOUND THEN
    v_kind := 'ticket';

    -- Clear only the column for the occasion being worked, and keep the legacy
    -- pair honest: checked_in stays true while the OTHER day still holds an
    -- arrival, and checked_in_at follows it.
    IF v_occasion = 'workshop_day' THEN
      UPDATE public.tickets SET
        checked_in_workshop_day_at = NULL,
        checked_in_workshop_day_by = NULL,
        checked_in = (checked_in_conference_day_at IS NOT NULL),
        checked_in_at = checked_in_conference_day_at,
        updated_at = NOW()
      WHERE id = v_ticket.id AND checked_in_workshop_day_at IS NOT NULL;
    ELSE
      UPDATE public.tickets SET
        checked_in_conference_day_at = NULL,
        checked_in_conference_day_by = NULL,
        checked_in = (checked_in_workshop_day_at IS NOT NULL),
        checked_in_at = checked_in_workshop_day_at,
        updated_at = NOW()
      WHERE id = v_ticket.id AND checked_in_conference_day_at IS NOT NULL;
    END IF;
    GET DIAGNOSTICS v_updated = ROW_COUNT;

  ELSE
    SELECT * INTO v_reg FROM public.workshop_registrations WHERE id = p_scanned_id;

    IF NOT FOUND THEN
      INSERT INTO public.door_events (event_type, occasion, outcome, staff_id,
        staff_email, staff_role, station, occurred_at, failure_reason, metadata)
      VALUES ('denied', v_occasion, 'not_found', v_staff.id, v_staff.email,
        v_staff.role, p_station, v_occurred, 'subject_not_found',
        jsonb_build_object('scannedId', p_scanned_id));
      RETURN jsonb_build_object('outcome', 'not_found', 'failureReason', 'subject_not_found');
    END IF;

    v_kind := 'workshop_registration';

    UPDATE public.workshop_registrations SET
      checked_in = FALSE,
      checked_in_at = NULL,
      checked_in_by = NULL,
      updated_at = NOW()
    WHERE id = v_reg.id AND checked_in IS TRUE;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
  END IF;

  INSERT INTO public.door_events (event_type, occasion, outcome, ticket_id,
    workshop_registration_id, staff_id, staff_email, staff_role, station,
    occurred_at, notes, metadata)
  VALUES ('check_in_undone', v_occasion,
    CASE WHEN v_updated > 0 THEN 'applied' ELSE 'duplicate' END,
    CASE WHEN v_kind = 'ticket' THEN v_ticket.id END,
    CASE WHEN v_kind = 'workshop_registration' THEN v_reg.id END,
    v_staff.id, v_staff.email, v_staff.role, p_station, v_occurred, p_reason,
    jsonb_build_object('subjectKind', v_kind));

  RETURN jsonb_build_object(
    'outcome', CASE WHEN v_updated > 0 THEN 'applied' ELSE 'duplicate' END,
    'occasion', v_occasion,
    'subjectKind', v_kind
  );
END;
$$;

COMMENT ON FUNCTION public.door_check_in_undo(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT) IS 'Clear a mistaken check-in for one occasion and audit the correction as check_in_undone. duplicate means there was nothing to undo, so replays are safe.';

-- ============================================
-- Goodie handover (adds p_occasion and per-item sizes)
-- ============================================

DROP FUNCTION IF EXISTS public.door_goodie_handover(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT);

-- The handed sizes are recorded on the audit row's metadata rather than as new
-- ticket columns: the door needs "what actually went over the counter" for the
-- follow-up on missing items, and the append-only event is the natural home
-- for a fact about one handover. goodie_note keeps the human-readable summary
-- the station composes, so a re-scan can show it without another lookup.
CREATE FUNCTION public.door_goodie_handover(
  p_ticket_id   UUID,
  p_staff_id    UUID,
  p_station     TEXT DEFAULT NULL,
  p_occurred_at TIMESTAMPTZ DEFAULT NULL,
  p_note        TEXT DEFAULT NULL,
  p_occasion    TEXT DEFAULT NULL,
  p_tshirt_size TEXT DEFAULT NULL,
  p_hoodie_size TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_staff    public.checkin_staff;
  v_occasion TEXT := public.door_occasion_or_current(p_occasion);
  v_occurred TIMESTAMPTZ := COALESCE(p_occurred_at, NOW());
  v_ticket   public.tickets;
  v_updated  INT := 0;
BEGIN
  IF v_occurred > NOW() THEN v_occurred := NOW(); END IF;

  SELECT * INTO v_staff FROM public.checkin_staff
    WHERE id = p_staff_id AND is_active;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'denied', 'failureReason', 'staff_not_active');
  END IF;

  SELECT * INTO v_ticket FROM public.tickets WHERE id = p_ticket_id;
  IF NOT FOUND THEN
    INSERT INTO public.door_events (event_type, occasion, outcome, staff_id,
      staff_email, staff_role, station, occurred_at, failure_reason, metadata)
    VALUES ('denied', v_occasion, 'not_found', v_staff.id, v_staff.email,
      v_staff.role, p_station, v_occurred, 'subject_not_found',
      jsonb_build_object('ticketId', p_ticket_id));
    RETURN jsonb_build_object('outcome', 'not_found', 'failureReason', 'subject_not_found');
  END IF;

  -- Entitlement follows the conference ticket. A workshop-only attendee has no
  -- ticket row to pass in, so they cannot reach this at all.
  IF v_ticket.status <> 'confirmed' THEN
    INSERT INTO public.door_events (event_type, occasion, outcome, ticket_id,
      staff_id, staff_email, staff_role, station, occurred_at, failure_reason)
    VALUES ('denied', v_occasion, 'denied', v_ticket.id, v_staff.id,
      v_staff.email, v_staff.role, p_station, v_occurred, 'not_entitled');
    RETURN jsonb_build_object('outcome', 'denied', 'failureReason', 'not_entitled');
  END IF;

  UPDATE public.tickets SET
    goodie_handed_at = v_occurred,
    goodie_handed_by = v_staff.id,
    goodie_note = COALESCE(p_note, goodie_note),
    updated_at = NOW()
  WHERE id = v_ticket.id AND goodie_handed_at IS NULL;
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  INSERT INTO public.door_events (event_type, occasion, outcome, ticket_id,
    staff_id, staff_email, staff_role, station, occurred_at, notes, metadata)
  VALUES ('goodie_handed', v_occasion,
    CASE WHEN v_updated > 0 THEN 'applied' ELSE 'duplicate' END,
    v_ticket.id, v_staff.id, v_staff.email, v_staff.role, p_station,
    v_occurred, p_note,
    -- NULL size = that item was NOT handed over. The event is the structured
    -- record a report can count sizes from.
    jsonb_build_object(
      'tshirtSizeHanded', p_tshirt_size,
      'hoodieSizeHanded', p_hoodie_size
    ));

  RETURN jsonb_build_object(
    'outcome', CASE WHEN v_updated > 0 THEN 'applied' ELSE 'duplicate' END,
    'alreadyHandedAt', CASE WHEN v_updated = 0 THEN to_jsonb(v_ticket.goodie_handed_at) END
  );
END;
$$;

COMMENT ON FUNCTION public.door_goodie_handover(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT) IS 'Record a goodie-bag handover once per ticket, with the sizes actually handed (NULL = item not handed) on the audit row''s metadata and a composed summary in goodie_note.';

-- ============================================
-- Badge pickup
-- ============================================

-- Early pickup: an attendee collects their printed badge on the community day
-- (or any day before their own). Deliberately NOT a check-in — the workshop
-- and conference day arrivals stay untouched — and deliberately stateless
-- outside door_events: whether a badge was picked up IS the applied
-- badge_pickup event, so the audit trail and the state cannot disagree.
CREATE FUNCTION public.door_badge_pickup(
  p_scanned_id  UUID,
  p_staff_id    UUID,
  p_station     TEXT DEFAULT NULL,
  p_occurred_at TIMESTAMPTZ DEFAULT NULL,
  p_occasion    TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_staff     public.checkin_staff;
  v_occasion  TEXT := public.door_occasion_or_current(p_occasion);
  v_occurred  TIMESTAMPTZ := COALESCE(p_occurred_at, NOW());
  v_ticket    public.tickets;
  v_reg       public.workshop_registrations;
  v_kind      TEXT;
  v_status    TEXT;
  v_ticket_id UUID;
  v_reg_id    UUID;
  v_prior     TIMESTAMPTZ;
BEGIN
  IF v_occurred > NOW() THEN v_occurred := NOW(); END IF;

  SELECT * INTO v_staff FROM public.checkin_staff
    WHERE id = p_staff_id AND is_active;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'denied', 'failureReason', 'staff_not_active');
  END IF;

  -- Every role may hand a badge over: pickup moves no admission state and the
  -- pre-event desk is staffed by whoever is around that day.
  SELECT * INTO v_ticket FROM public.tickets WHERE id = p_scanned_id;
  IF FOUND THEN
    v_kind := 'ticket';
    v_status := v_ticket.status::text;
    v_ticket_id := v_ticket.id;
  ELSE
    SELECT * INTO v_reg FROM public.workshop_registrations WHERE id = p_scanned_id;
    IF NOT FOUND THEN
      INSERT INTO public.door_events (event_type, occasion, outcome, staff_id,
        staff_email, staff_role, station, occurred_at, failure_reason, metadata)
      VALUES ('denied', v_occasion, 'not_found', v_staff.id, v_staff.email,
        v_staff.role, p_station, v_occurred, 'subject_not_found',
        jsonb_build_object('scannedId', p_scanned_id));
      RETURN jsonb_build_object('outcome', 'not_found', 'failureReason', 'subject_not_found');
    END IF;
    v_kind := 'workshop_registration';
    v_status := v_reg.status::text;
    v_reg_id := v_reg.id;
  END IF;

  IF v_status <> 'confirmed' THEN
    INSERT INTO public.door_events (event_type, occasion, outcome, ticket_id,
      workshop_registration_id, staff_id, staff_email, staff_role, station,
      occurred_at, failure_reason)
    VALUES ('denied', v_occasion, 'denied', v_ticket_id, v_reg_id, v_staff.id,
      v_staff.email, v_staff.role, p_station, v_occurred,
      CASE WHEN v_kind = 'ticket' THEN 'ticket_' ELSE 'registration_' END || v_status);
    RETURN jsonb_build_object('outcome', 'denied',
      'failureReason',
      CASE WHEN v_kind = 'ticket' THEN 'ticket_' ELSE 'registration_' END || v_status);
  END IF;

  -- The duplicate guard reads the event stream itself. Serialisable enough for
  -- a badge desk: two racing pickups cost one extra applied row, never a wrong
  -- admission, and the desk physically holds one badge per person anyway.
  SELECT occurred_at INTO v_prior FROM public.door_events
    WHERE event_type = 'badge_pickup' AND outcome = 'applied'
      AND ((v_ticket_id IS NOT NULL AND ticket_id = v_ticket_id)
        OR (v_reg_id IS NOT NULL AND workshop_registration_id = v_reg_id))
    ORDER BY occurred_at ASC
    LIMIT 1;

  IF v_prior IS NOT NULL THEN
    INSERT INTO public.door_events (event_type, occasion, outcome, ticket_id,
      workshop_registration_id, staff_id, staff_email, staff_role, station,
      occurred_at, metadata)
    VALUES ('badge_pickup', v_occasion, 'duplicate', v_ticket_id, v_reg_id,
      v_staff.id, v_staff.email, v_staff.role, p_station, v_occurred,
      jsonb_build_object('subjectKind', v_kind));
    RETURN jsonb_build_object('outcome', 'duplicate', 'alreadyPickedUpAt', v_prior);
  END IF;

  INSERT INTO public.door_events (event_type, occasion, outcome, ticket_id,
    workshop_registration_id, staff_id, staff_email, staff_role, station,
    occurred_at, metadata)
  VALUES ('badge_pickup', v_occasion, 'applied', v_ticket_id, v_reg_id,
    v_staff.id, v_staff.email, v_staff.role, p_station, v_occurred,
    jsonb_build_object('subjectKind', v_kind));

  RETURN jsonb_build_object('outcome', 'applied', 'subjectKind', v_kind);
END;
$$;

COMMENT ON FUNCTION public.door_badge_pickup(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT) IS 'Record a badge handover, e.g. early pickup on the community day. Moves no check-in state; the applied event row IS the pickup state, so a re-scan reports duplicate with the original time.';

-- ============================================
-- Resolve: include badge pickup state
-- ============================================

-- Same signature, so CREATE OR REPLACE is safe. Adds a `badge` object mirroring
-- the check-in state shape, answered from the applied badge_pickup event.
CREATE OR REPLACE FUNCTION public.door_resolve(p_scanned_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ticket        public.tickets;
  v_registration  public.workshop_registrations;
  v_email         TEXT;
  v_result        JSONB;
BEGIN
  SELECT * INTO v_ticket FROM public.tickets WHERE id = p_scanned_id;

  IF FOUND THEN
    v_email := lower(v_ticket.email);

    SELECT jsonb_build_object(
      'found', TRUE,
      'subjectKind', 'ticket',
      'subjectId', v_ticket.id,
      'person', jsonb_build_object(
        'firstName', v_ticket.first_name,
        'lastName',  v_ticket.last_name,
        'email',     v_ticket.email,
        'company',   v_ticket.company,
        'jobTitle',  v_ticket.job_title
      ),
      'ticket', jsonb_build_object(
        'type',        v_ticket.ticket_type,
        'category',    v_ticket.ticket_category,
        'stage',       v_ticket.ticket_stage,
        'status',      v_ticket.status,
        'isVip',       v_ticket.ticket_category = 'vip',
        'transferredFromName',  v_ticket.transferred_from_name,
        'transferredFromEmail', v_ticket.transferred_from_email
      ),
      -- Admissible only when the payment actually settled. The panel shows the
      -- refusal reason rather than pretending the person is unknown.
      'admissible', v_ticket.status = 'confirmed',
      'refusalReason', CASE
        WHEN v_ticket.status = 'confirmed' THEN NULL
        ELSE 'ticket_' || v_ticket.status::text
      END,
      'checkIn', jsonb_build_object(
        'workshopDayAt',   v_ticket.checked_in_workshop_day_at,
        'conferenceDayAt', v_ticket.checked_in_conference_day_at
      ),
      -- Goodie entitlement follows the conference ticket: a workshop-only
      -- attendee is not entitled to one, so this is false for them by
      -- construction rather than by a special case.
      'goodie', jsonb_build_object(
        'entitled', v_ticket.status = 'confirmed',
        'handedAt', v_ticket.goodie_handed_at,
        'note',     v_ticket.goodie_note
      ),
      'apparel', COALESCE(
        (SELECT jsonb_build_object('tshirtSize', a.tshirt_size, 'hoodieSize', a.hoodie_size)
           FROM public.ticket_apparel_preferences a WHERE a.ticket_id = v_ticket.id),
        jsonb_build_object('tshirtSize', NULL, 'hoodieSize', NULL)
      ),
      'badge', jsonb_build_object(
        'pickedUpAt', (
          SELECT MIN(e.occurred_at) FROM public.door_events e
          WHERE e.event_type = 'badge_pickup' AND e.outcome = 'applied'
            AND e.ticket_id = v_ticket.id
        )
      ),
      'doorNote', v_ticket.door_note,
      'workshops', public.door_workshops_for(v_ticket.id, v_email)
    ) INTO v_result;

    RETURN v_result;
  END IF;

  SELECT * INTO v_registration
    FROM public.workshop_registrations WHERE id = p_scanned_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'found', TRUE,
      'subjectKind', 'workshop_registration',
      'subjectId', v_registration.id,
      'person', jsonb_build_object(
        'firstName', v_registration.first_name,
        'lastName',  v_registration.last_name,
        'email',     v_registration.email,
        -- workshop_registrations.company is populated on every path that
        -- creates a seat, including workshop-only B2B invoices. It is the only
        -- identifying detail an unnamed seat carries, so the desk can find the
        -- person by their employer.
        'company',   v_registration.company,
        'jobTitle',  v_registration.job_title
      ),
      -- A workshop-only attendee has no conference ticket at all. That is a
      -- legitimate state, not an error, and it is why this is NULL rather than
      -- an empty ticket object the UI might render as a broken row.
      'ticket', NULL,
      'admissible', v_registration.status = 'confirmed',
      'refusalReason', CASE
        WHEN v_registration.status = 'confirmed' THEN NULL
        ELSE 'registration_' || v_registration.status::text
      END,
      'checkIn', jsonb_build_object(
        'workshopDayAt', v_registration.checked_in_at,
        'conferenceDayAt', NULL
      ),
      'goodie', jsonb_build_object('entitled', FALSE, 'handedAt', NULL, 'note', NULL),
      'apparel', jsonb_build_object('tshirtSize', NULL, 'hoodieSize', NULL),
      'badge', jsonb_build_object(
        'pickedUpAt', (
          SELECT MIN(e.occurred_at) FROM public.door_events e
          WHERE e.event_type = 'badge_pickup' AND e.outcome = 'applied'
            AND e.workshop_registration_id = v_registration.id
        )
      ),
      'doorNote', NULL,
      'workshops', public.door_workshops_for(NULL, lower(v_registration.email))
    );
  END IF;

  RETURN jsonb_build_object('found', FALSE, 'subjectKind', NULL);
END;
$$;

COMMENT ON FUNCTION public.door_resolve(UUID) IS 'The whole door panel for one scanned UUID, across both the ticket and workshop-registration id spaces. Returns refused subjects rather than hiding them, and includes badge pickup state.';

-- ============================================
-- Badge pickup state for the roster
-- ============================================

-- The station prefetches the roster once per shift, so pickup state has to
-- ship with it. One aggregate rather than shipping event rows: the payload is
-- (subject id, first pickup time) pairs, nothing else.
CREATE FUNCTION public.door_badge_pickups()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'subjectId', COALESCE(ticket_id, workshop_registration_id),
    'pickedUpAt', picked_up_at
  )), '[]'::jsonb)
  FROM (
    SELECT ticket_id, workshop_registration_id, MIN(occurred_at) AS picked_up_at
    FROM public.door_events
    WHERE event_type = 'badge_pickup' AND outcome = 'applied'
      AND (ticket_id IS NOT NULL OR workshop_registration_id IS NOT NULL)
    GROUP BY ticket_id, workshop_registration_id
  ) pickups;
$$;

COMMENT ON FUNCTION public.door_badge_pickups() IS 'Every badge already picked up, as (subjectId, first pickedUpAt) pairs, for the station roster prefetch.';

-- ============================================
-- Dashboard: per-volunteer scan totals
-- ============================================

-- Same signature, so CREATE OR REPLACE is safe. Adds `scans` (every action a
-- volunteer performed, whatever the outcome) and `badgePickups` so the
-- organiser view can answer "who is doing the scanning work" per person now
-- that stations are gone, plus surfacing pickup volume on the pre-event day.
CREATE OR REPLACE FUNCTION public.door_dashboard(p_occasion TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_occasion TEXT := COALESCE(p_occasion, public.door_current_occasion());
  v_expected INT;
  v_arrived  INT;
  v_result   JSONB;
BEGIN
  -- Everyone who could turn up for this occasion.
  --   workshop_day: confirmed workshop seats, INCLUDING attendees with no
  --                 conference ticket at all.
  --   conference_day: confirmed conference tickets.
  IF v_occasion = 'workshop_day' THEN
    SELECT count(*) INTO v_expected
      FROM public.workshop_registrations WHERE status = 'confirmed';
    SELECT count(*) INTO v_arrived
      FROM public.workshop_registrations WHERE status = 'confirmed' AND checked_in;
  ELSE
    SELECT count(*) INTO v_expected
      FROM public.tickets WHERE status = 'confirmed';
    SELECT count(*) INTO v_arrived
      FROM public.tickets
      WHERE status = 'confirmed' AND checked_in_conference_day_at IS NOT NULL;
  END IF;

  SELECT jsonb_build_object(
    'occasion', v_occasion,
    'generatedAt', NOW(),

    'expected', v_expected,
    'arrived', v_arrived,
    'remaining', GREATEST(v_expected - v_arrived, 0),

    -- Goodie bags are only meaningful on the day tickets are entitled to them.
    'goodieHandedOver', (
      SELECT count(*) FROM public.tickets
      WHERE status = 'confirmed' AND goodie_handed_at IS NOT NULL
    ),

    -- Badges collected early or at the door, across every day.
    'badgesPickedUp', (
      SELECT count(DISTINCT COALESCE(ticket_id, workshop_registration_id))
      FROM public.door_events
      WHERE event_type = 'badge_pickup' AND outcome = 'applied'
    ),

    -- Throughput over the last quarter hour, which is what tells a lead whether
    -- the queue is moving right now rather than how the morning went overall.
    'arrivalsLast15Min', (
      SELECT count(*) FROM public.door_events
      WHERE occasion = v_occasion
        AND event_type IN ('checked_in', 'manual_admit')
        AND outcome = 'applied'
        AND recorded_at > NOW() - INTERVAL '15 minutes'
    ),
    'arrivalsLast5Min', (
      SELECT count(*) FROM public.door_events
      WHERE occasion = v_occasion
        AND event_type IN ('checked_in', 'manual_admit')
        AND outcome = 'applied'
        AND recorded_at > NOW() - INTERVAL '5 minutes'
    ),

    -- Kept for older data that still carries a station label; the UI leads
    -- with the per-volunteer view now that stations are no longer collected.
    'stations', COALESCE((
      SELECT jsonb_agg(s ORDER BY s->>'station')
      FROM (
        SELECT jsonb_build_object(
          'station', COALESCE(station, 'unlabelled'),
          'admitted', count(*) FILTER (
            WHERE event_type IN ('checked_in', 'manual_admit') AND outcome = 'applied'
          ),
          'duplicates', count(*) FILTER (WHERE outcome = 'duplicate'),
          'refusals', count(*) FILTER (WHERE outcome IN ('denied', 'not_found')),
          'lastSeenAt', max(recorded_at)
        ) AS s
        FROM public.door_events
        WHERE occasion = v_occasion AND station IS NOT NULL
        GROUP BY station
      ) grouped
    ), '[]'::jsonb),

    -- Per volunteer: the person scanning is the pressure point now that
    -- stations are gone, so this is the primary breakdown. Deliberately name
    -- and role only, and the counts exist to spot someone who needs help
    -- rather than to rank anyone.
    'volunteers', COALESCE((
      SELECT jsonb_agg(v ORDER BY (v->>'admitted')::int DESC)
      FROM (
        SELECT jsonb_build_object(
          'staffEmail', staff_email,
          'staffRole', staff_role,
          'scans', count(*),
          'admitted', count(*) FILTER (
            WHERE event_type IN ('checked_in', 'manual_admit') AND outcome = 'applied'
          ),
          'manualAdmits', count(*) FILTER (WHERE event_type = 'manual_admit'),
          'undos', count(*) FILTER (
            WHERE event_type = 'check_in_undone' AND outcome = 'applied'
          ),
          'badgePickups', count(*) FILTER (
            WHERE event_type = 'badge_pickup' AND outcome = 'applied'
          ),
          'refusals', count(*) FILTER (WHERE outcome IN ('denied', 'not_found')),
          'duplicates', count(*) FILTER (WHERE outcome = 'duplicate'),
          'lastSeenAt', max(recorded_at)
        ) AS v
        FROM public.door_events
        WHERE occasion = v_occasion
        GROUP BY staff_email, staff_role
      ) grouped
    ), '[]'::jsonb),

    -- Things a lead should look at. Not errors -- signals.
    --   refusals: a run of these can mean a broken batch of codes.
    --   manualAdmits: expected because blank badges have no code, but a spike
    --                 for one volunteer can mean that phone's camera is failing.
    --   notFound: someone scanning codes from a different event.
    'anomalies', jsonb_build_object(
      'refusals', (
        SELECT count(*) FROM public.door_events
        WHERE occasion = v_occasion AND outcome = 'denied'
      ),
      'notFound', (
        SELECT count(*) FROM public.door_events
        WHERE occasion = v_occasion AND outcome = 'not_found'
      ),
      'manualAdmits', (
        SELECT count(*) FROM public.door_events
        WHERE occasion = v_occasion AND event_type = 'manual_admit' AND outcome = 'applied'
      ),
      'undos', (
        SELECT count(*) FROM public.door_events
        WHERE occasion = v_occasion AND event_type = 'check_in_undone' AND outcome = 'applied'
      ),
      'duplicates', (
        SELECT count(*) FROM public.door_events
        WHERE occasion = v_occasion AND outcome = 'duplicate'
      )
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.door_dashboard(TEXT) IS 'One small aggregate for the polled live dashboard. Per-volunteer grouping is the primary breakdown; per-station is kept only for older rows that carry a label.';

-- ============================================
-- Deleting audit rows (admin only, deliberate)
-- ============================================

-- The append-only triggers stay: nothing at the door, and no ordinary admin
-- query, can mutate the trail. But rehearsals and testing produce rows the
-- organiser legitimately wants gone, so there is now exactly one door:
-- door_events_delete, which unlocks the trigger for its own transaction via a
-- transaction-local setting and deletes the named rows. EXECUTE is granted to
-- service_role only, and the API route behind it requires an admin cookie.
CREATE OR REPLACE FUNCTION public.door_events_reject_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- The one sanctioned bypass: door_events_delete sets this for its own
  -- transaction. current_setting's second argument makes a missing setting an
  -- empty string rather than an error.
  IF TG_OP = 'DELETE'
     AND current_setting('zjs.door_events_allow_delete', TRUE) = 'on' THEN
    RETURN OLD;
  END IF;

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

COMMENT ON FUNCTION public.door_events_reject_mutation() IS 'Keeps door_events append-only. Rejects DELETE and TRUNCATE outright — except a DELETE inside door_events_delete, which unlocks its own transaction — and rejects any UPDATE except the reference-clearing one a foreign key performs on ON DELETE SET NULL.';

CREATE FUNCTION public.door_events_delete(p_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deleted INT;
BEGIN
  IF p_ids IS NULL OR array_length(p_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('deleted', 0);
  END IF;

  -- Transaction-local (is_local => TRUE): the unlock dies with this commit, so
  -- no other statement — not even later ones on this connection — inherits it.
  PERFORM set_config('zjs.door_events_allow_delete', 'on', TRUE);

  DELETE FROM public.door_events WHERE id = ANY (p_ids);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN jsonb_build_object('deleted', v_deleted);
END;
$$;

COMMENT ON FUNCTION public.door_events_delete(UUID[]) IS 'The one sanctioned way to remove audit rows (rehearsal and test data). Unlocks the append-only trigger for its own transaction only. Granted to service_role; the API behind it requires an admin cookie.';

-- ============================================
-- Least privilege
-- ============================================

-- Supabase's default privileges grant EXECUTE on new functions to anon,
-- authenticated and service_role directly, so each new signature needs the
-- explicit revoke — a revoke from PUBLIC alone would not remove those grants.
REVOKE ALL ON FUNCTION public.door_occasion_or_current(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.door_check_in(UUID, UUID, TEXT, TIMESTAMPTZ, BOOLEAN, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.door_check_in_undo(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.door_goodie_handover(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.door_badge_pickup(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.door_badge_pickups() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.door_dashboard(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.door_events_delete(UUID[]) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.door_occasion_or_current(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.door_check_in(UUID, UUID, TEXT, TIMESTAMPTZ, BOOLEAN, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.door_check_in_undo(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.door_goodie_handover(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.door_badge_pickup(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.door_badge_pickups() TO service_role;
GRANT EXECUTE ON FUNCTION public.door_dashboard(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.door_events_delete(UUID[]) TO service_role;

COMMIT;
