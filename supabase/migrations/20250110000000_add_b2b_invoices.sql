-- B2B Invoices Migration
-- Adds support for B2B ticket sales with invoice-based payments

-- B2B Invoice Status Enum
CREATE TYPE b2b_invoice_status AS ENUM ('draft', 'sent', 'paid', 'cancelled');

-- B2B Invoices Table
-- Stores invoice data for company bulk ticket purchases
CREATE TABLE IF NOT EXISTS b2b_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Invoice Number (human-readable, auto-generated: INV-2025-0001)
  invoice_number TEXT UNIQUE NOT NULL,

  -- Company Billing Information
  company_name TEXT NOT NULL,
  vat_id TEXT,
  billing_address_street TEXT NOT NULL,
  billing_address_city TEXT NOT NULL,
  billing_address_postal_code TEXT NOT NULL,
  billing_address_country TEXT NOT NULL DEFAULT 'Switzerland',

  -- Contact Person
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,

  -- Invoice Details
  status b2b_invoice_status NOT NULL DEFAULT 'draft',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  notes TEXT,

  -- Ticket Configuration
  ticket_category TEXT NOT NULL CHECK (ticket_category IN ('standard', 'student', 'unemployed', 'vip')),
  ticket_stage TEXT NOT NULL CHECK (ticket_stage IN ('blind_bird', 'early_bird', 'general_admission', 'late_bird')),
  ticket_quantity INTEGER NOT NULL CHECK (ticket_quantity > 0),
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0), -- in cents
  currency TEXT NOT NULL DEFAULT 'CHF',

  -- Calculated totals (stored for reference)
  subtotal INTEGER NOT NULL, -- in cents (unit_price * ticket_quantity)
  vat_rate DECIMAL(5,2) NOT NULL DEFAULT 0, -- e.g., 8.1 for 8.1%
  vat_amount INTEGER NOT NULL DEFAULT 0, -- in cents
  total_amount INTEGER NOT NULL, -- in cents (subtotal + vat_amount)

  -- Payment Tracking
  payment_method TEXT DEFAULT 'bank_transfer',
  bank_transfer_reference TEXT,
  paid_at TIMESTAMPTZ,
  paid_by TEXT, -- admin who marked as paid

  -- Invoice PDF
  invoice_pdf_url TEXT,
  invoice_pdf_source TEXT CHECK (invoice_pdf_source IN ('generated', 'uploaded')),
  invoice_pdf_uploaded_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- B2B Invoice Attendees Table
-- Stores attendee details before tickets are created
CREATE TABLE IF NOT EXISTS b2b_invoice_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES b2b_invoices(id) ON DELETE CASCADE,

  -- Attendee Details
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  job_title TEXT,

  -- Link to ticket (populated when invoice is paid and ticket is created)
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,

  -- Email Status
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_b2b_invoices_status ON b2b_invoices(status);
CREATE INDEX idx_b2b_invoices_invoice_number ON b2b_invoices(invoice_number);
CREATE INDEX idx_b2b_invoices_company_name ON b2b_invoices(company_name);
CREATE INDEX idx_b2b_invoices_created_at ON b2b_invoices(created_at DESC);
CREATE INDEX idx_b2b_invoice_attendees_invoice_id ON b2b_invoice_attendees(invoice_id);
CREATE INDEX idx_b2b_invoice_attendees_email ON b2b_invoice_attendees(email);
CREATE INDEX idx_b2b_invoice_attendees_ticket_id ON b2b_invoice_attendees(ticket_id) WHERE ticket_id IS NOT NULL;

-- Triggers for updated_at
CREATE TRIGGER update_b2b_invoices_updated_at
  BEFORE UPDATE ON b2b_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_b2b_invoice_attendees_updated_at
  BEFORE UPDATE ON b2b_invoice_attendees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate invoice number (format: INV-2025-0001)
CREATE OR REPLACE FUNCTION generate_b2b_invoice_number()
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
  FROM b2b_invoices
  WHERE invoice_number LIKE 'INV-' || year_prefix || '-%';

  NEW.invoice_number := 'INV-' || year_prefix || '-' || LPAD(next_number::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate invoice number on insert
CREATE TRIGGER set_b2b_invoice_number
  BEFORE INSERT ON b2b_invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '')
  EXECUTE FUNCTION generate_b2b_invoice_number();

-- Comments for documentation
COMMENT ON TABLE b2b_invoices IS 'B2B invoices for company bulk ticket purchases';
COMMENT ON TABLE b2b_invoice_attendees IS 'Attendee details for B2B invoice tickets, linked to tickets when paid';
COMMENT ON COLUMN b2b_invoices.invoice_number IS 'Human-readable invoice number (INV-YYYY-NNNN)';
COMMENT ON COLUMN b2b_invoices.unit_price IS 'Price per ticket in cents';
COMMENT ON COLUMN b2b_invoices.subtotal IS 'Total before VAT in cents';
COMMENT ON COLUMN b2b_invoices.vat_rate IS 'VAT percentage (e.g., 8.1 for 8.1%)';
COMMENT ON COLUMN b2b_invoices.total_amount IS 'Total including VAT in cents';
COMMENT ON COLUMN b2b_invoices.invoice_pdf_source IS 'Whether PDF was generated by system or uploaded';
COMMENT ON COLUMN b2b_invoice_attendees.ticket_id IS 'Linked ticket ID, populated when invoice is marked as paid';
