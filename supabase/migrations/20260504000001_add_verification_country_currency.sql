-- Migration: Add country and currency columns to verification_requests
-- Created: 2026-05-04
-- Purpose: Store the user's detected country and currency for admin visibility

ALTER TABLE verification_requests ADD COLUMN country_code TEXT;
ALTER TABLE verification_requests ADD COLUMN currency TEXT;

COMMENT ON COLUMN verification_requests.country_code IS 'ISO 3166-1 alpha-2 country code detected from user IP at submission time';
COMMENT ON COLUMN verification_requests.currency IS 'Currency determined from country code (CHF, EUR, GBP, USD)';
