-- Add invoice_notes column for notes displayed on the invoice PDF
-- Separate from the internal 'notes' column which is for admin use only

ALTER TABLE b2b_invoices
ADD COLUMN IF NOT EXISTS invoice_notes TEXT;

-- Add Stripe payment link columns
ALTER TABLE b2b_invoices
ADD COLUMN IF NOT EXISTS stripe_payment_link_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_link_url TEXT;

-- Add comment to clarify the difference between notes columns
COMMENT ON COLUMN b2b_invoices.notes IS 'Internal notes for admin use, not shown on invoice';
COMMENT ON COLUMN b2b_invoices.invoice_notes IS 'Notes displayed on the invoice PDF';
COMMENT ON COLUMN b2b_invoices.stripe_payment_link_id IS 'Stripe Payment Link ID when payment_method is stripe';
COMMENT ON COLUMN b2b_invoices.stripe_payment_link_url IS 'Stripe Payment Link URL for customer to pay';
