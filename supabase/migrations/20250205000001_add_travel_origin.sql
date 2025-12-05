-- Add travel_origin column to cfp_submissions
-- This stores where the speaker would be flying from

ALTER TABLE cfp_submissions
ADD COLUMN IF NOT EXISTS travel_origin TEXT;

COMMENT ON COLUMN cfp_submissions.travel_origin IS 'City/location the speaker would fly from (e.g. Berlin, Germany)';
