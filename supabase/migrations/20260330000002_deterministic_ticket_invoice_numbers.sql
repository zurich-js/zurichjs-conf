-- Deterministic Ticket Invoice Numbering
-- Replaces the sequential-on-insert trigger with one that derives the invoice
-- number from the primary ticket's purchase position among all sessions in the
-- same calendar year.
--
-- Result: TI-{purchase_year}-{NNNN}
--   - purchase_year comes from the primary ticket's created_at (not NOW())
--   - NNNN is the 1-based rank of this session ordered by the earliest ticket
--     created_at in the session, with the ticket UUID as a stable tiebreaker
--
-- This makes the invoice number fully deterministic from ticket data:
-- the same primary_ticket_id always produces the same invoice number,
-- regardless of when the invoice record is inserted.

CREATE OR REPLACE FUNCTION generate_ticket_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  purchase_year  TEXT;
  purchase_time  TIMESTAMPTZ;
  purchase_uuid  UUID;
  next_number    INTEGER;
BEGIN
  -- Resolve the primary ticket's purchase timestamp
  SELECT created_at, id
  INTO   purchase_time, purchase_uuid
  FROM   tickets
  WHERE  id = NEW.primary_ticket_id;

  IF purchase_time IS NULL THEN
    -- Fallback: primary ticket not found (should not happen in normal flow)
    purchase_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    purchase_time := NOW();
    purchase_uuid := NEW.primary_ticket_id;
  ELSE
    purchase_year := EXTRACT(YEAR FROM purchase_time)::TEXT;
  END IF;

  -- Rank this session among all sessions that share the same purchase year.
  -- Each session is represented by its earliest ticket (MIN created_at),
  -- with MIN(id) as a stable UUID tiebreaker for identical timestamps.
  SELECT COUNT(*) + 1
  INTO   next_number
  FROM (
    SELECT
      MIN(created_at) AS first_at,
      MIN(id)         AS first_id
    FROM   tickets
    WHERE  EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM purchase_time)
    GROUP  BY stripe_session_id
  ) sessions
  WHERE sessions.first_at < purchase_time
     OR (sessions.first_at = purchase_time AND sessions.first_id < purchase_uuid);

  NEW.invoice_number :=
    'TI-' || purchase_year || '-' || LPAD(next_number::TEXT, 4, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_ticket_invoice_number() IS
  'Assigns a deterministic TI-YYYY-NNNN invoice number based on the purchase '
  'session''s chronological position among all sessions in the same year. '
  'The number is stable: the same primary_ticket_id always yields the same number.';
