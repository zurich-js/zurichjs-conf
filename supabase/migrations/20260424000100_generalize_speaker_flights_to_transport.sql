-- Generalize speaker flight tracking so admin travel can manage flights, trains,
-- links-only references, and no-travel cases with simpler operational statuses.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'cfp_transport_mode'
  ) THEN
    CREATE TYPE cfp_transport_mode AS ENUM ('flight', 'train', 'link_only', 'none');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'cfp_transport_status'
  ) THEN
    CREATE TYPE cfp_transport_status AS ENUM ('scheduled', 'delayed', 'canceled', 'complete');
  END IF;
END $$;

ALTER TABLE cfp_speaker_flights
  ADD COLUMN IF NOT EXISTS transport_mode cfp_transport_mode NOT NULL DEFAULT 'flight',
  ADD COLUMN IF NOT EXISTS transport_status cfp_transport_status NOT NULL DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS reference_code TEXT,
  ADD COLUMN IF NOT EXISTS departure_label TEXT,
  ADD COLUMN IF NOT EXISTS arrival_label TEXT,
  ADD COLUMN IF NOT EXISTS transport_link_url TEXT,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

UPDATE cfp_speaker_flights
SET
  provider = COALESCE(provider, airline),
  reference_code = COALESCE(reference_code, flight_number),
  departure_label = COALESCE(departure_label, departure_airport),
  arrival_label = COALESCE(arrival_label, arrival_airport),
  transport_link_url = COALESCE(transport_link_url, tracking_url),
  transport_status = CASE
    WHEN flight_status = 'delayed' THEN 'delayed'::cfp_transport_status
    WHEN flight_status = 'cancelled' THEN 'canceled'::cfp_transport_status
    WHEN flight_status IN ('departed', 'arrived') THEN 'complete'::cfp_transport_status
    ELSE 'scheduled'::cfp_transport_status
  END
WHERE
  provider IS NULL
  OR reference_code IS NULL
  OR departure_label IS NULL
  OR arrival_label IS NULL
  OR transport_link_url IS NULL
  OR transport_status = 'scheduled';

CREATE UNIQUE INDEX IF NOT EXISTS idx_cfp_speaker_flights_speaker_direction_unique
  ON cfp_speaker_flights(speaker_id, direction);

COMMENT ON COLUMN cfp_speaker_flights.transport_mode IS 'Admin transportation mode: flight, train, link-only, or no-travel placeholder';
COMMENT ON COLUMN cfp_speaker_flights.transport_status IS 'Simplified transportation status for admin tracking';
COMMENT ON COLUMN cfp_speaker_flights.provider IS 'Transport provider such as airline or train operator';
COMMENT ON COLUMN cfp_speaker_flights.reference_code IS 'Flight number, train reference, or freeform transport identifier';
COMMENT ON COLUMN cfp_speaker_flights.transport_link_url IS 'External tracking or reference link for the transport leg';
