-- Prevent new CFP submissions after close date unless inserted directly via SQL (no JWT context).

CREATE OR REPLACE FUNCTION public.block_closed_cfp_submission_creation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  close_at CONSTANT timestamptz := '2026-04-03T21:59:59Z'::timestamptz;
  jwt_role text := COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), '');
BEGIN
  IF now() < close_at THEN
    RETURN NEW;
  END IF;

  -- Allow manual SQL operations from Supabase SQL editor / direct SQL connections.
  IF jwt_role = '' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'CFP is closed. New submissions cannot be created.'
    USING ERRCODE = 'P0001';
END;
$$;

DROP TRIGGER IF EXISTS block_closed_cfp_submission_creation_trigger ON public.cfp_submissions;

CREATE TRIGGER block_closed_cfp_submission_creation_trigger
  BEFORE INSERT ON public.cfp_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.block_closed_cfp_submission_creation();

-- Prevent marking submissions as submitted after CFP close, unless done via manual SQL context.

CREATE OR REPLACE FUNCTION public.block_closed_cfp_submit_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  close_at CONSTANT timestamptz := '2026-04-03T21:59:59Z'::timestamptz;
  jwt_role text := COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), '');
  status_to_submitted boolean := (OLD.status IS DISTINCT FROM 'submitted' AND NEW.status = 'submitted');
  first_submit_timestamp boolean := (OLD.submitted_at IS NULL AND NEW.submitted_at IS NOT NULL);
BEGIN
  IF now() < close_at THEN
    RETURN NEW;
  END IF;

  -- Allow manual SQL operations from Supabase SQL editor / direct SQL connections.
  IF jwt_role = '' THEN
    RETURN NEW;
  END IF;

  IF status_to_submitted OR first_submit_timestamp THEN
    RAISE EXCEPTION 'CFP is closed. Submissions can no longer be submitted.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS block_closed_cfp_submit_transition_trigger ON public.cfp_submissions;

CREATE TRIGGER block_closed_cfp_submit_transition_trigger
  BEFORE UPDATE ON public.cfp_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.block_closed_cfp_submit_transition();
