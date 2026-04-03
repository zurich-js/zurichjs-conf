-- Fix: MIN(uuid) is not supported in PostgreSQL — cast to TEXT for the tiebreaker.

CREATE OR REPLACE FUNCTION generate_ticket_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  purchase_year  TEXT;
  purchase_time  TIMESTAMPTZ;
  purchase_uuid  TEXT;
  next_number    INTEGER;
BEGIN
  -- Resolve the primary ticket's purchase timestamp
  SELECT created_at, id::TEXT
  INTO   purchase_time, purchase_uuid
  FROM   tickets
  WHERE  id = NEW.primary_ticket_id;

  IF purchase_time IS NULL THEN
    purchase_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    purchase_time := NOW();
    purchase_uuid := NEW.primary_ticket_id::TEXT;
  ELSE
    purchase_year := EXTRACT(YEAR FROM purchase_time)::TEXT;
  END IF;

  -- Rank this session among all sessions in the same purchase year.
  -- UUID cast to TEXT for MIN() aggregate (Postgres has no MIN(uuid) built-in).
  SELECT COUNT(*) + 1
  INTO   next_number
  FROM (
    SELECT
      MIN(created_at)  AS first_at,
      MIN(id::TEXT)    AS first_id
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
