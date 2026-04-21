-- Cart snapshots persisted at checkout creation time so the webhook can hydrate
-- workshop attendees + other extra context without hitting Stripe metadata
-- limits (each metadata value is capped at 500 chars).
--
-- Scoped to workshop-specific data for now — tickets still flow through
-- session.metadata.attendees. Keeping it a single JSONB column lets us extend
-- without more migrations.

CREATE TABLE IF NOT EXISTS checkout_cart_snapshots (
  stripe_session_id TEXT PRIMARY KEY,
  /** Map of workshop_id → ordered attendee list (seat 0 first, etc). */
  workshop_attendees JSONB NOT NULL DEFAULT '{}'::jsonb,
  /** Snapshotted cart for audit; do not trust at webhook time — re-derive from Stripe. */
  cart_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS idx_checkout_cart_snapshots_expires_at
  ON checkout_cart_snapshots(expires_at);

ALTER TABLE checkout_cart_snapshots ENABLE ROW LEVEL SECURITY;

-- No user-facing reads; the service role used by the webhook bypasses RLS.

COMMENT ON TABLE checkout_cart_snapshots IS
  'Per-session cart metadata written when /api/create-checkout-session creates a Stripe session. Used by the Stripe webhook to hydrate workshop attendee info per seat.';
