-- Migration: Add session_feedback table
-- Created: 2026-09-06
--
-- Attendee feedback for talks, panels and workshops, collected from the public
-- /schedule page while the conference is running. Each row is one anonymous
-- browser's rating of one schedule item. Submissions are anonymous: the only
-- identity is a random client id the browser generates once and keeps in
-- localStorage, which exists purely to stop the same browser from rating the
-- same session twice (the UNIQUE constraint below is the server-side half of
-- that guard; the client also hides the form after a submission).

BEGIN;

CREATE TABLE IF NOT EXISTS public.session_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_item_id UUID NOT NULL REFERENCES public.program_schedule_items(id) ON DELETE CASCADE,
  -- Denormalised so feedback survives a schedule item being re-pointed at a
  -- different session (or the item being removed and recreated).
  session_id UUID REFERENCES public.program_sessions(id) ON DELETE SET NULL,
  client_id TEXT NOT NULL CHECK (char_length(client_id) BETWEEN 8 AND 64),
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT CHECK (comment IS NULL OR char_length(comment) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT session_feedback_one_per_client UNIQUE (schedule_item_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_session_feedback_schedule_item
  ON public.session_feedback (schedule_item_id);

CREATE INDEX IF NOT EXISTS idx_session_feedback_created_at
  ON public.session_feedback (created_at DESC);

COMMENT ON TABLE public.session_feedback IS 'Anonymous attendee ratings of scheduled sessions, submitted from the public schedule during the conference';
COMMENT ON COLUMN public.session_feedback.client_id IS 'Random per-browser id from localStorage. Not an identity — only used to reject a second rating of the same session from the same browser.';
COMMENT ON COLUMN public.session_feedback.rating IS '1 (poor) to 5 (excellent)';

-- RLS: service role only. Written by the public feedback API (which validates
-- the session has actually started) and read by the admin feedback API.
ALTER TABLE public.session_feedback ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.session_feedback FROM anon;
REVOKE ALL ON TABLE public.session_feedback FROM authenticated;
GRANT ALL ON TABLE public.session_feedback TO service_role;

COMMIT;
