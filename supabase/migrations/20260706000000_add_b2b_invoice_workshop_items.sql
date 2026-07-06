-- B2B Invoice Workshop Items
-- Adds workshop seat line items to B2B invoices, plus per-attendee seat
-- assignments so paid invoices can fulfil into workshop_registrations.

BEGIN;

-- Workshop line items on an invoice (one row per workshop offering)
CREATE TABLE IF NOT EXISTS b2b_invoice_workshop_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES b2b_invoices(id) ON DELETE CASCADE,
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,

  -- Title snapshot so the invoice keeps rendering if the offering is renamed
  workshop_title TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0), -- in cents

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_b2b_invoice_workshop UNIQUE (invoice_id, workshop_id)
);

-- Which attendee occupies which purchased workshop seat.
-- registration_id is populated when the invoice is marked as paid.
CREATE TABLE IF NOT EXISTS b2b_invoice_attendee_workshops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendee_id UUID NOT NULL REFERENCES b2b_invoice_attendees(id) ON DELETE CASCADE,
  workshop_item_id UUID NOT NULL REFERENCES b2b_invoice_workshop_items(id) ON DELETE CASCADE,
  registration_id UUID REFERENCES workshop_registrations(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_b2b_attendee_workshop UNIQUE (attendee_id, workshop_item_id)
);

CREATE INDEX IF NOT EXISTS idx_b2b_invoice_workshop_items_invoice_id
  ON b2b_invoice_workshop_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_b2b_attendee_workshops_attendee_id
  ON b2b_invoice_attendee_workshops(attendee_id);
CREATE INDEX IF NOT EXISTS idx_b2b_attendee_workshops_item_id
  ON b2b_invoice_attendee_workshops(workshop_item_id);

CREATE TRIGGER update_b2b_invoice_workshop_items_updated_at
  BEFORE UPDATE ON b2b_invoice_workshop_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Admin/service-role only, same as the other b2b_invoice tables:
-- RLS on with no policies means only the service role can touch them.
ALTER TABLE b2b_invoice_workshop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_invoice_attendee_workshops ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE b2b_invoice_workshop_items IS 'Workshop seat line items on B2B invoices';
COMMENT ON TABLE b2b_invoice_attendee_workshops IS 'Assignment of B2B invoice attendees to purchased workshop seats; linked to workshop_registrations when paid';
COMMENT ON COLUMN b2b_invoice_workshop_items.workshop_title IS 'Snapshot of the workshop title at the time the line item was added';
COMMENT ON COLUMN b2b_invoice_workshop_items.unit_price IS 'Price per workshop seat in cents';

COMMIT;
