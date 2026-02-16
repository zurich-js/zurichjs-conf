-- Fix CFP Scheduled Emails Constraint
-- The original constraint prevented updating status because it included status in the unique key
-- This migration replaces it with a partial unique index that only applies to pending emails

-- Drop the old constraint
ALTER TABLE cfp_scheduled_emails DROP CONSTRAINT IF EXISTS unique_pending_email;

-- Add a partial unique index that only enforces uniqueness for pending emails
-- This allows multiple cancelled/sent/failed emails but only one pending email per submission+type
CREATE UNIQUE INDEX IF NOT EXISTS idx_cfp_scheduled_emails_unique_pending
  ON cfp_scheduled_emails (submission_id, email_type)
  WHERE status = 'pending';

COMMENT ON INDEX idx_cfp_scheduled_emails_unique_pending IS 'Ensures only one pending email per submission and type';
