-- Multi-seat workshop registrations.
-- A single checkout session can now purchase multiple seats for the same
-- workshop, each recorded as its own registration row so we can attach
-- individual attendee info (mirrors how tickets work).

-- 1. Add seat_index to distinguish seats within the same (session, workshop).
ALTER TABLE workshop_registrations
  ADD COLUMN IF NOT EXISTS seat_index INTEGER NOT NULL DEFAULT 0;

-- 2. Drop the old per-(session,workshop) unique index so multi-seat inserts work.
DROP INDEX IF EXISTS uq_workshop_registrations_session_workshop;

-- 3. New uniqueness: one row per (session, workshop, seat_index).
CREATE UNIQUE INDEX IF NOT EXISTS uq_workshop_registrations_session_workshop_seat
  ON workshop_registrations(stripe_session_id, workshop_id, seat_index);

COMMENT ON COLUMN workshop_registrations.seat_index IS '0-based index within a multi-seat purchase for this (stripe_session_id, workshop_id).';

-- 4. RLS policies for workshop_registrations (N1).
-- Registrants can see their own rows; service role bypasses RLS for the webhook.
ALTER TABLE workshop_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workshop_registrations_select_own" ON workshop_registrations;
CREATE POLICY "workshop_registrations_select_own"
  ON workshop_registrations
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR email = (auth.jwt() ->> 'email')
  );

-- 5. Atomic capacity-checked insert for workshop registrations (B6).
-- Returns the created row, or signals oversold so the webhook can refund.
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
  p_metadata JSONB
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
    registration := NULL;
    was_oversold := TRUE;
    was_duplicate := FALSE;
    RETURN NEXT;
    RETURN;
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
  was_oversold := FALSE;
  was_duplicate := FALSE;
  RETURN NEXT;
END;
$$;
