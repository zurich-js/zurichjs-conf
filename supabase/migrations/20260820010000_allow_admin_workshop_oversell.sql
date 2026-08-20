-- Allow admin flows to oversell a workshop
-- B2B seats are negotiated offline, so admin invoicing must never be blocked by
-- remaining capacity — it warns instead. Public Stripe checkout keeps refusing
-- oversold seats: the atomic insert only bypasses the capacity gate when the
-- caller explicitly asks for it.

BEGIN;

-- Capacity becomes advisory at the table level; the insert function below is
-- what still protects the public purchase path.
ALTER TABLE workshops DROP CONSTRAINT IF EXISTS valid_enrolled;
ALTER TABLE workshops ADD CONSTRAINT valid_enrolled CHECK (enrolled_count >= 0);

COMMENT ON COLUMN workshops.enrolled_count IS
  'Auto-updated count of confirmed registrations. May exceed capacity when an admin deliberately oversells (e.g. B2B invoice fulfilment).';

-- Replace the 17-argument signature with one that takes p_allow_oversell.
-- Dropping first avoids an ambiguous overload for existing 17-argument callers.
DROP FUNCTION IF EXISTS insert_workshop_registration_atomic(
  UUID, UUID, UUID, TEXT, TEXT, INTEGER, TEXT, payment_status,
  TEXT, TEXT, TEXT, TEXT, UUID, UUID, INTEGER, INTEGER, JSONB
);

CREATE OR REPLACE FUNCTION insert_workshop_registration_atomic(
  p_workshop_id UUID,
  p_user_id UUID,
  p_ticket_id UUID,
  p_stripe_session_id TEXT,
  p_stripe_payment_intent_id TEXT,
  p_amount_paid INTEGER,
  p_currency TEXT,
  p_status payment_status,
  p_first_name TEXT,
  p_last_name TEXT,
  p_email TEXT,
  p_coupon_code TEXT,
  p_partnership_coupon_id UUID,
  p_partnership_voucher_id UUID,
  p_discount_amount INTEGER,
  p_seat_index INTEGER,
  p_metadata JSONB,
  p_allow_oversell BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  registration workshop_registrations,
  was_oversold BOOLEAN,
  was_duplicate BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing workshop_registrations;
  v_workshop workshops;
  v_new workshop_registrations;
  v_oversold BOOLEAN := FALSE;
BEGIN
  -- Idempotency: if a row already exists for this (session, workshop, seat), return it.
  SELECT * INTO v_existing
  FROM workshop_registrations
  WHERE stripe_session_id = p_stripe_session_id
    AND workshop_id = p_workshop_id
    AND seat_index = p_seat_index
  LIMIT 1;

  IF FOUND THEN
    registration := v_existing;
    was_oversold := FALSE;
    was_duplicate := TRUE;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Lock the workshop row so concurrent inserts serialize on capacity.
  SELECT * INTO v_workshop
  FROM workshops
  WHERE id = p_workshop_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workshop % not found', p_workshop_id USING ERRCODE = 'P0002';
  END IF;

  -- Capacity check only when the incoming registration is confirmed (pending/cancelled
  -- don't count toward enrolled_count — the existing trigger mirrors this rule).
  IF p_status = 'confirmed' AND v_workshop.enrolled_count >= v_workshop.capacity THEN
    IF NOT p_allow_oversell THEN
      registration := NULL;
      was_oversold := TRUE;
      was_duplicate := FALSE;
      RETURN NEXT;
      RETURN;
    END IF;

    -- Admin override: insert anyway and report the oversell alongside the row.
    v_oversold := TRUE;
  END IF;

  INSERT INTO workshop_registrations (
    workshop_id,
    user_id,
    ticket_id,
    stripe_session_id,
    stripe_payment_intent_id,
    amount_paid,
    currency,
    status,
    first_name,
    last_name,
    email,
    coupon_code,
    partnership_coupon_id,
    partnership_voucher_id,
    discount_amount,
    seat_index,
    metadata
  ) VALUES (
    p_workshop_id,
    p_user_id,
    p_ticket_id,
    p_stripe_session_id,
    p_stripe_payment_intent_id,
    p_amount_paid,
    p_currency,
    p_status,
    p_first_name,
    p_last_name,
    p_email,
    p_coupon_code,
    p_partnership_coupon_id,
    p_partnership_voucher_id,
    p_discount_amount,
    p_seat_index,
    p_metadata
  )
  RETURNING * INTO v_new;

  registration := v_new;
  was_oversold := v_oversold;
  was_duplicate := FALSE;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION insert_workshop_registration_atomic IS
  'Atomic capacity-checked workshop registration insert. p_allow_oversell lets admin flows (B2B invoices) exceed capacity; the row is still returned with was_oversold = true so the caller can warn.';

COMMIT;
