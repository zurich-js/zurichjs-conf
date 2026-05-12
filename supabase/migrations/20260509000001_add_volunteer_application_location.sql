-- Migration: Add location column to volunteer_applications
-- Created: 2026-05-09

ALTER TABLE volunteer_applications ADD COLUMN location TEXT;

COMMENT ON COLUMN volunteer_applications.location IS 'Where the applicant is based (city/country)';
