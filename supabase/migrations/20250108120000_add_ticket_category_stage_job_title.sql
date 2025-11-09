-- Migration: Add ticket_category, ticket_stage, and job_title fields to tickets table
-- Created: 2025-01-08
-- Description: Separates ticket type into category (standard/student/vip/unemployed)
--              and stage (blind_bird/early_bird/general_admission/late_bird)
--              Also adds job_title field for attendee information

-- Add new columns to tickets table
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS ticket_category text,
  ADD COLUMN IF NOT EXISTS ticket_stage text,
  ADD COLUMN IF NOT EXISTS job_title text;

-- Add check constraints for valid values
ALTER TABLE tickets
  DROP CONSTRAINT IF EXISTS tickets_ticket_category_check,
  ADD CONSTRAINT tickets_ticket_category_check
    CHECK (ticket_category IN ('standard', 'student', 'unemployed', 'vip'));

ALTER TABLE tickets
  DROP CONSTRAINT IF EXISTS tickets_ticket_stage_check,
  ADD CONSTRAINT tickets_ticket_stage_check
    CHECK (ticket_stage IN ('blind_bird', 'early_bird', 'general_admission', 'late_bird'));

-- Add comment to explain the new fields
COMMENT ON COLUMN tickets.ticket_category IS 'Type of ticket: standard, student, unemployed, or vip (pricing tier)';
COMMENT ON COLUMN tickets.ticket_stage IS 'Purchase stage: blind_bird, early_bird, general_admission, or late_bird (pricing period)';
COMMENT ON COLUMN tickets.job_title IS 'Job title/role of the ticket holder';

-- Migrate existing data from ticket_type to ticket_category and ticket_stage
-- This is a best-effort migration based on the legacy ticket_type field
UPDATE tickets
SET
  ticket_category = CASE
    WHEN ticket_type = 'vip' THEN 'vip'
    WHEN ticket_type = 'student' THEN 'student'
    WHEN ticket_type = 'unemployed' THEN 'unemployed'
    ELSE 'standard'
  END,
  ticket_stage = CASE
    WHEN ticket_type = 'blind_bird' THEN 'blind_bird'
    WHEN ticket_type = 'early_bird' THEN 'early_bird'
    WHEN ticket_type = 'late_bird' THEN 'late_bird'
    WHEN ticket_type IN ('standard', 'student', 'unemployed', 'vip') THEN 'general_admission'
    ELSE 'general_admission'
  END
WHERE ticket_category IS NULL OR ticket_stage IS NULL;

-- Make the new columns NOT NULL after migration
ALTER TABLE tickets
  ALTER COLUMN ticket_category SET NOT NULL,
  ALTER COLUMN ticket_stage SET NOT NULL;

-- Note: ticket_type column is kept for backward compatibility
-- It can be deprecated and removed in a future migration
COMMENT ON COLUMN tickets.ticket_type IS 'DEPRECATED: Legacy field. Use ticket_category and ticket_stage instead.';
