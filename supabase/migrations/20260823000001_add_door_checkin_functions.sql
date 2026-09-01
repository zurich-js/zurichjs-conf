-- Door check-in functions: resolve a scan, check in, hand over a goodie bag.
--
-- All three are SECURITY DEFINER with a pinned search_path, EXECUTE revoked
-- from PUBLIC and granted only to service_role -- matching the pattern
-- established by insert_workshop_registration_atomic. That keeps the column
-- projection unbypassable: the door screen receives exactly these fields and
-- no attendee's Stripe identifiers, and hiding a UI control is not relied on
-- as a privacy boundary.
--
-- Why one function per action rather than PostgREST queries: the current flow
-- costs up to seven sequential HTTP round trips per workshop scan (a wasted
-- tickets probe, the registration, a separate query for the workshop title,
-- then all of it again on the write). Each function here is one round trip and
-- one commit, which is also what makes the audit row free -- it shares the
-- check-in's commit, so it costs no extra fsync.

BEGIN;

-- ============================================
-- Occasion
-- ============================================

-- The occasion is derived from the server clock, never supplied by the client.
-- A station with a wrong date, or a tab left open across midnight, would
-- otherwise write the wrong day into a table that cannot be corrected.
--
-- Dates match src/data/public-program.ts: workshop day 2026-09-10, conference
-- day 2026-09-11. Anything on or before the workshop day resolves to
-- workshop_day so a rehearsal the week before behaves sensibly; anything after
-- resolves to conference_day.
CREATE OR REPLACE FUNCTION public.door_current_occasion()
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN (NOW() AT TIME ZONE 'Europe/Zurich')::date <= DATE '2026-09-10'
      THEN 'workshop_day'
    ELSE 'conference_day'
  END;
$$;

COMMENT ON FUNCTION public.door_current_occasion() IS 'Which check-in occasion "now" falls in, evaluated in Europe/Zurich. Server-side so a device clock cannot mislabel an audit row.';

-- ============================================
-- Resolve a scan
-- ============================================

-- Returns the whole door panel for one scanned UUID, spanning both id spaces.
--
-- Deliberately does NOT filter by status. A refunded or cancelled ticket must
-- resolve and be shown as refused, with the reason: filtering it out makes it
-- indistinguishable from a stranger's UUID, and the documented remedy for
-- "not in roster" is to issue a ticket -- which would mint a free one for a
-- charged-back attendee.
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
      'doorNote', NULL,
      'workshops', public.door_workshops_for(NULL, lower(v_registration.email))
    );
  END IF;

  RETURN jsonb_build_object('found', FALSE, 'subjectKind', NULL);
END;
$$;

COMMENT ON FUNCTION public.door_resolve(UUID) IS 'The whole door panel for one scanned UUID, across both the ticket and workshop-registration id spaces. Returns refused subjects rather than hiding them.';

-- ============================================
-- Workshop seats belonging to a person
-- ============================================

-- Seat ownership cannot be decided on ticket_id alone.
-- findTicketIdForSession resolves ONE ticket per Stripe session and stamps it
-- on EVERY seat in that session, so a purchaser's ticket absorbs their
-- colleagues' seats. Meanwhile workshop-only, separately-purchased and all
-- admin-issued seats carry ticket_id = NULL.
--
-- Precedence, which matters because getting it backwards paints the buyer's
-- name on a colleague's scan:
--   1. a seat whose own email matches the person's email IS theirs;
--   2. a seat sharing their ticket_id is theirs ONLY if it carries no
--      conflicting email of its own.
-- Seats matched by rule 2 that name someone else are reported separately as
-- purchasedForOthers, so the panel can say "bought 3 seats for colleagues"
-- without claiming the person is attending them.
CREATE OR REPLACE FUNCTION public.door_workshops_for(
  p_ticket_id UUID,
  p_email     TEXT
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH seats AS (
    SELECT r.*,
      CASE
        WHEN p_email IS NOT NULL AND lower(r.email) = p_email THEN 'own_email'
        WHEN p_ticket_id IS NOT NULL AND r.ticket_id = p_ticket_id
             AND (r.email IS NULL OR lower(r.email) = p_email) THEN 'own_ticket'
        ELSE 'other_person'
      END AS match_rule
    FROM public.workshop_registrations r
    WHERE r.status = 'confirmed'
      AND (
        (p_email IS NOT NULL AND lower(r.email) = p_email)
        OR (p_ticket_id IS NOT NULL AND r.ticket_id = p_ticket_id)
      )
  )
  SELECT jsonb_build_object(
    'held', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
          'registrationId', s.id,
          'workshopId',     w.id,
          'title',          w.title,
          'room',           w.room,
          'date',           w.date,
          'startTime',      w.start_time,
          'endTime',        w.end_time,
          'seatIndex',      s.seat_index,
          'checkedInAt',    s.checked_in_at,
          'matchedBy',      s.match_rule
        ) ORDER BY w.start_time NULLS LAST, w.title)
        FROM seats s JOIN public.workshops w ON w.id = s.workshop_id
        WHERE s.match_rule <> 'other_person'),
      '[]'::jsonb
    ),
    'purchasedForOthers', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
          'registrationId', s.id,
          'title',          w.title,
          'attendeeEmail',  s.email
        ) ORDER BY w.title)
        FROM seats s JOIN public.workshops w ON w.id = s.workshop_id
        WHERE s.match_rule = 'other_person'),
      '[]'::jsonb
    )
  );
