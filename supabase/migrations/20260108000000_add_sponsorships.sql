-- Sponsorship Management Migration
-- Adds support for sponsorship deals, invoicing, and tracking

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Sponsorship Deal Status Enum
CREATE TYPE sponsorship_deal_status AS ENUM (
  'draft',
  'offer_sent',
  'invoiced',
  'invoice_sent',
  'paid',
  'cancelled'
);

-- Line Item Type Enum
CREATE TYPE sponsorship_line_item_type AS ENUM (
  'tier_base',
  'addon',
  'adjustment'
);

-- Perk Status Enum
CREATE TYPE sponsorship_perk_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'not_applicable'
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- Sponsorship Tiers (Reference Data)
-- Seeded from src/data/sponsorship.ts tier configuration
CREATE TABLE IF NOT EXISTS sponsorship_tiers (
  id TEXT PRIMARY KEY, -- 'diamond', 'platinum', 'gold', 'silver', 'bronze', 'supporter'
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price_chf INTEGER NOT NULL, -- in cents
  price_eur INTEGER NOT NULL, -- in cents
  addon_credit_chf INTEGER NOT NULL DEFAULT 0, -- in cents
  addon_credit_eur INTEGER NOT NULL DEFAULT 0, -- in cents
  display_order INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sponsors Table
-- Stores company and contact information for sponsors
CREATE TABLE IF NOT EXISTS sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Company Information
  company_name TEXT NOT NULL,
  company_website TEXT,
  vat_id TEXT,

  -- Billing Address
  billing_address_street TEXT NOT NULL,
  billing_address_city TEXT NOT NULL,
  billing_address_postal_code TEXT NOT NULL,
  billing_address_country TEXT NOT NULL DEFAULT 'Switzerland',

  -- Contact Person
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,

  -- Logo Management
  logo_url TEXT,
  is_logo_public BOOLEAN NOT NULL DEFAULT FALSE, -- Toggle for public homepage display

  -- Internal Notes (admin-only, not shown on invoices)
  internal_notes TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sponsorship Deals Table
-- Tracks tier assignments, status, and timestamps for each sponsor deal
CREATE TABLE IF NOT EXISTS sponsorship_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  tier_id TEXT NOT NULL REFERENCES sponsorship_tiers(id),

  -- Deal Number (human-readable, auto-generated: SPO-2026-0001)
  deal_number TEXT UNIQUE NOT NULL,

  -- Currency for this deal
  currency TEXT NOT NULL CHECK (currency IN ('CHF', 'EUR')),

  -- Status Pipeline
  status sponsorship_deal_status NOT NULL DEFAULT 'draft',

  -- Status Timestamps
  offer_sent_at TIMESTAMPTZ,
  invoiced_at TIMESTAMPTZ,
  invoice_sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  paid_by TEXT, -- Admin who marked as paid

  -- Internal Notes
  internal_notes TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sponsorship Line Items Table
-- Stores tier base, add-ons, and adjustments for each deal
CREATE TABLE IF NOT EXISTS sponsorship_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES sponsorship_deals(id) ON DELETE CASCADE,

  -- Line Item Type
  type sponsorship_line_item_type NOT NULL,

  -- Description and Pricing
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price INTEGER NOT NULL, -- in cents (can be negative for adjustments)

  -- Credit Usage (for add-ons)
  uses_credit BOOLEAN NOT NULL DEFAULT FALSE, -- If true, this add-on can use tier credit

  -- Display Order
  display_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sponsorship Perks Table
-- Checklist of agreed perks with status tracking
CREATE TABLE IF NOT EXISTS sponsorship_perks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES sponsorship_deals(id) ON DELETE CASCADE,

  -- Perk Details
  name TEXT NOT NULL,
  description TEXT,

  -- Status Tracking
  status sponsorship_perk_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  completed_at TIMESTAMPTZ,

  -- Display Order
  display_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sponsorship Invoices Table
-- Invoice records with calculated totals
CREATE TABLE IF NOT EXISTS sponsorship_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES sponsorship_deals(id) ON DELETE CASCADE,

  -- Invoice Number (human-readable, auto-generated: SJG-2026-0001)
  invoice_number TEXT UNIQUE NOT NULL,

  -- Invoice Dates
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,

  -- Calculated Totals (snapshot at invoice creation time)
  subtotal INTEGER NOT NULL, -- tier_base + addons (in cents)
  credit_applied INTEGER NOT NULL DEFAULT 0, -- credit used against add-ons (in cents)
  adjustments_total INTEGER NOT NULL DEFAULT 0, -- sum of adjustments (in cents, can be negative)
  total_amount INTEGER NOT NULL, -- final total (in cents)
  currency TEXT NOT NULL CHECK (currency IN ('CHF', 'EUR')),

  -- Invoice PDF
  invoice_pdf_url TEXT,
  invoice_pdf_source TEXT CHECK (invoice_pdf_source IN ('generated', 'uploaded')),
  invoice_pdf_uploaded_at TIMESTAMPTZ,

  -- Notes shown on invoice
  invoice_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Sponsors indexes
CREATE INDEX idx_sponsors_company_name ON sponsors(company_name);
CREATE INDEX idx_sponsors_is_logo_public ON sponsors(is_logo_public) WHERE is_logo_public = TRUE;
CREATE INDEX idx_sponsors_created_at ON sponsors(created_at DESC);

-- Sponsorship Deals indexes
CREATE INDEX idx_sponsorship_deals_sponsor_id ON sponsorship_deals(sponsor_id);
CREATE INDEX idx_sponsorship_deals_tier_id ON sponsorship_deals(tier_id);
CREATE INDEX idx_sponsorship_deals_status ON sponsorship_deals(status);
CREATE INDEX idx_sponsorship_deals_deal_number ON sponsorship_deals(deal_number);
CREATE INDEX idx_sponsorship_deals_created_at ON sponsorship_deals(created_at DESC);

-- Line Items indexes
CREATE INDEX idx_sponsorship_line_items_deal_id ON sponsorship_line_items(deal_id);
CREATE INDEX idx_sponsorship_line_items_type ON sponsorship_line_items(type);

-- Perks indexes
CREATE INDEX idx_sponsorship_perks_deal_id ON sponsorship_perks(deal_id);
CREATE INDEX idx_sponsorship_perks_status ON sponsorship_perks(status);

-- Invoices indexes
CREATE INDEX idx_sponsorship_invoices_deal_id ON sponsorship_invoices(deal_id);
CREATE INDEX idx_sponsorship_invoices_invoice_number ON sponsorship_invoices(invoice_number);
CREATE INDEX idx_sponsorship_invoices_created_at ON sponsorship_invoices(created_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at triggers for all tables
CREATE TRIGGER update_sponsorship_tiers_updated_at
  BEFORE UPDATE ON sponsorship_tiers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sponsors_updated_at
  BEFORE UPDATE ON sponsors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sponsorship_deals_updated_at
  BEFORE UPDATE ON sponsorship_deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sponsorship_line_items_updated_at
  BEFORE UPDATE ON sponsorship_line_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sponsorship_perks_updated_at
  BEFORE UPDATE ON sponsorship_perks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sponsorship_invoices_updated_at
  BEFORE UPDATE ON sponsorship_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- AUTO-GENERATION FUNCTIONS
-- ============================================================================

-- Function to generate deal number (format: SPO-2026-0001)
CREATE OR REPLACE FUNCTION generate_sponsorship_deal_number()
RETURNS TRIGGER AS $$
DECLARE
  year_prefix TEXT;
  next_number INTEGER;
BEGIN
  year_prefix := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(deal_number FROM 10) AS INTEGER)
  ), 0) + 1
  INTO next_number
  FROM sponsorship_deals
  WHERE deal_number LIKE 'SPO-' || year_prefix || '-%';

  NEW.deal_number := 'SPO-' || year_prefix || '-' || LPAD(next_number::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate deal number on insert
CREATE TRIGGER set_sponsorship_deal_number
  BEFORE INSERT ON sponsorship_deals
  FOR EACH ROW
  WHEN (NEW.deal_number IS NULL OR NEW.deal_number = '')
  EXECUTE FUNCTION generate_sponsorship_deal_number();

-- Function to generate invoice number (format: SJG-2026-0001)
CREATE OR REPLACE FUNCTION generate_sponsorship_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  year_prefix TEXT;
  next_number INTEGER;
BEGIN
  year_prefix := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM 10) AS INTEGER)
  ), 0) + 1
  INTO next_number
  FROM sponsorship_invoices
  WHERE invoice_number LIKE 'SJG-' || year_prefix || '-%';

  NEW.invoice_number := 'SJG-' || year_prefix || '-' || LPAD(next_number::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate invoice number on insert
CREATE TRIGGER set_sponsorship_invoice_number
  BEFORE INSERT ON sponsorship_invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '')
  EXECUTE FUNCTION generate_sponsorship_invoice_number();

