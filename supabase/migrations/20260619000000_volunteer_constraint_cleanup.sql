-- Migration: Volunteer constraint cleanup
-- Created: 2026-06-19
-- Drops indexes that duplicate UNIQUE constraints and enforces NOT NULL on
-- volunteer_applications.location (the public application flow always requires it).

BEGIN;

-- slug and application_id are already UNIQUE, which creates an implicit index.
-- The explicit indexes below are redundant write/storage overhead.
DROP INDEX IF EXISTS idx_volunteer_roles_slug;
DROP INDEX IF EXISTS idx_volunteer_applications_application_id;

-- Backfill any pre-existing NULL locations, then enforce the invariant.
UPDATE volunteer_applications SET location = 'Unknown' WHERE location IS NULL;
ALTER TABLE volunteer_applications ALTER COLUMN location SET NOT NULL;

COMMIT;
