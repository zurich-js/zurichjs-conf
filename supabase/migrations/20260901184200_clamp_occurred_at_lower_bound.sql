-- Complete the two-sided clamp promised in the original door_check_in comment:
-- a device with a wrong date (factory-reset, skewed clock) should still record
-- the check-in with the server's real time, not be rejected outright.
--
-- The API-layer Zod schema previously hard-rejected any occurredAt before
-- 2026-09-01, which made an otherwise fixable clock problem into a permanent
-- data loss for that volunteer's entire shift. This migration adds the lower
-- bound clamp at the SQL level so the database code matches its own comment,
-- and the Zod schema is being relaxed to a much older sanity bound.
--
-- The event start date is 2026-09-01T00:00:00Z (Europe/Zurich).

BEGIN;

-- ============================================
-- door_check_in: add lower bound clamp
-- ============================================
DROP FUNCTION IF EXISTS public.door_check_in(UUID, UUID, TEXT, TIMESTAMPTZ, BOOLEAN, TEXT, TEXT);

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
  IF v_occurred < '2026-09-01'::TIMESTAMPTZ THEN v_occurred := NOW(); END IF;
  IF v_occurred > NOW() THEN v_occurred := NOW(); END IF;

  SELECT * INTO v_staff FROM public.checkin_staff
    WHERE id = p_staff_id AND is_active;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'denied', 'failureReason', 'staff_not_active');
  END IF;

  v_event := CASE WHEN p_manual THEN 'manual_admit' ELSE 'checked_in' END;

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

    IF v_occasion = 'workshop_day' THEN
      UPDATE public.tickets SET
        checked_in_workshop_day_at = v_occurred,
        checked_in_workshop_day_by = v_staff.id,
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

    -- A workshop registration cannot be checked in on conference day — that
    -- day has no workshop sessions, so the check-in would inflate the wrong
    -- day's arrival count. Direct them to scan their conference ticket instead.
    IF v_occasion = 'conference_day' THEN
      INSERT INTO public.door_events (event_type, occasion, outcome,
        workshop_registration_id, staff_id, staff_email, staff_role, station,
        occurred_at, failure_reason)
      VALUES ('denied', v_occasion, 'denied', v_reg.id, v_staff.id,
        v_staff.email, v_staff.role, p_station, v_occurred,
        'workshop_registration_wrong_day');
      RETURN jsonb_build_object('outcome', 'denied',
        'failureReason', 'workshop_registration_wrong_day');
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
    CASE WHEN v_kind = 'ticket' THEN p_scanned_id END,
    CASE WHEN v_kind = 'workshop_registration' THEN p_scanned_id END,
    v_staff.id, v_staff.email, v_staff.role, p_station, v_occurred, p_reason,
    jsonb_build_object('subjectKind', v_kind));

  RETURN jsonb_build_object(
    'outcome', v_outcome,
    'alreadyCheckedInAt', CASE
      WHEN v_outcome = 'duplicate' AND v_kind = 'ticket' THEN
        to_jsonb(CASE v_occasion
          WHEN 'workshop_day' THEN v_ticket.checked_in_workshop_day_at
          ELSE v_ticket.checked_in_conference_day_at
        END)
      WHEN v_outcome = 'duplicate' AND v_kind = 'workshop_registration' THEN
        to_jsonb(v_reg.checked_in_at)
    END
  );
END;
$$;

COMMENT ON FUNCTION public.door_check_in(UUID, UUID, TEXT, TIMESTAMPTZ, BOOLEAN, TEXT, TEXT) IS 'Admit an attendee by ticket or workshop registration id. Returns {outcome, alreadyCheckedInAt?}. Clamps occurred_at on both sides so a skewed device clock cannot backdate or forward-date audit rows.';

