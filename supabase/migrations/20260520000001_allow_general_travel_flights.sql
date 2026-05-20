-- Allow the admin travel flight tracker to include non-speaker travelers.
-- Existing speaker flights keep using speaker_id; rows for guests, buyers,
-- family members, and other travelers can leave speaker_id null and store a
-- free-form traveler name/email.

ALTER TABLE cfp_speaker_flights
  ALTER COLUMN speaker_id DROP NOT NULL;

ALTER TABLE cfp_speaker_flights
  ADD COLUMN IF NOT EXISTS traveler_name TEXT,
  ADD COLUMN IF NOT EXISTS traveler_email TEXT;

CREATE INDEX IF NOT EXISTS idx_cfp_speaker_flights_traveler_name
  ON cfp_speaker_flights(traveler_name);