$$;

COMMENT ON FUNCTION public.door_workshops_for(UUID, TEXT) IS 'Workshop seats belonging to a person. Matches on the seat''s own email first, falling back to a shared ticket_id only when the seat names nobody else -- because one ticket_id is stamped on every seat of a Stripe session.';

-- ============================================
-- Check in
-- ============================================

-- One round trip: authorise, apply the conditional update, write the audit
-- row, all in one commit. Returns the outcome so the UI can be honest about a
-- duplicate rather than reporting a second success.
CREATE OR REPLACE FUNCTION public.door_check_in(
  p_scanned_id  UUID,
  p_staff_id    UUID,
  p_station     TEXT DEFAULT NULL,
  p_occurred_at TIMESTAMPTZ DEFAULT NULL,
  p_manual      BOOLEAN DEFAULT FALSE,
  p_reason      TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_staff       public.checkin_staff;
  v_occasion    TEXT := public.door_current_occasion();
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

COMMENT ON FUNCTION public.door_check_in(UUID, UUID, TEXT, TIMESTAMPTZ, BOOLEAN, TEXT) IS 'Authorise, check in and audit in one commit. Returns applied | duplicate | denied | not_found so the UI never reports a second success.';

-- ============================================
-- Goodie handover
-- ============================================

CREATE OR REPLACE FUNCTION public.door_goodie_handover(
  p_ticket_id   UUID,
  p_staff_id    UUID,
  p_station     TEXT DEFAULT NULL,
  p_occurred_at TIMESTAMPTZ DEFAULT NULL,
  p_note        TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_staff    public.checkin_staff;
  v_occasion TEXT := public.door_current_occasion();
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
    staff_id, staff_email, staff_role, station, occurred_at, notes)
  VALUES ('goodie_handed', v_occasion,
    CASE WHEN v_updated > 0 THEN 'applied' ELSE 'duplicate' END,
    v_ticket.id, v_staff.id, v_staff.email, v_staff.role, p_station,
    v_occurred, p_note);

  RETURN jsonb_build_object(
    'outcome', CASE WHEN v_updated > 0 THEN 'applied' ELSE 'duplicate' END,
    'alreadyHandedAt', CASE WHEN v_updated = 0 THEN to_jsonb(v_ticket.goodie_handed_at) END
  );
END;
$$;

COMMENT ON FUNCTION public.door_goodie_handover(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT) IS 'Record a goodie-bag handover once per ticket. Keyed on the ticket, so two lanes cannot both hand over.';

-- ============================================
-- Least privilege
-- ============================================

-- Revoking from PUBLIC is NOT sufficient on a Supabase project. Its base setup
-- runs ALTER DEFAULT PRIVILEGES ... GRANT ALL ON FUNCTIONS TO anon,
-- authenticated, service_role, which grants EXECUTE to those roles DIRECTLY --
-- and a direct grant survives a revoke from PUBLIC. Without the two extra
-- revokes below, every function here would be callable by anyone holding the
-- publishable key, which ships in the client bundle by design.
--
-- That matters most for door_resolve: it is SECURITY DEFINER and returns
-- attendee names, emails and apparel sizes for any ticket UUID.
REVOKE ALL ON FUNCTION public.door_current_occasion() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.door_resolve(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.door_workshops_for(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.door_check_in(UUID, UUID, TEXT, TIMESTAMPTZ, BOOLEAN, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.door_goodie_handover(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.door_current_occasion() TO service_role;
GRANT EXECUTE ON FUNCTION public.door_resolve(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.door_workshops_for(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.door_check_in(UUID, UUID, TEXT, TIMESTAMPTZ, BOOLEAN, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.door_goodie_handover(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT) TO service_role;

COMMIT;