-- ============================================
-- door_check_in_undo: add lower bound clamp
-- ============================================
DROP FUNCTION IF EXISTS public.door_check_in_undo(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT);

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
  IF v_occurred < '2026-09-01'::TIMESTAMPTZ THEN v_occurred := NOW(); END IF;
  IF v_occurred > NOW() THEN v_occurred := NOW(); END IF;

  SELECT * INTO v_staff FROM public.checkin_staff
    WHERE id = p_staff_id AND is_active;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'denied', 'failureReason', 'staff_not_active');
  END IF;

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

    -- Mirror check-in: workshop registrations cannot be undone on conference day.
    IF v_occasion = 'conference_day' THEN
      INSERT INTO public.door_events (event_type, occasion, outcome,
        workshop_registration_id, staff_id, staff_email, staff_role, station,
        occurred_at, failure_reason)
      VALUES ('denied', v_occasion, 'denied', v_reg.id, v_staff.id,
        v_staff.email, v_staff.role, p_station, v_occurred,
        'workshop_registration_wrong_day');
      RETURN jsonb_build_object('outcome', 'denied',
        'failureReason', 'workshop_registration_wrong_day');
    END IF;

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
    CASE WHEN v_kind = 'ticket' THEN p_scanned_id END,
    CASE WHEN v_kind = 'workshop_registration' THEN p_scanned_id END,
    v_staff.id, v_staff.email, v_staff.role, p_station, v_occurred, p_reason,
    jsonb_build_object('subjectKind', v_kind));

  RETURN jsonb_build_object(
    'outcome', CASE WHEN v_updated > 0 THEN 'applied' ELSE 'duplicate' END
  );
END;
$$;

COMMENT ON FUNCTION public.door_check_in_undo(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT) IS 'Reverse a mistaken check-in, clearing the per-occasion timestamp and appending a check_in_undone audit row.';

-- ============================================
-- Per-item goodie tracking columns
-- ============================================
-- A partial handover (hoodie out of stock, will collect later) must allow a
-- follow-up. Previously the first handover set goodie_handed_at regardless of
-- what actually went over, blocking subsequent completions.
--
-- New design:
-- - tshirt_handed_at / hoodie_handed_at track individual items
-- - goodie_handed_at is set only when the FULL entitlement is satisfied
-- - The UI derives "still owed" from what's entitled vs what's handed

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS tshirt_handed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tshirt_handed_by UUID REFERENCES public.checkin_staff(id),
  ADD COLUMN IF NOT EXISTS hoodie_handed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hoodie_handed_by UUID REFERENCES public.checkin_staff(id);

COMMENT ON COLUMN public.tickets.tshirt_handed_at IS 'When the t-shirt was physically handed over (null = not yet).';
COMMENT ON COLUMN public.tickets.hoodie_handed_at IS 'When the hoodie was physically handed over (null = not yet, only VIPs are entitled).';

-- ============================================
-- door_goodie_handover: per-item tracking, follow-up support
-- ============================================
DROP FUNCTION IF EXISTS public.door_goodie_handover(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT);

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
  v_staff         public.checkin_staff;
  v_occasion      TEXT := public.door_occasion_or_current(p_occasion);
  v_occurred      TIMESTAMPTZ := COALESCE(p_occurred_at, NOW());
  v_ticket        public.tickets;
  v_is_vip        BOOLEAN;
  v_tshirt_new    BOOLEAN := FALSE;
  v_hoodie_new    BOOLEAN := FALSE;
  v_anything_new  BOOLEAN;
  v_fully_handed  BOOLEAN;
