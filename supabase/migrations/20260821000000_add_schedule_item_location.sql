-- Venue location for schedule items.
-- Workshops (and other program items) can run outside the main conference
-- venue — e.g. at a partner office such as "livingdocs AG Zürich". These
-- fields let admins record the building and address alongside the existing
-- `room` column so public pages can render directions and a Google Maps link.
-- All columns are nullable: null means the main conference venue.

BEGIN;

ALTER TABLE program_schedule_items
  ADD COLUMN IF NOT EXISTS location_name text,
  ADD COLUMN IF NOT EXISTS location_address text,
  ADD COLUMN IF NOT EXISTS location_maps_url text;

COMMENT ON COLUMN program_schedule_items.location_name IS
  'Venue/building name, e.g. "livingdocs AG Zürich". Null = main conference venue.';
COMMENT ON COLUMN program_schedule_items.location_address IS
  'Street address of the venue, used to derive the Google Maps link.';
COMMENT ON COLUMN program_schedule_items.location_maps_url IS
  'Optional explicit Google Maps URL. Overrides the link derived from name/address.';

COMMIT;
