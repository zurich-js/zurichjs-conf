-- Add travel_option column to persist the speaker's travel choice
-- (employer_covers vs self_managed vs need_assistance)
ALTER TABLE cfp_speakers
ADD COLUMN IF NOT EXISTS travel_option TEXT
CHECK (travel_option IS NULL OR travel_option IN ('employer_covers', 'self_managed', 'need_assistance'));

-- Backfill existing data
UPDATE cfp_speakers SET travel_option = 'need_assistance' WHERE travel_assistance_required = true AND travel_option IS NULL;
UPDATE cfp_speakers SET travel_option = 'self_managed' WHERE travel_assistance_required = false AND travel_option IS NULL;
