-- Migration: Extend verification_requests for OSS maintainer ticket flow
-- Created: 2026-05-18
-- Purpose: Add nullable columns to support the OSS maintainer discount tier
--          alongside the existing student/unemployed flow.

BEGIN;

-- Allow the new verification_type
ALTER TABLE verification_requests DROP CONSTRAINT IF EXISTS verification_requests_verification_type_check;
ALTER TABLE verification_requests
  ADD CONSTRAINT verification_requests_verification_type_check
  CHECK (verification_type IN ('student', 'unemployed', 'oss_maintainer'));

-- OSS-specific fields
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS github_username TEXT;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS oss_repos JSONB;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS npm_packages JSONB;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS auto_check_result JSONB;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS qualifying_tier SMALLINT;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS requested_ticket_tier TEXT
  CHECK (requested_ticket_tier IS NULL OR requested_ticket_tier IN ('standard', 'vip'));
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS stripe_coupon_id TEXT;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS discount_percent SMALLINT;

-- One open application per GitHub handle for OSS maintainer flow.
-- Partial unique index: only enforces uniqueness when github_username is set.
CREATE UNIQUE INDEX IF NOT EXISTS idx_verification_requests_github_username_unique
  ON verification_requests (LOWER(github_username))
  WHERE github_username IS NOT NULL
    AND status IN ('pending', 'approved');

CREATE INDEX IF NOT EXISTS idx_verification_requests_verification_type
  ON verification_requests (verification_type);

COMMENT ON COLUMN verification_requests.github_username IS 'GitHub username for OSS maintainer verification (case-insensitive unique while pending/approved)';
COMMENT ON COLUMN verification_requests.oss_repos IS 'Array of repos claimed by applicant: [{owner, name, url, stars, firstCommitDate, commitsByUser, lastActivityAt, isFork, forkAheadBy}]';
COMMENT ON COLUMN verification_requests.npm_packages IS 'Array of npm packages claimed: [{name, weeklyDownloads, firstPublishedAt, isMaintainer}]';
COMMENT ON COLUMN verification_requests.auto_check_result IS 'Full auto-check report: gates passed/failed, scoring details, signals used';
COMMENT ON COLUMN verification_requests.qualifying_tier IS 'Computed tier (1=80% off, 2=60% off, 3=40% off, 4=20% off, NULL=below floor)';
COMMENT ON COLUMN verification_requests.requested_ticket_tier IS 'Ticket tier the applicant chose: standard or vip';
COMMENT ON COLUMN verification_requests.stripe_coupon_id IS 'Stripe coupon ID attached to the payment link at approval time';
COMMENT ON COLUMN verification_requests.discount_percent IS 'Discount percent applied at approval (20, 40, 60, 80)';

COMMIT;
