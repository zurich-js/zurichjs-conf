-- Migration: Track plus ones for the speaker hangout activities (Sep 12)
-- Created: 2026-07-28
--
-- The speakers dinner (Sep 10) and VIP after party (Sep 11) already capture
-- whether a speaker brings a plus one. The Sep 12 speaker hangout activities
-- need the same headcount signal so the team can plan capacity for the day.

BEGIN;

ALTER TABLE cfp_speaker_logistics
  ADD COLUMN IF NOT EXISTS speaker_hangout_plus_one BOOLEAN;

COMMENT ON COLUMN cfp_speaker_logistics.speaker_hangout_plus_one IS 'Whether the speaker brings a plus one to the speaker hangout activities (Sep 12)';

COMMIT;
