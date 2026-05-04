-- Migration: Add VIP perks tables for workshop discount management
-- Created: 2026-05-05

-- Create vip_perks table (one discount code per VIP ticket)
CREATE TABLE IF NOT EXISTS vip_perks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
  stripe_coupon_id TEXT NOT NULL,
  stripe_promotion_code_id TEXT,
  code TEXT NOT NULL UNIQUE,
  discount_percent INTEGER NOT NULL DEFAULT 20,
  restricted_product_ids TEXT[] NOT NULL DEFAULT '{}',
  max_redemptions INTEGER DEFAULT 1,
  current_redemptions INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes (code already has a unique index via UNIQUE constraint)
CREATE INDEX idx_vip_perks_is_active ON vip_perks(is_active);

-- Trigger for updated_at
CREATE TRIGGER update_vip_perks_updated_at
  BEFORE UPDATE ON vip_perks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE vip_perks IS 'VIP workshop discount codes - one per VIP ticket holder';
COMMENT ON COLUMN vip_perks.ticket_id IS 'The VIP ticket this perk belongs to (unique constraint enforces 1:1)';
COMMENT ON COLUMN vip_perks.restricted_product_ids IS 'Stripe product IDs (workshops) this coupon applies to';

-- Create vip_perk_emails table for tracking sent emails
CREATE TABLE IF NOT EXISTS vip_perk_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vip_perk_id UUID NOT NULL REFERENCES vip_perks(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  resend_message_id TEXT,
  custom_message TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vip_perk_emails_vip_perk_id ON vip_perk_emails(vip_perk_id);
CREATE INDEX idx_vip_perk_emails_ticket_id ON vip_perk_emails(ticket_id);

COMMENT ON TABLE vip_perk_emails IS 'Tracks emails sent to VIP ticket holders about their workshop discount';

-- Create vip_perk_config table (single-row configuration)
-- Enforced singleton via CHECK constraint on the boolean column
CREATE TABLE IF NOT EXISTS vip_perk_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_percent INTEGER NOT NULL DEFAULT 20,
  restricted_product_ids TEXT[] NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  auto_send_email BOOLEAN NOT NULL DEFAULT FALSE,
  custom_email_message TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Singleton enforcement: only one row can ever exist
  singleton BOOLEAN NOT NULL DEFAULT TRUE UNIQUE CHECK (singleton = TRUE)
);

-- Trigger for updated_at
CREATE TRIGGER update_vip_perk_config_updated_at
  BEFORE UPDATE ON vip_perk_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed with one config row (idempotent via unique singleton constraint)
INSERT INTO vip_perk_config (discount_percent, restricted_product_ids)
VALUES (20, '{}')
ON CONFLICT (singleton) DO NOTHING;

COMMENT ON TABLE vip_perk_config IS 'Single-row configuration for VIP workshop discount perks';
COMMENT ON COLUMN vip_perk_config.restricted_product_ids IS 'Stripe workshop product IDs that VIP discounts apply to';
COMMENT ON COLUMN vip_perk_config.auto_send_email IS 'Whether to automatically send email when a VIP perk is auto-generated';

-- RLS policies (service role bypasses RLS, but add policies for completeness)
ALTER TABLE vip_perks ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_perk_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_perk_config ENABLE ROW LEVEL SECURITY;

-- Service role has full access (admin operations)
CREATE POLICY "Service role has full access to vip_perks"
  ON vip_perks FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to vip_perk_emails"
  ON vip_perk_emails FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to vip_perk_config"
  ON vip_perk_config FOR ALL
  USING (auth.role() = 'service_role');
