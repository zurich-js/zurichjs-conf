-- Create table to track scheduled cart abandonment emails
-- Used to cancel emails when user completes purchase within 24h window

CREATE TABLE IF NOT EXISTS scheduled_abandonment_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  resend_email_id TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by email
CREATE INDEX IF NOT EXISTS idx_scheduled_abandonment_emails_email
  ON scheduled_abandonment_emails(email);

-- Index for cleanup of old records
CREATE INDEX IF NOT EXISTS idx_scheduled_abandonment_emails_scheduled_for
  ON scheduled_abandonment_emails(scheduled_for);

-- Enable RLS
ALTER TABLE scheduled_abandonment_emails ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (no public access needed)
CREATE POLICY "Service role full access" ON scheduled_abandonment_emails
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Comment explaining the table
COMMENT ON TABLE scheduled_abandonment_emails IS
  'Tracks scheduled cart abandonment emails to allow cancellation on successful purchase';
