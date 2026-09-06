-- ============================================================================
-- Hoodie eligibility, decided in the database
--
-- Who gets a VIP hoodie (mirrors src/lib/hoodies/allocation.ts, which the
-- admin fulfilment view uses — keep the two in step):
--   - program speakers (admin-managed, featured, visible, or with an accepted
--     submission, own or as co-speaker), on ANY ticket
--   - sponsor comps, however the ticket became VIP
--   - a paid VIP ticket
--   - a paid VIP upgrade
-- Nobody else: a complimentary VIP ticket or a complimentary upgrade earns
-- none, and the exclusion code says which so the door can explain it.
--
-- WHY HERE AND NOT IN THE API
-- door_goodie_handover already has the ticket row in hand when it decides
-- whether the full entitlement is satisfied, so deciding here costs no extra
-- round trip; deciding in the route cost four (ticket, upgrades, and the
-- speaker list twice over) per handover. The roster picks the same verdicts
-- up as one small set in the parallel batch it already runs.
-- ============================================================================

BEGIN;

-- Why this ticket gets NO hoodie, or NULL when it does.
-- Codes: not_vip | complimentary_vip_ticket | complimentary_upgrade | upgrade_record_missing
CREATE OR REPLACE FUNCTION public.door_hoodie_exclusion(t public.tickets)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_upgrade_ref TEXT := COALESCE(t.metadata->>'upgrade_id', t.metadata->>'upgraded_from');
  v_upgrade     public.ticket_upgrades;
BEGIN
  -- A speaker gets one whatever they hold.
  IF EXISTS (
    SELECT 1 FROM public.cfp_speakers s
    WHERE lower(s.email) = lower(trim(t.email))
      AND (s.is_admin_managed OR s.is_featured OR s.is_visible
        OR EXISTS (
          SELECT 1 FROM public.cfp_submissions sub
          WHERE sub.status = 'accepted'
            AND (sub.speaker_id = s.id OR EXISTS (
              SELECT 1 FROM public.cfp_submission_speakers ss
              WHERE ss.submission_id = sub.id AND ss.speaker_id = s.id)))))
  THEN RETURN NULL; END IF;

  -- The sponsor exception wins however the ticket became VIP.
  IF lower(trim(COALESCE(t.metadata->>'complimentaryReason', ''))) = 'sponsor' THEN RETURN NULL; END IF;

  IF t.ticket_category <> 'vip' THEN RETURN 'not_vip'; END IF;

  -- Upgraded tickets are judged by the upgrade's payment mode, never by the
  -- ticket's own amount_paid (that is what they paid for the original tier).
  IF v_upgrade_ref IS NOT NULL THEN
    IF t.metadata->>'upgrade_id' IS NULL THEN RETURN 'upgrade_record_missing'; END IF;
    SELECT * INTO v_upgrade FROM public.ticket_upgrades u WHERE u.id::text = t.metadata->>'upgrade_id';
    IF NOT FOUND THEN RETURN 'upgrade_record_missing'; END IF;
    IF v_upgrade.upgrade_mode = 'complimentary' THEN
      IF v_upgrade.admin_note ~* 'sponsor' THEN RETURN NULL; END IF;
      RETURN 'complimentary_upgrade';
    END IF;
    RETURN NULL;
  END IF;

  IF t.metadata->>'paymentType' = 'complimentary' OR t.amount_paid <= 0 THEN
    RETURN 'complimentary_vip_ticket';
  END IF;
  RETURN NULL;
END;
$$;
COMMENT ON FUNCTION public.door_hoodie_exclusion(public.tickets) IS 'Why a ticket earns no hoodie (not_vip, complimentary_vip_ticket, complimentary_upgrade, upgrade_record_missing), or NULL when it does. Mirrors src/lib/hoodies/allocation.ts.';

-- Every confirmed ticket's verdict, for the station roster prefetch.
-- Tickets that were simply never in the running (not_vip) are omitted: the
-- roster treats a missing row as "no hoodie, nothing to explain".
CREATE OR REPLACE FUNCTION public.door_hoodie_verdicts()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'ticketId', v.id,
    'exclusion', v.exclusion
  )), '[]'::jsonb)
  FROM (
    SELECT t.id, public.door_hoodie_exclusion(t) AS exclusion
    FROM public.tickets t
    WHERE t.status = 'confirmed'
  ) v
  WHERE v.exclusion IS DISTINCT FROM 'not_vip';
$$;
COMMENT ON FUNCTION public.door_hoodie_verdicts() IS 'Hoodie verdict per confirmed ticket as (ticketId, exclusion) pairs; exclusion NULL = a hoodie is owed. Tickets never in the running are omitted.';

REVOKE ALL ON FUNCTION public.door_hoodie_exclusion(public.tickets) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.door_hoodie_verdicts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.door_hoodie_exclusion(public.tickets) TO service_role;
GRANT EXECUTE ON FUNCTION public.door_hoodie_verdicts() TO service_role;

-- ============================================
-- door_goodie_handover: full entitlement follows the verdict, not the tier
-- Same signature as before; only v_is_vip's derivation changes.
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

  -- Owed per the fulfilment rule, not the tier: a comp VIP is done once the
  -- t-shirt is over the counter.
  v_hoodie_owed := public.door_hoodie_exclusion(v_ticket) IS NULL;

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
  -- record must describe what left the table.
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
    'fullyHanded', v_fully_handed
  );
END;
$$;

COMMENT ON FUNCTION public.door_goodie_handover(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT) IS 'Record a goodie-bag handover per item. A partial handover (t-shirt only) allows a follow-up call to complete the hoodie. goodie_handed_at is set only when the full entitlement — decided by door_hoodie_exclusion — is satisfied.';
REVOKE ALL ON FUNCTION public.door_goodie_handover(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.door_goodie_handover(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT) TO service_role;

COMMIT;
