-- Repurpose the workshops table as a commerce/operational "offering" overlay
-- linked to CFP submissions, and prepare workshop_registrations for guest purchases.

-- 1. Extend the workshop_status enum with an 'archived' terminal state.
ALTER TYPE workshop_status ADD VALUE IF NOT EXISTS 'archived';

-- 2. Add offering columns to `workshops`.
ALTER TABLE workshops
  ADD COLUMN IF NOT EXISTS cfp_submission_id UUID REFERENCES cfp_submissions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS room TEXT,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_lookup_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_workshops_cfp_submission_id
  ON workshops(cfp_submission_id)
  WHERE cfp_submission_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_workshops_stripe_price_lookup_key
  ON workshops(stripe_price_lookup_key)
  WHERE stripe_price_lookup_key IS NOT NULL;

-- 3. Loosen legacy NOT NULL and CHECK constraints on columns that commerce flow does not write.
ALTER TABLE workshops
  ALTER COLUMN date DROP NOT NULL,
  ALTER COLUMN start_time DROP NOT NULL,
  ALTER COLUMN end_time DROP NOT NULL,
  ALTER COLUMN price DROP NOT NULL;

ALTER TABLE workshops DROP CONSTRAINT IF EXISTS valid_time_range;

-- 4. workshop_registrations: allow guest purchases and multi-workshop single-session checkouts.
ALTER TABLE workshop_registrations ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE workshop_registrations DROP CONSTRAINT IF EXISTS workshop_registrations_workshop_id_user_id_key;
ALTER TABLE workshop_registrations DROP CONSTRAINT IF EXISTS workshop_registrations_stripe_session_id_key;

ALTER TABLE workshop_registrations
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS partnership_coupon_id UUID REFERENCES partnership_coupons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS partnership_voucher_id UUID REFERENCES partnership_vouchers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_amount INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS uq_workshop_registrations_session_workshop
  ON workshop_registrations(stripe_session_id, workshop_id);

CREATE INDEX IF NOT EXISTS idx_workshop_registrations_email
  ON workshop_registrations(email)
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workshop_registrations_coupon_code
  ON workshop_registrations(coupon_code)
  WHERE coupon_code IS NOT NULL;

-- 5. Documentation.
COMMENT ON COLUMN workshops.cfp_submission_id IS 'Links this sellable workshop offering to the CFP submission holding its content.';
COMMENT ON COLUMN workshops.room IS 'Room assignment; free text. Scheduled room lives on program_schedule_items.';
COMMENT ON COLUMN workshops.duration_minutes IS 'Admin override for workshop length in minutes; falls back to CFP workshop_duration_hours.';
COMMENT ON COLUMN workshops.stripe_product_id IS 'Stripe product id pasted by admin when wiring pricing.';
COMMENT ON COLUMN workshops.stripe_price_lookup_key IS 'Base CHF lookup key; EUR/GBP resolved at runtime by appending _eur or _gbp.';
COMMENT ON COLUMN workshop_registrations.user_id IS 'Optional reference to user profile (null for guest purchases).';
COMMENT ON COLUMN workshop_registrations.discount_amount IS 'Discount applied at checkout in cents.';
