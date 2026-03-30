-- Ticket Invoices Migration
-- Adds invoice records for individual and group ticket purchases

CREATE TABLE IF NOT EXISTS ticket_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Invoice Number (auto-generated: TI-2026-0001)
  invoice_number TEXT UNIQUE NOT NULL DEFAULT '',

  -- Order linkage — one invoice per Stripe checkout session
  stripe_session_id TEXT NOT NULL UNIQUE,
  ticket_ids TEXT[] NOT NULL DEFAULT '{}',
  primary_ticket_id UUID NOT NULL,

  -- Billing info from purchaser (from checkout session metadata)
  billing_name TEXT NOT NULL,
  billing_email TEXT NOT NULL,
  billing_company TEXT,
  billing_address_line1 TEXT,
  billing_address_line2 TEXT,
  billing_city TEXT,
  billing_state TEXT,
  billing_postal_code TEXT,
  billing_country TEXT,

  -- Amounts (all in cents)
  currency TEXT NOT NULL DEFAULT 'CHF',
  subtotal_amount INTEGER NOT NULL DEFAULT 0,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  total_amount INTEGER NOT NULL DEFAULT 0,

  -- PDF
  pdf_url TEXT,
  pdf_source TEXT CHECK (pdf_source IN ('generated', 'uploaded')),

  -- Line items snapshot (stored as JSON for PDF regeneration)
  line_items JSONB,

  -- Optional notes shown on PDF
  notes TEXT,

  -- Audit
  generated_by TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ticket_invoices_stripe_session_id ON ticket_invoices(stripe_session_id);
CREATE INDEX idx_ticket_invoices_invoice_number ON ticket_invoices(invoice_number);
CREATE INDEX idx_ticket_invoices_billing_email ON ticket_invoices(billing_email);
CREATE INDEX idx_ticket_invoices_generated_at ON ticket_invoices(generated_at DESC);

-- updated_at trigger (reuses the function from initial schema)
CREATE TRIGGER update_ticket_invoices_updated_at
  BEFORE UPDATE ON ticket_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate invoice number (format: TI-YYYY-NNNN)
CREATE OR REPLACE FUNCTION generate_ticket_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  year_prefix TEXT;
  next_number INTEGER;
BEGIN
  year_prefix := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM 9) AS INTEGER)
  ), 0) + 1
  INTO next_number
  FROM ticket_invoices
  WHERE invoice_number LIKE 'TI-' || year_prefix || '-%';

  NEW.invoice_number := 'TI-' || year_prefix || '-' || LPAD(next_number::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_ticket_invoice_number
  BEFORE INSERT ON ticket_invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '')
  EXECUTE FUNCTION generate_ticket_invoice_number();

COMMENT ON TABLE ticket_invoices IS 'Invoice records for Stripe ticket purchases (individual and group)';
COMMENT ON COLUMN ticket_invoices.stripe_session_id IS 'Stripe Checkout Session ID — groups all tickets from one purchase';
COMMENT ON COLUMN ticket_invoices.ticket_ids IS 'All ticket IDs included in this invoice';
COMMENT ON COLUMN ticket_invoices.primary_ticket_id IS 'The purchaser''s ticket (isPrimary: true)';
COMMENT ON COLUMN ticket_invoices.invoice_number IS 'Human-readable number (TI-YYYY-NNNN), auto-generated';
