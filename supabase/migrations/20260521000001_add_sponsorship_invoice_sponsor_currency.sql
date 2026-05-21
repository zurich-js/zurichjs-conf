BEGIN;

ALTER TABLE sponsorship_invoices
  ADD COLUMN IF NOT EXISTS sponsor_currency TEXT CHECK (sponsor_currency IN ('CHF', 'EUR', 'GBP', 'USD')),
  ADD COLUMN IF NOT EXISTS sponsor_amount INTEGER,
  ADD COLUMN IF NOT EXISTS sponsor_to_chf_rate DECIMAL(12, 6),
  ADD COLUMN IF NOT EXISTS sponsor_rate_date DATE,
  ADD COLUMN IF NOT EXISTS sponsor_rate_source TEXT CHECK (sponsor_rate_source IN ('frankfurter', 'bank', 'manual', 'other')),
  ADD COLUMN IF NOT EXISTS payable_amount_chf INTEGER,
  ADD COLUMN IF NOT EXISTS payable_rounding TEXT CHECK (payable_rounding IS NULL OR payable_rounding = 'nearest_1_chf');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_sponsor_currency_conversion_positive'
  ) THEN
    ALTER TABLE sponsorship_invoices
      ADD CONSTRAINT chk_sponsor_currency_conversion_positive
      CHECK (
        (sponsor_amount IS NULL OR sponsor_amount > 0)
        AND (sponsor_to_chf_rate IS NULL OR sponsor_to_chf_rate > 0)
        AND (payable_amount_chf IS NULL OR payable_amount_chf >= 0)
      );
  END IF;
END $$;

COMMENT ON COLUMN sponsorship_invoices.sponsor_currency IS 'Sponsor-facing agreed currency shown on the invoice';
COMMENT ON COLUMN sponsorship_invoices.sponsor_amount IS 'Sponsor-facing agreed amount in minor units';
COMMENT ON COLUMN sponsorship_invoices.sponsor_to_chf_rate IS 'Rate used to convert 1 sponsor currency unit to CHF';
COMMENT ON COLUMN sponsorship_invoices.sponsor_rate_date IS 'Date of the sponsor-currency to CHF exchange rate';
COMMENT ON COLUMN sponsorship_invoices.sponsor_rate_source IS 'Source of the sponsor-currency exchange rate';
COMMENT ON COLUMN sponsorship_invoices.payable_amount_chf IS 'CHF amount requested by bank transfer after rounding';
COMMENT ON COLUMN sponsorship_invoices.payable_rounding IS 'Rounding policy used for payable_amount_chf';

COMMIT;
