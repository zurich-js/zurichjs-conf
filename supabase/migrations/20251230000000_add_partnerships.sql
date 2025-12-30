-- Partnerships Migration
-- Adds support for partnership management with Stripe coupons and tracking

-- Partnership Type Enum
CREATE TYPE partnership_type AS ENUM ('community', 'individual', 'company', 'sponsor');

-- Partnership Status Enum
CREATE TYPE partnership_status AS ENUM ('active', 'inactive', 'pending', 'expired');

-- Coupon Type Enum
CREATE TYPE coupon_type AS ENUM ('percentage', 'fixed_amount');

-- Voucher Purpose Enum
CREATE TYPE voucher_purpose AS ENUM ('community_discount', 'raffle', 'giveaway', 'organizer_discount');

-- Voucher Currency Enum
CREATE TYPE voucher_currency AS ENUM ('EUR', 'CHF');

-- Partnerships Table
-- Stores main partnership records
CREATE TABLE IF NOT EXISTS partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Information
  name TEXT NOT NULL,
  type partnership_type NOT NULL,
  status partnership_status NOT NULL DEFAULT 'pending',

  -- Contact Information
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,

  -- Company/Organization Details (for company/sponsor types)
  company_name TEXT,
  company_website TEXT,
  company_logo_url TEXT,

  -- UTM Tracking (auto-generated slugs for tracking)
  utm_source TEXT NOT NULL,
  utm_medium TEXT NOT NULL DEFAULT 'partner',
  utm_campaign TEXT NOT NULL DEFAULT 'zurichjs-conf-2026',

  -- Notes and Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partnership Coupons Table
-- Stores Stripe coupons associated with partnerships
CREATE TABLE IF NOT EXISTS partnership_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id UUID NOT NULL REFERENCES partnerships(id) ON DELETE CASCADE,

  -- Stripe IDs
  stripe_coupon_id TEXT NOT NULL,
  stripe_promotion_code_id TEXT,

  -- Coupon Details
  code TEXT NOT NULL UNIQUE,
  type coupon_type NOT NULL,
  discount_percent INTEGER, -- For percentage discounts (e.g., 20 = 20%)
  discount_amount INTEGER, -- For fixed amount discounts (in cents)
  currency voucher_currency, -- Required for fixed_amount type

  -- Restrictions
  restricted_product_ids TEXT[] NOT NULL DEFAULT '{}', -- Stripe product IDs
  max_redemptions INTEGER,
  current_redemptions INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_discount CHECK (
    (type = 'percentage' AND discount_percent IS NOT NULL AND discount_percent > 0 AND discount_percent <= 100) OR
    (type = 'fixed_amount' AND discount_amount IS NOT NULL AND discount_amount > 0 AND currency IS NOT NULL)
  )
);

-- Partnership Vouchers Table
-- Stores fixed-value voucher codes for raffles/giveaways
CREATE TABLE IF NOT EXISTS partnership_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id UUID NOT NULL REFERENCES partnerships(id) ON DELETE CASCADE,

  -- Stripe IDs
  stripe_coupon_id TEXT NOT NULL,
  stripe_promotion_code_id TEXT,

  -- Voucher Details
  code TEXT NOT NULL UNIQUE,
  purpose voucher_purpose NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0), -- In cents
  currency voucher_currency NOT NULL,

  -- Recipient Info (for organizer discounts)
  recipient_name TEXT,
  recipient_email TEXT,

  -- Redemption Status
  is_redeemed BOOLEAN NOT NULL DEFAULT FALSE,
  redeemed_at TIMESTAMPTZ,
  redeemed_by_email TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partnership Emails Table
