-- Migration: Add discount_config singleton table
-- Created: 2026-07-15
--
-- Moves the discount popup configuration out of env vars (DISCOUNT_*) into an
-- admin-editable single-row table, following the vip_perk_config pattern.
-- Env vars remain as fallback defaults when the row cannot be fetched.

BEGIN;

CREATE TABLE IF NOT EXISTS discount_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Core popup behavior
  show_probability NUMERIC NOT NULL DEFAULT 0.25 CHECK (show_probability >= 0 AND show_probability <= 1),
  percent_off INTEGER NOT NULL DEFAULT 10 CHECK (percent_off >= 1 AND percent_off <= 100),
  duration_minutes INTEGER NOT NULL DEFAULT 120 CHECK (duration_minutes >= 1),
  cooldown_hours INTEGER NOT NULL DEFAULT 24 CHECK (cooldown_hours >= 1),
  force_show BOOLEAN NOT NULL DEFAULT FALSE,
  -- Experiment variant B (aggressive-20)
  ab_percent_off INTEGER NOT NULL DEFAULT 20 CHECK (ab_percent_off >= 1 AND ab_percent_off <= 100),
  ab_duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (ab_duration_minutes >= 1),
  -- Experiment variant C (price-sensitive-30)
  abc_percent_off INTEGER NOT NULL DEFAULT 30 CHECK (abc_percent_off >= 1 AND abc_percent_off <= 100),
  abc_duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (abc_duration_minutes >= 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Singleton enforcement: only one row can ever exist
  singleton BOOLEAN NOT NULL DEFAULT TRUE UNIQUE CHECK (singleton = TRUE)
);

CREATE TRIGGER update_discount_config_updated_at
  BEFORE UPDATE ON discount_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed with one config row matching the previous env defaults
INSERT INTO discount_config (singleton)
VALUES (TRUE)
ON CONFLICT (singleton) DO NOTHING;

COMMENT ON TABLE discount_config IS 'Single-row configuration for the discount popup and its A/B/C experiment offers';
COMMENT ON COLUMN discount_config.show_probability IS 'Probability (0-1) an eligible visitor is shown the popup';
COMMENT ON COLUMN discount_config.percent_off IS 'Control variant: discount percentage';
COMMENT ON COLUMN discount_config.duration_minutes IS 'Control variant: code validity in minutes';
COMMENT ON COLUMN discount_config.cooldown_hours IS 'Hours before an ineligible visitor is re-considered';
COMMENT ON COLUMN discount_config.force_show IS 'Always show the popup (testing / promotions)';
COMMENT ON COLUMN discount_config.ab_percent_off IS 'aggressive-20 variant: discount percentage';
COMMENT ON COLUMN discount_config.ab_duration_minutes IS 'aggressive-20 variant: code validity in minutes';
COMMENT ON COLUMN discount_config.abc_percent_off IS 'price-sensitive-30 variant: discount percentage';
COMMENT ON COLUMN discount_config.abc_duration_minutes IS 'price-sensitive-30 variant: code validity in minutes';

-- RLS: service role only (config is read server-side and edited via admin API)
ALTER TABLE discount_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to discount_config"
  ON discount_config FOR ALL
  USING (auth.role() = 'service_role');

COMMIT;
