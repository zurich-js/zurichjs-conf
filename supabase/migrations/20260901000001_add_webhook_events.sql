-- Stripe webhook event ledger: event-id idempotency plus a queryable record of
-- every delivery (processing/processed/failed) — the reconciliation surface
-- for conference-day incidents. Wired in src/pages/api/webhooks/stripe.ts.

BEGIN;

CREATE TABLE IF NOT EXISTS webhook_events (
  event_id text PRIMARY KEY,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'processed', 'failed')),
  error text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

COMMENT ON TABLE webhook_events IS
  'One row per Stripe webhook event delivery. processed = handled to completion; failed = last attempt threw (Stripe will retry); processing = in flight or crashed mid-run.';

-- Only the service-role webhook handler touches this table: RLS on with no
-- policies denies everything else.
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS webhook_events_status_received_idx
  ON webhook_events (status, received_at DESC);

COMMIT;
