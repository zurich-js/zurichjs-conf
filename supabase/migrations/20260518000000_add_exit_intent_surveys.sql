-- Migration: Add exit intent survey responses table
-- Created: 2026-05-18
-- Captures checkout abandonment reasons for analytics and recovery flows

BEGIN;

-- Create exit_intent_responses table
CREATE TABLE IF NOT EXISTS exit_intent_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  email TEXT,
  reason TEXT NOT NULL CHECK (reason IN ('too_expensive', 'not_ready', 'comparing', 'missing_info', 'other')),
  reason_detail TEXT,
  cart_total INTEGER,
  cart_currency TEXT,
  cart_items_count INTEGER,
  checkout_step TEXT,
  response_shown TEXT,
  response_clicked BOOLEAN DEFAULT FALSE,
  posthog_distinct_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE exit_intent_responses IS 'Checkout exit-intent survey responses for abandonment analytics and recovery';
COMMENT ON COLUMN exit_intent_responses.session_id IS 'PostHog distinct_id or anonymous session identifier';
COMMENT ON COLUMN exit_intent_responses.reason IS 'Primary abandonment reason (constrained enum)';
COMMENT ON COLUMN exit_intent_responses.reason_detail IS 'Free-text detail when reason is other';
COMMENT ON COLUMN exit_intent_responses.cart_total IS 'Cart total in cents at time of abandonment';
COMMENT ON COLUMN exit_intent_responses.cart_currency IS 'ISO 4217 currency code (e.g. CHF, EUR)';
COMMENT ON COLUMN exit_intent_responses.response_shown IS 'Which recovery CTA variant was displayed';
COMMENT ON COLUMN exit_intent_responses.response_clicked IS 'Whether the user clicked the recovery CTA';
COMMENT ON COLUMN exit_intent_responses.posthog_distinct_id IS 'PostHog distinct_id for joining with product analytics';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exit_intent_responses_created_at
  ON exit_intent_responses (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exit_intent_responses_reason
  ON exit_intent_responses (reason);

-- RLS
ALTER TABLE exit_intent_responses ENABLE ROW LEVEL SECURITY;

-- Service role has full access (API route inserts + admin reads)
CREATE POLICY "Service role has full access to exit_intent_responses"
  ON exit_intent_responses FOR ALL
  USING (auth.role() = 'service_role');

COMMIT;
