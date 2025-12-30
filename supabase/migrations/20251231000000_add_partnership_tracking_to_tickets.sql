-- Add partnership tracking columns to tickets table
-- This enables linking ticket purchases to specific partnerships, coupons, and vouchers

-- Add coupon/voucher tracking columns
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS partnership_coupon_id UUID REFERENCES partnership_coupons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS partnership_voucher_id UUID REFERENCES partnership_vouchers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS partnership_id UUID REFERENCES partnerships(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_amount INTEGER DEFAULT 0;

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_tickets_coupon_code ON tickets(coupon_code) WHERE coupon_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_partnership_coupon_id ON tickets(partnership_coupon_id) WHERE partnership_coupon_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_partnership_voucher_id ON tickets(partnership_voucher_id) WHERE partnership_voucher_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_partnership_id ON tickets(partnership_id) WHERE partnership_id IS NOT NULL;

-- Add comment explaining the columns
COMMENT ON COLUMN tickets.coupon_code IS 'The coupon or voucher code applied at checkout';
COMMENT ON COLUMN tickets.partnership_coupon_id IS 'Reference to partnership_coupons table if a partnership coupon was used';
COMMENT ON COLUMN tickets.partnership_voucher_id IS 'Reference to partnership_vouchers table if a partnership voucher was used';
COMMENT ON COLUMN tickets.partnership_id IS 'Reference to partnerships table for the partner this purchase is attributed to';
COMMENT ON COLUMN tickets.discount_amount IS 'Discount amount in cents applied to this ticket';
