-- ============================================================================
-- door_goodie_handover: let the caller say whether a hoodie is OWED
--
-- Hoodie eligibility is decided in the application (src/lib/hoodies): a paid
-- VIP ticket, a paid VIP upgrade, a program speaker, or a sponsor comp. A
-- complimentary VIP ticket or a free upgrade earns none. The function used to
-- infer "hoodie owed" from the ticket tier alone, so a comp VIP who took their
-- t-shirt — everything they were owed — never received the full-entitlement
-- stamp (goodie_handed_at), and the door UI and the database disagreed.
--
-- p_hoodie_owed carries the application's verdict. It is computed SERVER-SIDE
-- by the API route from payment metadata, upgrade records and the speaker
-- list — never accepted from the station. NULL keeps the old behaviour (owed
-- iff VIP) so an older caller, or a route whose inputs failed to load, still
-- gets the pre-existing answer rather than an error.
-- ============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.door_goodie_handover(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT);

CREATE FUNCTION public.door_goodie_handover(
  p_ticket_id   UUID,
  p_staff_id    UUID,
  p_station     TEXT DEFAULT NULL,
  p_occurred_at TIMESTAMPTZ DEFAULT NULL,
  p_note        TEXT DEFAULT NULL,
  p_occasion    TEXT DEFAULT NULL,
  p_tshirt_size TEXT DEFAULT NULL,
  p_hoodie_size TEXT DEFAULT NULL,
  p_hoodie_owed BOOLEAN DEFAULT NULL
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
  v_hoodie_owed   BOOLEAN;
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

  -- The application's verdict when given; the tier when not (legacy behaviour).
  v_hoodie_owed := COALESCE(p_hoodie_owed, v_ticket.ticket_type = 'vip');

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

  -- A hoodie physically handed is recorded whether or not it was owed: the
  -- record must describe what left the table, and the audit row below says
  -- whether it should have.
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

  -- Full entitlement: t-shirt for everyone, hoodie only when one is owed.
  v_fully_handed := v_ticket.tshirt_handed_at IS NOT NULL
    AND (NOT v_hoodie_owed OR v_ticket.hoodie_handed_at IS NOT NULL);

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
      'hoodieNewThisCall', v_hoodie_new,
      'hoodieOwed', v_hoodie_owed
    ));

  RETURN jsonb_build_object(
    'outcome', CASE WHEN v_anything_new THEN 'applied' ELSE 'duplicate' END,
    'tshirtHandedAt', v_ticket.tshirt_handed_at,
    'hoodieHandedAt', v_ticket.hoodie_handed_at,
    'hoodieOwed', v_hoodie_owed,
    'fullyHanded', v_fully_handed
  );
END;
$$;

COMMENT ON FUNCTION public.door_goodie_handover(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, BOOLEAN) IS 'Record a goodie-bag handover per item. A partial handover (t-shirt only) allows a follow-up call to complete the hoodie. goodie_handed_at is set only when the full entitlement is satisfied; p_hoodie_owed is the application''s eligibility verdict (NULL = owed iff VIP).';

COMMIT;
