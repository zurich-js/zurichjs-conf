BEGIN;

CREATE INDEX IF NOT EXISTS idx_cfp_submissions_accepted_speaker_id
  ON public.cfp_submissions(speaker_id)
  WHERE status = 'accepted';

CREATE INDEX IF NOT EXISTS idx_cfp_speakers_visible_featured_first_name
  ON public.cfp_speakers(is_featured DESC, first_name ASC)
  WHERE is_visible IS TRUE;

CREATE INDEX IF NOT EXISTS idx_program_schedule_items_public_order
  ON public.program_schedule_items(date ASC, start_time ASC)
  WHERE is_visible IS TRUE;

CREATE INDEX IF NOT EXISTS idx_tickets_confirmed_stage_category
  ON public.tickets(ticket_stage, ticket_category)
  WHERE status = 'confirmed';

COMMIT;