-- ============================================================================
-- SEED DATA (Sponsorship Tiers from src/data/sponsorship.ts)
-- ============================================================================

INSERT INTO sponsorship_tiers (id, name, description, price_chf, price_eur, addon_credit_chf, addon_credit_eur, display_order)
VALUES
  ('diamond', 'Diamond', 'Ultimate visibility and premium brand placement', 1200000, 1250000, 500000, 500000, 1),
  ('platinum', 'Platinum', 'Maximum exposure and brand recognition', 900000, 950000, 400000, 400000, 2),
  ('gold', 'Gold', 'Strong presence and engagement opportunities', 700000, 725000, 250000, 250000, 3),
  ('silver', 'Silver', 'Solid brand visibility and networking', 500000, 500000, 150000, 150000, 4),
  ('bronze', 'Bronze', 'Great entry-level sponsorship', 250000, 250000, 100000, 100000, 5),
  ('supporter', 'Supporter', 'Show your support for the community', 100000, 100000, 0, 0, 6)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_chf = EXCLUDED.price_chf,
  price_eur = EXCLUDED.price_eur,
  addon_credit_chf = EXCLUDED.addon_credit_chf,
  addon_credit_eur = EXCLUDED.addon_credit_eur,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE sponsorship_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsorship_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsorship_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsorship_perks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsorship_invoices ENABLE ROW LEVEL SECURITY;