BEGIN
  IF v_occurred < '2026-09-01'::TIMESTAMPTZ THEN v_occurred := NOW(); END IF;
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

  IF v_ticket.status <> 'confirmed' THEN
    INSERT INTO public.door_events (event_type, occasion, outcome, ticket_id,
      staff_id, staff_email, staff_role, station, occurred_at, failure_reason)
    VALUES ('denied', v_occasion, 'denied', v_ticket.id, v_staff.id,
      v_staff.email, v_staff.role, p_station, v_occurred, 'not_entitled');
    RETURN jsonb_build_object('outcome', 'denied', 'failureReason', 'not_entitled');
  END IF;

  v_is_vip := (v_ticket.ticket_type = 'vip');

  -- Update individual items when they are handed for the first time.
  -- NULL p_tshirt_size means "did not hand the t-shirt this time", not "undo".
  IF p_tshirt_size IS NOT NULL AND v_ticket.tshirt_handed_at IS NULL THEN
    UPDATE public.tickets SET
      tshirt_handed_at = v_occurred,
      tshirt_handed_by = v_staff.id,
      updated_at = NOW()
    WHERE id = v_ticket.id AND tshirt_handed_at IS NULL;
    v_tshirt_new := TRUE;
  END IF;

  IF p_hoodie_size IS NOT NULL AND v_ticket.hoodie_handed_at IS NULL THEN
    UPDATE public.tickets SET
      hoodie_handed_at = v_occurred,
      hoodie_handed_by = v_staff.id,
      updated_at = NOW()
    WHERE id = v_ticket.id AND hoodie_handed_at IS NULL;
    v_hoodie_new := TRUE;
  END IF;

  v_anything_new := v_tshirt_new OR v_hoodie_new;

  -- Append or update the note (useful even on follow-up handovers).
  IF p_note IS NOT NULL THEN
    UPDATE public.tickets SET
      goodie_note = CASE
        WHEN goodie_note IS NULL THEN p_note
        ELSE goodie_note || ' · ' || p_note
      END,
      updated_at = NOW()
    WHERE id = v_ticket.id;
  END IF;

  -- Re-fetch to check if the entitlement is now fully satisfied.
  SELECT * INTO v_ticket FROM public.tickets WHERE id = p_ticket_id;

  -- Full entitlement: t-shirt for everyone, hoodie only for VIPs.
  v_fully_handed := v_ticket.tshirt_handed_at IS NOT NULL
    AND (NOT v_is_vip OR v_ticket.hoodie_handed_at IS NOT NULL);

  IF v_fully_handed AND v_ticket.goodie_handed_at IS NULL THEN
    UPDATE public.tickets SET
      goodie_handed_at = v_occurred,
      goodie_handed_by = v_staff.id,
      updated_at = NOW()
    WHERE id = v_ticket.id AND goodie_handed_at IS NULL;
  END IF;

  INSERT INTO public.door_events (event_type, occasion, outcome, ticket_id,
    staff_id, staff_email, staff_role, station, occurred_at, notes, metadata)
  VALUES ('goodie_handed', v_occasion,
    CASE WHEN v_anything_new THEN 'applied' ELSE 'duplicate' END,
    v_ticket.id, v_staff.id, v_staff.email, v_staff.role, p_station,
    v_occurred, p_note,
    jsonb_build_object(
      'tshirtSizeHanded', p_tshirt_size,
      'hoodieSizeHanded', p_hoodie_size,
      'tshirtNewThisCall', v_tshirt_new,
      'hoodieNewThisCall', v_hoodie_new
    ));

  RETURN jsonb_build_object(
    'outcome', CASE WHEN v_anything_new THEN 'applied' ELSE 'duplicate' END,
    'tshirtHandedAt', v_ticket.tshirt_handed_at,
    'hoodieHandedAt', v_ticket.hoodie_handed_at,
    'fullyHanded', v_fully_handed
  );
END;
$$;

COMMENT ON FUNCTION public.door_goodie_handover(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT) IS 'Record a goodie-bag handover per item. A partial handover (t-shirt only) allows a follow-up call to complete the hoodie. goodie_handed_at is set only when the full entitlement is satisfied.';

-- ============================================
-- door_badge_pickup: add lower bound clamp
-- ============================================
DROP FUNCTION IF EXISTS public.door_badge_pickup(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT);

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
  v_subject   UUID;
  v_applied   INT := 0;
  v_reg_id    UUID;
  v_prior     TIMESTAMPTZ;
