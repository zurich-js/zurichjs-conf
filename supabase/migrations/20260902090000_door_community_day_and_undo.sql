-- Door UX round three: the community day becomes a first-class occasion, and
-- every handover the door records becomes undoable.
--
-- WHY A THIRD OCCASION
-- The warm-up meetup (2026-09-09) is where early badge pickup actually happens,
-- but the door only knew two occasions, so a volunteer working that desk had to
-- pretend to be on "workshop day" — and the start screen offered them check-in
-- buttons for a day with no check-ins. community_day names the desk they are
-- really working: badges only. door_check_in refuses the occasion outright, so
-- a mis-tap on the warm-up evening can never consume anyone's workshop or
-- conference arrival.
--
-- WHY UNDO FOR BADGES AND GOODIES
-- Check-ins gained an undo in round two; badge pickups and goodie handovers did
-- not, so the one correction path for "tapped the wrong person's badge" was an
-- organiser deleting audit rows. Both are now reversible the same way check-in
-- is: an appended *_undone event (badge) or a cleared column plus an audit row
-- (goodie). The trail keeps the mistake AND the correction.
--
-- WHY BADGE STATE IS NOW "THE LATEST EVENT", NOT "ANY APPLIED EVENT"
-- Badge pickup state lives in door_events. With an undo event in the stream,
-- EXISTS(applied badge_pickup) would say "picked up" forever. State is now the
-- most recent applied event among badge_pickup / badge_pickup_undone, ordered
-- by recorded_at (the server's insertion time) so a clamped or queued
-- occurred_at cannot reorder history.

BEGIN;

-- ============================================
-- Vocabulary: occasions and event types
-- ============================================

ALTER TABLE public.door_events
  DROP CONSTRAINT IF EXISTS door_events_occasion_valid;
ALTER TABLE public.door_events
  ADD CONSTRAINT door_events_occasion_valid
    CHECK (occasion IN ('community_day', 'workshop_day', 'conference_day'));

COMMENT ON COLUMN public.door_events.occasion IS 'community_day | workshop_day | conference_day';

ALTER TABLE public.door_events
  DROP CONSTRAINT IF EXISTS door_events_event_type_valid;
ALTER TABLE public.door_events
  ADD CONSTRAINT door_events_event_type_valid CHECK (event_type IN (
    'checked_in',
    'check_in_undone',
    'goodie_handed',
    'goodie_undone',
    'manual_admit',
    'badge_pickup',
    'badge_pickup_undone',
    'denied'
  ));

COMMENT ON COLUMN public.door_events.event_type IS 'checked_in | check_in_undone | goodie_handed | goodie_undone | manual_admit | badge_pickup | badge_pickup_undone | denied';

-- ============================================
-- Occasion resolution
-- ============================================

-- Dates match src/data/public-program.ts: community/warm-up day 2026-09-09,
-- workshop day 2026-09-10, conference day 2026-09-11. Anything on or before the
-- community day resolves to community_day so a rehearsal the week before lands
-- on the harmless badge-only occasion.
CREATE OR REPLACE FUNCTION public.door_current_occasion()
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN (NOW() AT TIME ZONE 'Europe/Zurich')::date <= DATE '2026-09-09'
      THEN 'community_day'
    WHEN (NOW() AT TIME ZONE 'Europe/Zurich')::date = DATE '2026-09-10'
      THEN 'workshop_day'
    ELSE 'conference_day'
  END;
$$;

COMMENT ON FUNCTION public.door_current_occasion() IS 'Which door occasion "now" falls in, evaluated in Europe/Zurich. community_day (badge pickup only) through 2026-09-09, workshop_day on the 10th, conference_day after.';

CREATE OR REPLACE FUNCTION public.door_occasion_or_current(p_occasion TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_occasion IN ('community_day', 'workshop_day', 'conference_day') THEN p_occasion
    ELSE public.door_current_occasion()
  END;
$$;

COMMENT ON FUNCTION public.door_occasion_or_current(TEXT) IS 'The staff-chosen occasion when it is one of the known three, otherwise the server-derived current occasion. The fallback is what keeps a stale or buggy client from writing an unknown day into door_events.';

-- ============================================
-- Badge pickup state, undo-aware
-- ============================================

-- The single reader every other function goes through, so the definition of
-- "picked up" cannot fork. NULL means "no badge in their hands right now":
-- either never picked up, or picked up and then undone.
CREATE OR REPLACE FUNCTION public.door_badge_picked_up_at(
  p_ticket_id       UUID,
  p_registration_id UUID
)
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT CASE WHEN e.event_type = 'badge_pickup' THEN e.occurred_at END
  FROM public.door_events e
  WHERE e.event_type IN ('badge_pickup', 'badge_pickup_undone')
    AND e.outcome = 'applied'
    AND ((p_ticket_id IS NOT NULL AND e.ticket_id = p_ticket_id)
      OR (p_registration_id IS NOT NULL AND e.workshop_registration_id = p_registration_id))
  ORDER BY e.recorded_at DESC, e.id DESC
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.door_badge_picked_up_at(UUID, UUID) IS 'When this subject''s badge was handed over, or NULL when it never was — or was handed and then undone. The latest applied badge event decides, ordered by recorded_at so a clamped occurred_at cannot reorder history.';

-- The undone events must be reachable by the same index the state reads use.
DROP INDEX IF EXISTS public.idx_door_events_badge_pickup_ticket;
CREATE INDEX idx_door_events_badge_pickup_ticket
  ON public.door_events (ticket_id, recorded_at DESC)
  WHERE event_type IN ('badge_pickup', 'badge_pickup_undone')
    AND outcome = 'applied' AND ticket_id IS NOT NULL;

DROP INDEX IF EXISTS public.idx_door_events_badge_pickup_registration;
CREATE INDEX idx_door_events_badge_pickup_registration
  ON public.door_events (workshop_registration_id, recorded_at DESC)
  WHERE event_type IN ('badge_pickup', 'badge_pickup_undone')
    AND outcome = 'applied' AND workshop_registration_id IS NOT NULL;

-- ============================================
-- Check in: refuse the badge-only day
-- ============================================

CREATE OR REPLACE FUNCTION public.door_check_in(
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

  -- The community day has no sessions and therefore no check-ins: it is the
  -- early badge pickup desk. Refusing here, not just hiding the button, means
  -- a queued write flushed under the wrong occasion cannot consume anyone's
  -- workshop or conference arrival.
  IF v_occasion = 'community_day' THEN
    INSERT INTO public.door_events (event_type, occasion, outcome, staff_id,
      staff_email, staff_role, station, occurred_at, failure_reason)
    VALUES ('denied', v_occasion, 'denied', v_staff.id, v_staff.email,
      v_staff.role, p_station, v_occurred, 'community_day_badge_only');
    RETURN jsonb_build_object('outcome', 'denied',
      'failureReason', 'community_day_badge_only');
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

COMMENT ON FUNCTION public.door_check_in(UUID, UUID, TEXT, TIMESTAMPTZ, BOOLEAN, TEXT, TEXT) IS 'Admit an attendee by ticket or workshop registration id. Returns {outcome, alreadyCheckedInAt?}. Refuses community_day outright — the warm-up desk hands badges, never check-ins.';

CREATE OR REPLACE FUNCTION public.door_check_in_undo(
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

  -- Nothing can be checked in on community_day, so there is nothing to undo.
  IF v_occasion = 'community_day' THEN
    INSERT INTO public.door_events (event_type, occasion, outcome, staff_id,
      staff_email, staff_role, station, occurred_at, failure_reason)
    VALUES ('denied', v_occasion, 'denied', v_staff.id, v_staff.email,
      v_staff.role, p_station, v_occurred, 'community_day_badge_only');
    RETURN jsonb_build_object('outcome', 'denied',
      'failureReason', 'community_day_badge_only');
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

COMMENT ON FUNCTION public.door_check_in_undo(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT) IS 'Reverse a mistaken check-in, clearing the per-occasion timestamp and appending a check_in_undone audit row. Refuses community_day, where nothing can be checked in.';

-- ============================================
-- Badge pickup: duplicate guard reads the undo-aware state
-- ============================================

CREATE OR REPLACE FUNCTION public.door_badge_pickup(
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
  IF v_occurred < '2026-09-01'::TIMESTAMPTZ THEN v_occurred := NOW(); END IF;
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

  -- The undo-aware read: a badge handed over and then undone can be handed
  -- again, and only a badge currently in their hands reports duplicate.
  v_prior := public.door_badge_picked_up_at(v_ticket_id, v_reg_id);

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

COMMENT ON FUNCTION public.door_badge_pickup(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT) IS 'Record a badge handover, e.g. early pickup on the community day. Moves no check-in state; the latest applied badge event IS the pickup state, so an undone pickup can be handed again.';

-- ============================================
-- Badge pickup undo
-- ============================================

-- The correction for handing the wrong person's badge over, or tapping the
-- button on the wrong row. Appends a badge_pickup_undone event — the audit
-- trail keeps both the mistake and the correction, and the state readers above
-- follow the latest event. `duplicate` means "no pickup to undo", the same
-- already-in-the-desired-state semantics as every other door write, so a
-- queued replay is safe.
CREATE OR REPLACE FUNCTION public.door_badge_pickup_undo(
  p_scanned_id  UUID,
  p_staff_id    UUID,
  p_station     TEXT DEFAULT NULL,
  p_occurred_at TIMESTAMPTZ DEFAULT NULL,
  p_occasion    TEXT DEFAULT NULL,
  p_reason      TEXT DEFAULT NULL
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
  v_ticket_id UUID;
  v_reg_id    UUID;
  v_kind      TEXT;
  v_prior     TIMESTAMPTZ;
BEGIN
  IF v_occurred < '2026-09-01'::TIMESTAMPTZ THEN v_occurred := NOW(); END IF;
  IF v_occurred > NOW() THEN v_occurred := NOW(); END IF;

  SELECT * INTO v_staff FROM public.checkin_staff
    WHERE id = p_staff_id AND is_active;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'denied', 'failureReason', 'staff_not_active');
  END IF;

  -- Whoever can hand a badge over can also take the record back: the mistake
  -- is fixed at the desk it happened at, whatever the role.
  SELECT id INTO v_ticket_id FROM public.tickets WHERE id = p_scanned_id;
  IF FOUND THEN
    v_kind := 'ticket';
  ELSE
    SELECT id INTO v_reg_id FROM public.workshop_registrations WHERE id = p_scanned_id;
    IF NOT FOUND THEN
      INSERT INTO public.door_events (event_type, occasion, outcome, staff_id,
        staff_email, staff_role, station, occurred_at, failure_reason, metadata)
      VALUES ('denied', v_occasion, 'not_found', v_staff.id, v_staff.email,
        v_staff.role, p_station, v_occurred, 'subject_not_found',
        jsonb_build_object('scannedId', p_scanned_id));
      RETURN jsonb_build_object('outcome', 'not_found', 'failureReason', 'subject_not_found');
    END IF;
    v_kind := 'workshop_registration';
  END IF;

  v_prior := public.door_badge_picked_up_at(v_ticket_id, v_reg_id);

  INSERT INTO public.door_events (event_type, occasion, outcome, ticket_id,
    workshop_registration_id, staff_id, staff_email, staff_role, station,
    occurred_at, notes, metadata)
  VALUES ('badge_pickup_undone', v_occasion,
    CASE WHEN v_prior IS NOT NULL THEN 'applied' ELSE 'duplicate' END,
    v_ticket_id, v_reg_id, v_staff.id, v_staff.email, v_staff.role, p_station,
    v_occurred, p_reason, jsonb_build_object('subjectKind', v_kind));

  RETURN jsonb_build_object(
    'outcome', CASE WHEN v_prior IS NOT NULL THEN 'applied' ELSE 'duplicate' END,
    'subjectKind', v_kind
  );
END;
$$;

COMMENT ON FUNCTION public.door_badge_pickup_undo(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT) IS 'Take back a mistaken badge handover by appending a badge_pickup_undone event. duplicate means there was no pickup to undo, so replays are safe; the badge can be handed over again afterwards.';

-- ============================================
-- Goodie undo
-- ============================================

-- Per item, mirroring the per-item handover: undoing the t-shirt leaves the
-- hoodie handed. Clearing an item also clears goodie_handed_at (the "full
-- entitlement satisfied" stamp) because the entitlement is no longer satisfied
-- — the next handover call re-stamps it when everything is back over the
-- counter.
CREATE OR REPLACE FUNCTION public.door_goodie_undo(
  p_ticket_id   UUID,
  p_staff_id    UUID,
  p_station     TEXT DEFAULT NULL,
  p_occurred_at TIMESTAMPTZ DEFAULT NULL,
  p_occasion    TEXT DEFAULT NULL,
  p_reason      TEXT DEFAULT NULL,
  p_undo_tshirt BOOLEAN DEFAULT FALSE,
  p_undo_hoodie BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_staff          public.checkin_staff;
  v_occasion       TEXT := public.door_occasion_or_current(p_occasion);
  v_occurred       TIMESTAMPTZ := COALESCE(p_occurred_at, NOW());
  v_ticket         public.tickets;
  v_tshirt_undone  BOOLEAN := FALSE;
  v_hoodie_undone  BOOLEAN := FALSE;
  v_rows           INT := 0;
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

  IF p_undo_tshirt AND v_ticket.tshirt_handed_at IS NOT NULL THEN
    UPDATE public.tickets SET
      tshirt_handed_at = NULL,
      tshirt_handed_by = NULL,
      updated_at = NOW()
    WHERE id = v_ticket.id AND tshirt_handed_at IS NOT NULL;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_tshirt_undone := v_rows > 0;
  END IF;

  IF p_undo_hoodie AND v_ticket.hoodie_handed_at IS NOT NULL THEN
    UPDATE public.tickets SET
      hoodie_handed_at = NULL,
      hoodie_handed_by = NULL,
      updated_at = NOW()
    WHERE id = v_ticket.id AND hoodie_handed_at IS NOT NULL;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_hoodie_undone := v_rows > 0;
  END IF;

  -- A row from before per-item tracking has goodie_handed_at set but no item
  -- timestamps; undoing either item on such a row must still take the full
  -- stamp back rather than reporting "nothing to undo".
  IF NOT (v_tshirt_undone OR v_hoodie_undone)
     AND (p_undo_tshirt OR p_undo_hoodie)
     AND v_ticket.goodie_handed_at IS NOT NULL
     AND v_ticket.tshirt_handed_at IS NULL
     AND v_ticket.hoodie_handed_at IS NULL THEN
    -- Clear the legacy full-handover stamp and report undo based on whether
    -- the row was actually updated.
    UPDATE public.tickets SET
      goodie_handed_at = NULL,
      goodie_handed_by = NULL,
      updated_at = NOW()
    WHERE id = v_ticket.id AND goodie_handed_at IS NOT NULL;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows > 0 THEN
      v_tshirt_undone := p_undo_tshirt;
      v_hoodie_undone := p_undo_hoodie;
    END IF;
  ELSIF v_tshirt_undone OR v_hoodie_undone THEN
    -- The full-entitlement stamp cannot stand while an item is back on the
    -- table; door_goodie_handover re-stamps it when the follow-up completes.
    UPDATE public.tickets SET
      goodie_handed_at = NULL,
      goodie_handed_by = NULL,
      updated_at = NOW()
    WHERE id = v_ticket.id AND goodie_handed_at IS NOT NULL;
  END IF;

  INSERT INTO public.door_events (event_type, occasion, outcome, ticket_id,
    staff_id, staff_email, staff_role, station, occurred_at, notes, metadata)
  VALUES ('goodie_undone', v_occasion,
    CASE WHEN v_tshirt_undone OR v_hoodie_undone THEN 'applied' ELSE 'duplicate' END,
    v_ticket.id, v_staff.id, v_staff.email, v_staff.role, p_station,
    v_occurred, p_reason,
    jsonb_build_object(
      'tshirtUndone', v_tshirt_undone,
      'hoodieUndone', v_hoodie_undone
    ));

  RETURN jsonb_build_object(
    'outcome', CASE WHEN v_tshirt_undone OR v_hoodie_undone THEN 'applied' ELSE 'duplicate' END,
    'tshirtUndone', v_tshirt_undone,
    'hoodieUndone', v_hoodie_undone
  );
END;
$$;

COMMENT ON FUNCTION public.door_goodie_undo(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT, BOOLEAN, BOOLEAN) IS 'Take back a mistaken goodie handover, per item. Clears the item columns and the full-entitlement stamp and appends a goodie_undone audit row. duplicate means nothing was handed, so replays are safe.';

-- ============================================
-- Resolve and roster prefetch: undo-aware badge state
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
        'pickedUpAt', public.door_badge_picked_up_at(v_ticket.id, NULL)
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
        'pickedUpAt', public.door_badge_picked_up_at(NULL, v_registration.id)
      ),
      'doorNote', NULL,
      'workshops', public.door_workshops_for(NULL, lower(v_registration.email))
    );
  END IF;

  RETURN jsonb_build_object('found', FALSE, 'subjectKind', NULL);
END;
$$;

COMMENT ON FUNCTION public.door_resolve(UUID) IS 'The whole door panel for one scanned UUID. Badge pickup state follows the latest applied badge event, so an undone pickup reads as not picked up.';

CREATE OR REPLACE FUNCTION public.door_badge_pickups()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'subjectId', subject_id,
    'pickedUpAt', occurred_at
  )), '[]'::jsonb)
  FROM (
    -- Latest applied badge event per subject decides; an undone pickup drops
    -- out of the roster payload entirely.
    SELECT DISTINCT ON (COALESCE(ticket_id, workshop_registration_id))
      COALESCE(ticket_id, workshop_registration_id) AS subject_id,
      event_type,
      occurred_at
    FROM public.door_events
    WHERE event_type IN ('badge_pickup', 'badge_pickup_undone')
      AND outcome = 'applied'
      AND (ticket_id IS NOT NULL OR workshop_registration_id IS NOT NULL)
    ORDER BY COALESCE(ticket_id, workshop_registration_id), recorded_at DESC, id DESC
  ) latest
  WHERE latest.event_type = 'badge_pickup';
$$;

COMMENT ON FUNCTION public.door_badge_pickups() IS 'Every badge currently in an attendee''s hands, as (subjectId, pickedUpAt) pairs, for the station roster prefetch. Undone pickups are excluded.';

-- ============================================
-- Dashboard: community_day and net badge counts
-- ============================================

CREATE OR REPLACE FUNCTION public.door_dashboard(p_occasion TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_occasion TEXT := public.door_occasion_or_current(p_occasion);
  v_expected INT;
  v_arrived  INT;
  v_badges   INT;
  v_result   JSONB;
BEGIN
  -- Badges currently in attendees' hands (undone pickups excluded), across
  -- every day — used both as its own tile and as community_day's "arrived".
  SELECT count(*) INTO v_badges FROM (
    SELECT DISTINCT ON (COALESCE(ticket_id, workshop_registration_id)) event_type
    FROM public.door_events
    WHERE event_type IN ('badge_pickup', 'badge_pickup_undone')
      AND outcome = 'applied'
      AND (ticket_id IS NOT NULL OR workshop_registration_id IS NOT NULL)
    ORDER BY COALESCE(ticket_id, workshop_registration_id), recorded_at DESC, id DESC
  ) latest WHERE latest.event_type = 'badge_pickup';

  -- Everyone who could turn up for this occasion.
  --   community_day: anyone who may collect a badge early — both conference
  --                  ticket holders AND workshop-only attendees (who get a
  --                  badge via their registration). "arrived" is badges handed.
  --   workshop_day: confirmed workshop seats, INCLUDING attendees with no
  --                 conference ticket at all.
  --   conference_day: confirmed conference tickets.
  IF v_occasion = 'community_day' THEN
    -- Count confirmed tickets + workshop registrations without a ticket
    SELECT (
      (SELECT count(*) FROM public.tickets WHERE status = 'confirmed') +
      (SELECT count(*) FROM public.workshop_registrations wr
       WHERE wr.status = 'confirmed'
         AND NOT EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = wr.ticket_id))
    ) INTO v_expected;
    v_arrived := v_badges;
  ELSIF v_occasion = 'workshop_day' THEN
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

    'goodieHandedOver', (
      SELECT count(*) FROM public.tickets
      WHERE status = 'confirmed' AND goodie_handed_at IS NOT NULL
    ),

    'badgesPickedUp', v_badges,

    'arrivalsLast15Min', (
      SELECT count(*) FROM public.door_events
      WHERE occasion = v_occasion
        AND event_type IN ('checked_in', 'manual_admit', 'badge_pickup')
        AND outcome = 'applied'
        AND recorded_at > NOW() - INTERVAL '15 minutes'
    ),
    'arrivalsLast5Min', (
      SELECT count(*) FROM public.door_events
      WHERE occasion = v_occasion
        AND event_type IN ('checked_in', 'manual_admit', 'badge_pickup')
        AND outcome = 'applied'
        AND recorded_at > NOW() - INTERVAL '5 minutes'
    ),

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
            WHERE event_type IN ('check_in_undone', 'badge_pickup_undone', 'goodie_undone')
              AND outcome = 'applied'
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
        WHERE occasion = v_occasion
          AND event_type IN ('check_in_undone', 'badge_pickup_undone', 'goodie_undone')
          AND outcome = 'applied'
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

COMMENT ON FUNCTION public.door_dashboard(TEXT) IS 'One small aggregate for the polled live dashboard. community_day counts badge pickups as arrivals; badge counts are net of undos.';

-- ============================================
-- Least privilege
-- ============================================

REVOKE ALL ON FUNCTION public.door_badge_picked_up_at(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.door_badge_pickup_undo(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.door_goodie_undo(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT, BOOLEAN, BOOLEAN) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.door_badge_picked_up_at(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.door_badge_pickup_undo(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.door_goodie_undo(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT, BOOLEAN, BOOLEAN) TO service_role;

COMMIT;
