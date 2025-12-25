-- Add travel and location fields to cfp_speakers
-- These fields help with travel logistics planning at the profile level

-- Add city field for speaker location
ALTER TABLE cfp_speakers
ADD COLUMN IF NOT EXISTS city TEXT;

-- Add country field for speaker location
ALTER TABLE cfp_speakers
ADD COLUMN IF NOT EXISTS country TEXT;

-- Add travel assistance flag at speaker level (separate from submission-level)
ALTER TABLE cfp_speakers
ADD COLUMN IF NOT EXISTS travel_assistance_required BOOLEAN DEFAULT NULL;

-- Add assistance type (what kind of help they need)
ALTER TABLE cfp_speakers
ADD COLUMN IF NOT EXISTS assistance_type TEXT CHECK (assistance_type IS NULL OR assistance_type IN ('travel', 'accommodation', 'both'));

-- Add departure airport (IATA code for travel planning)
ALTER TABLE cfp_speakers
ADD COLUMN IF NOT EXISTS departure_airport TEXT;

-- Add comments for documentation
COMMENT ON COLUMN cfp_speakers.city IS 'Speaker city for travel logistics';
COMMENT ON COLUMN cfp_speakers.country IS 'Speaker country for travel logistics and budget estimation';
COMMENT ON COLUMN cfp_speakers.travel_assistance_required IS 'Whether speaker needs help with travel/accommodation costs';
COMMENT ON COLUMN cfp_speakers.assistance_type IS 'Type of assistance needed: travel, accommodation, or both';
COMMENT ON COLUMN cfp_speakers.departure_airport IS 'IATA airport code for the speaker departure location';