BEGIN
  IF v_occurred < '2026-09-01'::TIMESTAMPTZ THEN v_occurred := NOW(); END IF;
  IF v_occurred > NOW() THEN v_occurred := NOW(); END IF;

  SELECT * INTO v_staff FROM public.checkin_staff
    WHERE id = p_staff_id AND is_active;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'denied', 'failureReason', 'staff_not_active');
  END IF;

  SELECT * INTO v_ticket FROM public.tickets WHERE id = p_scanned_id;

  IF FOUND THEN
    v_kind := 'ticket';
    v_subject := v_ticket.id;

    IF v_ticket.status <> 'confirmed' THEN
      INSERT INTO public.door_events (event_type, occasion, outcome, ticket_id,
        staff_id, staff_email, staff_role, station, occurred_at, failure_reason)
      VALUES ('denied', v_occasion, 'denied', v_ticket.id, v_staff.id,
        v_staff.email, v_staff.role, p_station, v_occurred,
        'ticket_' || v_ticket.status::text);
      RETURN jsonb_build_object('outcome', 'denied',
        'failureReason', 'ticket_' || v_ticket.status::text);
    END IF;

    SELECT occurred_at INTO v_prior FROM public.door_events
      WHERE ticket_id = v_ticket.id AND event_type = 'badge_pickup' AND outcome = 'applied'
      LIMIT 1;

    IF v_prior IS NOT NULL THEN
      INSERT INTO public.door_events (event_type, occasion, outcome, ticket_id,
        staff_id, staff_email, staff_role, station, occurred_at)
      VALUES ('badge_pickup', v_occasion, 'duplicate', v_ticket.id, v_staff.id,
        v_staff.email, v_staff.role, p_station, v_occurred);
      RETURN jsonb_build_object('outcome', 'duplicate', 'alreadyPickedUpAt', v_prior);
    END IF;

    INSERT INTO public.door_events (event_type, occasion, outcome, ticket_id,
      staff_id, staff_email, staff_role, station, occurred_at)
    VALUES ('badge_pickup', v_occasion, 'applied', v_ticket.id, v_staff.id,
      v_staff.email, v_staff.role, p_station, v_occurred);

    RETURN jsonb_build_object('outcome', 'applied');

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
    v_subject := v_reg.id;

    SELECT occurred_at INTO v_prior FROM public.door_events
      WHERE workshop_registration_id = v_reg.id AND event_type = 'badge_pickup'
        AND outcome = 'applied'
      LIMIT 1;

    IF v_prior IS NOT NULL THEN
      INSERT INTO public.door_events (event_type, occasion, outcome,
        workshop_registration_id, staff_id, staff_email, staff_role, station,
        occurred_at)
      VALUES ('badge_pickup', v_occasion, 'duplicate', v_reg.id, v_staff.id,
        v_staff.email, v_staff.role, p_station, v_occurred);
      RETURN jsonb_build_object('outcome', 'duplicate', 'alreadyPickedUpAt', v_prior);
    END IF;

    INSERT INTO public.door_events (event_type, occasion, outcome,
      workshop_registration_id, staff_id, staff_email, staff_role, station,
      occurred_at)
    VALUES ('badge_pickup', v_occasion, 'applied', v_reg.id, v_staff.id,
      v_staff.email, v_staff.role, p_station, v_occurred);

    RETURN jsonb_build_object('outcome', 'applied');
  END IF;
END;
$$;

COMMENT ON FUNCTION public.door_badge_pickup(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT) IS 'Record an early badge pickup. State is derived from the door_events row (no column on tickets), so pickup-before-arrival-day does not consume a check-in.';

-- ============================================
-- door_resolve: expose per-item goodie state
-- ============================================
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
      'admissible', v_ticket.status = 'confirmed',
      'refusalReason', CASE
        WHEN v_ticket.status = 'confirmed' THEN NULL
        ELSE 'ticket_' || v_ticket.status::text
      END,
      'checkIn', jsonb_build_object(
        'workshopDayAt',   v_ticket.checked_in_workshop_day_at,
        'conferenceDayAt', v_ticket.checked_in_conference_day_at
      ),
      'goodie', jsonb_build_object(
        'entitled', v_ticket.status = 'confirmed',
        'handedAt', v_ticket.goodie_handed_at,
        'note',     v_ticket.goodie_note,
        'tshirtHandedAt', v_ticket.tshirt_handed_at,
        'hoodieHandedAt', v_ticket.hoodie_handed_at
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
        'company',   v_registration.company,
        'jobTitle',  v_registration.job_title
      ),
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
      'goodie', jsonb_build_object(
        'entitled', FALSE,
        'handedAt', NULL,
        'note', NULL,
        'tshirtHandedAt', NULL,
        'hoodieHandedAt', NULL
      ),
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

COMMENT ON FUNCTION public.door_resolve(UUID) IS 'The whole door panel for one scanned UUID, with per-item goodie state (tshirtHandedAt, hoodieHandedAt) for partial handover follow-ups.';

COMMIT;
