BEGIN;

CREATE OR REPLACE FUNCTION public.get_program_speaker_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM (
    SELECT speaker.id
    FROM public.cfp_speakers AS speaker
    WHERE speaker.is_admin_managed IS TRUE
       OR speaker.is_featured IS TRUE
       OR speaker.is_visible IS TRUE

    UNION

    SELECT submission.speaker_id AS id
    FROM public.cfp_submissions AS submission
    WHERE submission.status = 'accepted'
  ) AS program_speakers;
$$;

REVOKE ALL ON FUNCTION public.get_program_speaker_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_program_speaker_count() TO service_role;

COMMIT;
