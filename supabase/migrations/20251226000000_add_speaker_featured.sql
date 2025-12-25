-- Add featured flag for speakers to highlight them on the homepage
-- Featured speakers appear first in the public speaker lineup

ALTER TABLE cfp_speakers
ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT false;

-- Add comment explaining the field
COMMENT ON COLUMN cfp_speakers.is_featured IS 'Featured speakers are displayed prominently at the top of the speaker lineup and on the homepage.';

-- Create an index for efficient querying of featured speakers
CREATE INDEX idx_cfp_speakers_is_featured ON cfp_speakers (is_featured) WHERE is_featured = true;
