-- Migration: Add referral programme tables
-- Created: 2026-05-18

BEGIN;

-- Create referrers table (one referral identity per ticket holder)
CREATE TABLE IF NOT EXISTS referrers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  referral_code TEXT NOT NULL UNIQUE,
  total_referrals INTEGER NOT NULL DEFAULT 0,
  current_tier INTEGER NOT NULL DEFAULT 0,
  active_voucher_stripe_coupon_id TEXT,
  active_voucher_stripe_promotion_code_id TEXT,
  active_voucher_code TEXT,
  active_voucher_amount INTEGER NOT NULL DEFAULT 0,
  active_voucher_currency TEXT,
  active_voucher_redeemed BOOLEAN NOT NULL DEFAULT FALSE,
  active_voucher_redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes (referral_code already has a unique index via UNIQUE constraint, but add explicit one for lookup speed)
CREATE INDEX IF NOT EXISTS idx_referrers_referral_code ON referrers(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrers_email ON referrers(email);

-- Trigger for updated_at
CREATE TRIGGER update_referrers_updated_at
  BEFORE UPDATE ON referrers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE referrers IS 'Referral programme participants - one per ticket holder who opts in';
COMMENT ON COLUMN referrers.ticket_id IS 'The ticket this referrer is associated with (unique constraint enforces 1:1)';
COMMENT ON COLUMN referrers.referral_code IS 'Unique human-readable code shared by the referrer (e.g. ZURICH-ABC123)';
COMMENT ON COLUMN referrers.total_referrals IS 'Running count of successful referral conversions';
COMMENT ON COLUMN referrers.current_tier IS 'Current reward tier (0 = no tier yet, 1-3 = active tiers)';
COMMENT ON COLUMN referrers.active_voucher_stripe_coupon_id IS 'Stripe coupon ID for the referrer''s current reward voucher';
COMMENT ON COLUMN referrers.active_voucher_stripe_promotion_code_id IS 'Stripe promotion code ID for the referrer''s current reward voucher';
COMMENT ON COLUMN referrers.active_voucher_code IS 'Human-readable voucher code for the referrer''s current reward';
COMMENT ON COLUMN referrers.active_voucher_amount IS 'Reward amount in minor currency units (e.g. cents/rappen)';
COMMENT ON COLUMN referrers.active_voucher_currency IS 'ISO 4217 currency code for the active voucher (chf, eur, gbp, usd)';
COMMENT ON COLUMN referrers.active_voucher_redeemed IS 'Whether the referrer has redeemed their current reward voucher';
COMMENT ON COLUMN referrers.active_voucher_redeemed_at IS 'Timestamp when the voucher was redeemed';

-- Create referral_conversions table (tracks each successful referral)
CREATE TABLE IF NOT EXISTS referral_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES referrers(id) ON DELETE CASCADE,
  referee_ticket_id UUID REFERENCES tickets(id),
  referee_email TEXT NOT NULL,
  referee_stripe_session_id TEXT NOT NULL,
  reward_tier INTEGER NOT NULL,
  reward_amount INTEGER NOT NULL,
  reward_currency TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_referral_conversions_referrer_id ON referral_conversions(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_conversions_referee_stripe_session_id ON referral_conversions(referee_stripe_session_id);

COMMENT ON TABLE referral_conversions IS 'Individual referral conversion events linking referrers to referee purchases';
COMMENT ON COLUMN referral_conversions.referrer_id IS 'The referrer who generated this conversion';
COMMENT ON COLUMN referral_conversions.referee_ticket_id IS 'The ticket purchased by the referee (nullable until ticket is confirmed)';
COMMENT ON COLUMN referral_conversions.referee_stripe_session_id IS 'Stripe checkout session ID for the referee''s purchase';
COMMENT ON COLUMN referral_conversions.reward_tier IS 'The reward tier at the time of this conversion';
COMMENT ON COLUMN referral_conversions.reward_amount IS 'Reward amount in minor currency units earned by this conversion';
COMMENT ON COLUMN referral_conversions.reward_currency IS 'ISO 4217 currency code for the reward (chf, eur, gbp, usd)';

-- Create referral_config table (single-row configuration)
-- Enforced singleton via CHECK constraint on the boolean column
CREATE TABLE IF NOT EXISTS referral_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  referee_discount_percent INTEGER NOT NULL DEFAULT 10,
  tiers JSONB NOT NULL DEFAULT '[
    {"min_referrals": 1, "max_referrals": 3, "reward_amount_chf": 1000, "reward_amount_eur": 900, "reward_amount_gbp": 800, "reward_amount_usd": 1100},
    {"min_referrals": 4, "max_referrals": 8, "reward_amount_chf": 1500, "reward_amount_eur": 1350, "reward_amount_gbp": 1200, "reward_amount_usd": 1650},
    {"min_referrals": 9, "max_referrals": null, "reward_amount_chf": 2500, "reward_amount_eur": 2250, "reward_amount_gbp": 2000, "reward_amount_usd": 2750}
  ]'::jsonb,
  reward_restricted_product_ids TEXT[] NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Singleton enforcement: only one row can ever exist
  singleton BOOLEAN NOT NULL DEFAULT TRUE UNIQUE CHECK (singleton = TRUE)
);

-- Trigger for updated_at
CREATE TRIGGER update_referral_config_updated_at
  BEFORE UPDATE ON referral_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed with one config row (idempotent via unique singleton constraint)
INSERT INTO referral_config (is_active, referee_discount_percent)
VALUES (TRUE, 10)
ON CONFLICT (singleton) DO NOTHING;

COMMENT ON TABLE referral_config IS 'Single-row configuration for the referral programme';
COMMENT ON COLUMN referral_config.is_active IS 'Global kill switch for the referral programme';
COMMENT ON COLUMN referral_config.referee_discount_percent IS 'Percentage discount applied to the referee''s ticket purchase';
COMMENT ON COLUMN referral_config.tiers IS 'JSONB array defining reward tiers with min/max referrals and per-currency amounts (in minor units)';
COMMENT ON COLUMN referral_config.reward_restricted_product_ids IS 'Stripe product IDs that referral reward vouchers can be applied to';
COMMENT ON COLUMN referral_config.expires_at IS 'Optional expiry date for the entire referral programme';

-- RLS policies (service role bypasses RLS, but add policies for completeness)
ALTER TABLE referrers ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_config ENABLE ROW LEVEL SECURITY;

-- Service role has full access (admin operations)
CREATE POLICY "Service role has full access to referrers"
  ON referrers FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to referral_conversions"
  ON referral_conversions FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to referral_config"
  ON referral_config FOR ALL
  USING (auth.role() = 'service_role');

COMMIT;