-- Tracks emails sent to partners
CREATE TABLE IF NOT EXISTS partnership_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id UUID NOT NULL REFERENCES partnerships(id) ON DELETE CASCADE,

  -- Email Details
  recipient_email TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  resend_message_id TEXT, -- Resend message ID for tracking

  -- Content Configuration
  included_coupons BOOLEAN NOT NULL DEFAULT FALSE,
  included_vouchers BOOLEAN NOT NULL DEFAULT FALSE,
  included_logo BOOLEAN NOT NULL DEFAULT FALSE,
  included_banner BOOLEAN NOT NULL DEFAULT FALSE,
  custom_message TEXT,

  -- Status
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'sent', -- sent, delivered, bounced, failed

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_partnerships_type ON partnerships(type);
CREATE INDEX idx_partnerships_status ON partnerships(status);
CREATE INDEX idx_partnerships_utm_source ON partnerships(utm_source);
CREATE INDEX idx_partnerships_created_at ON partnerships(created_at DESC);
CREATE INDEX idx_partnerships_contact_email ON partnerships(contact_email);

CREATE INDEX idx_partnership_coupons_partnership_id ON partnership_coupons(partnership_id);
CREATE INDEX idx_partnership_coupons_code ON partnership_coupons(code);
CREATE INDEX idx_partnership_coupons_stripe_coupon_id ON partnership_coupons(stripe_coupon_id);
CREATE INDEX idx_partnership_coupons_is_active ON partnership_coupons(is_active);

CREATE INDEX idx_partnership_vouchers_partnership_id ON partnership_vouchers(partnership_id);
CREATE INDEX idx_partnership_vouchers_code ON partnership_vouchers(code);
CREATE INDEX idx_partnership_vouchers_purpose ON partnership_vouchers(purpose);
CREATE INDEX idx_partnership_vouchers_is_redeemed ON partnership_vouchers(is_redeemed);

CREATE INDEX idx_partnership_emails_partnership_id ON partnership_emails(partnership_id);
CREATE INDEX idx_partnership_emails_sent_at ON partnership_emails(sent_at DESC);

-- Triggers for updated_at
CREATE TRIGGER update_partnerships_updated_at
  BEFORE UPDATE ON partnerships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partnership_coupons_updated_at
  BEFORE UPDATE ON partnership_coupons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partnership_vouchers_updated_at
  BEFORE UPDATE ON partnership_vouchers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate UTM source from partnership name
CREATE OR REPLACE FUNCTION generate_utm_source()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.utm_source IS NULL OR NEW.utm_source = '' THEN
    -- Convert name to URL-friendly slug
    NEW.utm_source := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
    -- Remove leading/trailing hyphens
    NEW.utm_source := trim(both '-' from NEW.utm_source);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate UTM source on insert
CREATE TRIGGER set_partnership_utm_source
  BEFORE INSERT ON partnerships
  FOR EACH ROW
  EXECUTE FUNCTION generate_utm_source();

-- Comments for documentation
COMMENT ON TABLE partnerships IS 'Partnership records for community, individual, company, and sponsor partnerships';
COMMENT ON TABLE partnership_coupons IS 'Stripe coupons/promo codes associated with partnerships';
COMMENT ON TABLE partnership_vouchers IS 'Fixed-value voucher codes for raffles, giveaways, and organizer discounts';
COMMENT ON TABLE partnership_emails IS 'Email tracking for partnership package emails';

COMMENT ON COLUMN partnerships.utm_source IS 'Auto-generated URL slug for UTM tracking';
COMMENT ON COLUMN partnerships.utm_medium IS 'UTM medium, defaults to partner';
COMMENT ON COLUMN partnerships.utm_campaign IS 'UTM campaign, defaults to conference name';

COMMENT ON COLUMN partnership_coupons.restricted_product_ids IS 'Stripe product IDs this coupon can be applied to';
COMMENT ON COLUMN partnership_coupons.discount_amount IS 'Discount amount in cents for fixed_amount type';
COMMENT ON COLUMN partnership_coupons.current_redemptions IS 'Number of times this coupon has been used';

COMMENT ON COLUMN partnership_vouchers.amount IS 'Voucher value in cents';
COMMENT ON COLUMN partnership_vouchers.purpose IS 'What the voucher is for: community_discount, raffle, giveaway, or organizer_discount';
