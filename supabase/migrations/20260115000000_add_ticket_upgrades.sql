-- Migration: Add ticket_upgrades table for tracking VIP upgrades
-- Created: 2026-01-15

-- Create ticket_upgrades table
CREATE TABLE IF NOT EXISTS ticket_upgrades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE RESTRICT,
  from_tier TEXT NOT NULL,  -- 'standard', 'student', 'unemployed'
  to_tier TEXT NOT NULL DEFAULT 'vip',
  upgrade_mode TEXT NOT NULL CHECK (upgrade_mode IN ('complimentary', 'bank_transfer', 'stripe')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending_payment', 'pending_bank_transfer', 'completed', 'cancelled')),
  amount INTEGER,  -- in cents, nullable for complimentary
  currency TEXT,  -- nullable for complimentary
  stripe_payment_link_id TEXT,
  stripe_payment_link_url TEXT,
  stripe_checkout_session_id TEXT,  -- stored when payment is completed
  bank_transfer_reference TEXT,
  bank_transfer_due_date DATE,
  admin_user_id TEXT,  -- email or identifier of admin who initiated
  admin_note TEXT,
  idempotency_key TEXT UNIQUE NOT NULL,  -- ticketId + 'vip-upgrade' for uniqueness
  email_sent_at TIMESTAMPTZ,  -- track when email was sent to prevent duplicates
  completed_at TIMESTAMPTZ,  -- when upgrade was finalized
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_ticket_upgrades_ticket_id ON ticket_upgrades(ticket_id);
CREATE INDEX idx_ticket_upgrades_status ON ticket_upgrades(status);
CREATE INDEX idx_ticket_upgrades_stripe_payment_link_id ON ticket_upgrades(stripe_payment_link_id) WHERE stripe_payment_link_id IS NOT NULL;
CREATE INDEX idx_ticket_upgrades_created_at ON ticket_upgrades(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_ticket_upgrades_updated_at
  BEFORE UPDATE ON ticket_upgrades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE ticket_upgrades IS 'Tracks ticket tier upgrades (e.g., Standard to VIP) with various payment modes';
COMMENT ON COLUMN ticket_upgrades.upgrade_mode IS 'How the upgrade is paid for: complimentary, bank_transfer, or stripe';
COMMENT ON COLUMN ticket_upgrades.status IS 'Current state: pending_payment (stripe), pending_bank_transfer, completed, or cancelled';
COMMENT ON COLUMN ticket_upgrades.idempotency_key IS 'Unique key to prevent duplicate upgrades for same ticket';
COMMENT ON COLUMN ticket_upgrades.email_sent_at IS 'Timestamp when notification email was sent, used to prevent duplicate emails';
