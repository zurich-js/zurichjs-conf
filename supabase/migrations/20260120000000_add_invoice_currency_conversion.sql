-- Add Multi-Currency Support for Sponsorship Invoices
-- Allows sponsors to pay in EUR while keeping CHF as the canonical base amount

-- ============================================================================
-- RATE SOURCE ENUM
-- ============================================================================

-- Conversion rate source enum
CREATE TYPE sponsorship_conversion_rate_source AS ENUM (
  'ecb',
  'bank',
  'manual',
  'other'
);

-- ============================================================================
-- ALTER TABLE
-- ============================================================================

-- Add multi-currency fields to sponsorship_invoices
ALTER TABLE sponsorship_invoices
  -- Base currency is always CHF (the canonical amount)
  ADD COLUMN base_currency TEXT NOT NULL DEFAULT 'CHF' CHECK (base_currency = 'CHF'),
  ADD COLUMN base_amount_chf INTEGER,

  -- Payable currency (EUR when conversion enabled, NULL otherwise)
  ADD COLUMN payable_currency TEXT CHECK (payable_currency IN ('CHF', 'EUR')),

  -- Conversion fields (only populated when paying in EUR)
  ADD COLUMN conversion_rate_chf_to_eur DECIMAL(10, 6),
  ADD COLUMN converted_amount_eur INTEGER,
  ADD COLUMN conversion_justification TEXT,
  ADD COLUMN conversion_rate_source sponsorship_conversion_rate_source,

  -- Audit fields for conversion
  ADD COLUMN conversion_updated_by TEXT,
  ADD COLUMN conversion_updated_at TIMESTAMPTZ;

-- ============================================================================
-- CONSTRAINTS
-- ============================================================================

-- Add check constraint to ensure conversion fields are consistent
-- When payable_currency is EUR, all conversion fields must be present
-- When payable_currency is CHF or NULL, conversion fields should be NULL
ALTER TABLE sponsorship_invoices
  ADD CONSTRAINT chk_conversion_fields_consistent
    CHECK (
      (payable_currency = 'EUR' AND conversion_rate_chf_to_eur IS NOT NULL AND converted_amount_eur IS NOT NULL AND conversion_justification IS NOT NULL)
      OR
      (payable_currency IS NULL OR payable_currency = 'CHF')
    );

-- Add check constraint for reasonable conversion rate (0.1 to 10)
ALTER TABLE sponsorship_invoices
  ADD CONSTRAINT chk_conversion_rate_reasonable
    CHECK (conversion_rate_chf_to_eur IS NULL OR (conversion_rate_chf_to_eur > 0.1 AND conversion_rate_chf_to_eur < 10));

-- Add check constraint for positive converted amount
ALTER TABLE sponsorship_invoices
  ADD CONSTRAINT chk_converted_amount_positive
    CHECK (converted_amount_eur IS NULL OR converted_amount_eur > 0);

-- ============================================================================
-- DATA MIGRATION
-- ============================================================================

-- For existing invoices, set base_amount_chf to total_amount if currency is CHF
UPDATE sponsorship_invoices
SET base_amount_chf = total_amount
WHERE currency = 'CHF';

-- For existing EUR invoices, we don't have conversion data, so leave as-is
-- They will continue to work with the existing single-currency display

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN sponsorship_invoices.base_currency IS 'Base currency is always CHF - the canonical amount for accounting';
COMMENT ON COLUMN sponsorship_invoices.base_amount_chf IS 'Base invoice total in CHF cents (same as total_amount when currency=CHF)';
COMMENT ON COLUMN sponsorship_invoices.payable_currency IS 'Currency the sponsor will pay in (CHF or EUR). NULL means same as base currency';
COMMENT ON COLUMN sponsorship_invoices.conversion_rate_chf_to_eur IS 'Conversion rate from CHF to EUR (e.g., 0.95 means 1 CHF = 0.95 EUR)';
COMMENT ON COLUMN sponsorship_invoices.converted_amount_eur IS 'Amount payable in EUR cents after conversion';
COMMENT ON COLUMN sponsorship_invoices.conversion_justification IS 'Explanation for the conversion rate (e.g., ECB rate on date, agreed with sponsor)';
COMMENT ON COLUMN sponsorship_invoices.conversion_rate_source IS 'Source of the conversion rate: ecb, bank, manual, other';
COMMENT ON COLUMN sponsorship_invoices.conversion_updated_by IS 'Admin who last updated the conversion fields';
COMMENT ON COLUMN sponsorship_invoices.conversion_updated_at IS 'When the conversion fields were last updated';
