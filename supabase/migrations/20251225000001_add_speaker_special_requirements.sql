-- Add special requirements field to cfp_speakers
-- This field stores accessibility needs, dietary restrictions, A/V requirements, etc.

ALTER TABLE cfp_speakers
ADD COLUMN IF NOT EXISTS special_requirements TEXT;

COMMENT ON COLUMN cfp_speakers.special_requirements IS 'Accessibility needs, dietary restrictions, or other requirements';
