drop extension if exists "pg_net";

alter table "public"."cfp_submission_speakers" enable row level security;

alter table "public"."program_schedule_items" enable row level security;

alter table "public"."program_session_speakers" enable row level security;

alter table "public"."program_sessions" enable row level security;

alter table "public"."ticket_invoices" enable row level security;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.generate_ticket_invoice_number()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

-- Intentionally do not recreate Supabase-managed storage triggers here.
-- This file came from a remote schema sync, and fresh migration runs can fail
-- if provider-managed triggers such as `storage.protect_delete()` are replayed.
