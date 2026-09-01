-- Track confirmation-email delivery per ticket so a Stripe webhook retry can
-- heal a half-done fulfillment (tickets written, emails never sent) instead of
-- skipping email dispatch forever. See src/lib/stripe/checkout/tickets.ts.

BEGIN;

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS confirmation_email_sent_at timestamptz;

COMMENT ON COLUMN tickets.confirmation_email_sent_at IS
  'When the ticket confirmation email was successfully handed to Resend. NULL = not sent yet; webhook retries resend only NULL rows for their session.';

-- Existing tickets were emailed under the old flow (or handled manually);
-- stamping them prevents a late webhook retry from re-emailing history.
-- Small table (single conference), safe to backfill inline.
UPDATE tickets
SET confirmation_email_sent_at = created_at
WHERE confirmation_email_sent_at IS NULL;

COMMIT;
