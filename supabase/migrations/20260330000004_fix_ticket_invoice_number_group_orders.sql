-- Fix deterministic invoice number for group orders.
--
-- Previous bug: the trigger used primary_ticket_id.created_at as the session's
-- "purchase time". For group orders the primary ticket may not be the first ticket
-- created in the session, causing the COUNT to include the current session in its
-- own rank and producing a number that collides with another invoice.
--
-- Fix:
--   1. Rank by the session's FIRST ticket (MIN created_at in the session), not
--      the primary ticket — this is the true purchase timestamp for the order.
--   2. Exclude the current session (stripe_session_id) from the COUNT so the
--      session never counts itself regardless of timestamp differences.

CREATE OR REPLACE FUNCTION generate_ticket_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  purchase_year    TEXT;
  session_first_at TIMESTAMPTZ;
  session_first_id TEXT;
  next_number      INTEGER;
BEGIN
  -- Use the earliest ticket in this session as the session's purchase timestamp.
  SELECT MIN(created_at), MIN(id::TEXT)
  INTO   session_first_at, session_first_id
  FROM   tickets
  WHERE  stripe_session_id = NEW.stripe_session_id;

  IF session_first_at IS NULL THEN
    -- Fallback: no tickets found (should not happen in normal flow)
    purchase_year    := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    session_first_at := NOW();
    session_first_id := NEW.primary_ticket_id::TEXT;
  ELSE
    purchase_year := EXTRACT(YEAR FROM session_first_at)::TEXT;
  END IF;

  -- Count sessions whose first ticket was created before this session's first ticket.
  -- Exclude the current session so it never inflates its own rank.
  SELECT COUNT(*) + 1
  INTO   next_number
  FROM (
    SELECT
      MIN(created_at) AS first_at,
      MIN(id::TEXT)   AS first_id,
      stripe_session_id
    FROM   tickets
    WHERE  EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM session_first_at)
    GROUP  BY stripe_session_id
  ) sessions
  WHERE  sessions.stripe_session_id != NEW.stripe_session_id
    AND  (
      sessions.first_at < session_first_at
      OR (sessions.first_at = session_first_at AND sessions.first_id < session_first_id)
    );

  NEW.invoice_number :=
    'TI-' || purchase_year || '-' || LPAD(next_number::TEXT, 4, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