-- Sponsorship Tiers: Public read (for API consumption), service role full access
CREATE POLICY "Public read access to sponsorship tiers"
  ON sponsorship_tiers FOR SELECT
  USING (true);

CREATE POLICY "Service role full access to sponsorship tiers"
  ON sponsorship_tiers FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Sponsors: No public access, service role full access
CREATE POLICY "Service role full access to sponsors"
  ON sponsors FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Sponsorship Deals: No public access, service role full access
CREATE POLICY "Service role full access to sponsorship deals"
  ON sponsorship_deals FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Line Items: No public access, service role full access
CREATE POLICY "Service role full access to sponsorship line items"
  ON sponsorship_line_items FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Perks: No public access, service role full access
CREATE POLICY "Service role full access to sponsorship perks"
  ON sponsorship_perks FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Invoices: No public access, service role full access
CREATE POLICY "Service role full access to sponsorship invoices"
  ON sponsorship_invoices FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE sponsorship_tiers IS 'Reference table for sponsorship tier configurations';
COMMENT ON TABLE sponsors IS 'Company and contact information for sponsors';
COMMENT ON TABLE sponsorship_deals IS 'Individual sponsorship deals linking sponsors to tiers';
COMMENT ON TABLE sponsorship_line_items IS 'Pricing breakdown: tier base, add-ons, and adjustments';
COMMENT ON TABLE sponsorship_perks IS 'Checklist of agreed perks with fulfillment tracking';
COMMENT ON TABLE sponsorship_invoices IS 'Invoice records with calculated totals and PDF storage';

COMMENT ON COLUMN sponsorship_tiers.price_chf IS 'Base tier price in Swiss Franc cents';
COMMENT ON COLUMN sponsorship_tiers.price_eur IS 'Base tier price in Euro cents';
COMMENT ON COLUMN sponsorship_tiers.addon_credit_chf IS 'Add-on credit amount in Swiss Franc cents';
COMMENT ON COLUMN sponsorship_tiers.addon_credit_eur IS 'Add-on credit amount in Euro cents';

COMMENT ON COLUMN sponsors.is_logo_public IS 'Whether logo should be displayed on public homepage';
COMMENT ON COLUMN sponsors.internal_notes IS 'Internal admin notes, not shown on invoices';

COMMENT ON COLUMN sponsorship_deals.deal_number IS 'Human-readable deal number (SPO-YYYY-NNNN)';
COMMENT ON COLUMN sponsorship_deals.status IS 'Deal status: draft -> offer_sent -> invoiced -> invoice_sent -> paid';

COMMENT ON COLUMN sponsorship_line_items.uses_credit IS 'If true, this add-on total can be offset by tier add-on credit';
COMMENT ON COLUMN sponsorship_line_items.unit_price IS 'Price in cents (can be negative for adjustments)';

COMMENT ON COLUMN sponsorship_invoices.invoice_number IS 'Human-readable invoice number (SJG-YYYY-NNNN)';
COMMENT ON COLUMN sponsorship_invoices.subtotal IS 'Sum of tier base + add-ons in cents';
COMMENT ON COLUMN sponsorship_invoices.credit_applied IS 'Add-on credit applied to eligible add-ons in cents';
COMMENT ON COLUMN sponsorship_invoices.adjustments_total IS 'Sum of adjustments in cents (can be negative)';
COMMENT ON COLUMN sponsorship_invoices.total_amount IS 'Final invoice total: subtotal - credit_applied + adjustments_total';
