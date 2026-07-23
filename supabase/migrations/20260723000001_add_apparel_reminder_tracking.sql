-- Migration: Track apparel size reminder emails sent to ticket holders
-- Created: 2026-07-23
--
-- Lets admins see when an attendee was last nudged to provide their
-- t-shirt/hoodie size and avoid double-sending bulk reminders.

BEGIN;

ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS apparel_reminder_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN tickets.apparel_reminder_sent_at IS 'When the most recent apparel size reminder email was sent to this ticket holder';

COMMIT;
