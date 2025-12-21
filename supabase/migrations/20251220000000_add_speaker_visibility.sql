-- Add visibility control for public speaker lineup display
-- Speakers can be accepted but not shown publicly until this flag is true

ALTER TABLE cfp_speakers
ADD COLUMN is_visible BOOLEAN NOT NULL DEFAULT false;

-- Add comment explaining the field
COMMENT ON COLUMN cfp_speakers.is_visible IS 'Controls whether the speaker appears in the public speaker lineup. Allows accepted speakers to be hidden until ready for announcement.';

-- Create an index for efficient querying of visible speakers
CREATE INDEX idx_cfp_speakers_is_visible ON cfp_speakers (is_visible) WHERE is_visible = true;
