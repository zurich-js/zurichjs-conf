-- Allow workshop-only B2B invoices
-- A company that already bought conference tickets may want its workshop seats
-- invoiced separately, so an invoice can now carry zero tickets and only
-- workshop line items. `ticket_quantity = 0` marks such an invoice.

BEGIN;

ALTER TABLE b2b_invoices DROP CONSTRAINT IF EXISTS b2b_invoices_ticket_quantity_check;
ALTER TABLE b2b_invoices
  ADD CONSTRAINT b2b_invoices_ticket_quantity_check CHECK (ticket_quantity >= 0);

COMMENT ON COLUMN b2b_invoices.ticket_quantity IS
  'Number of conference tickets on the invoice. 0 means a workshop-only invoice: no tickets are created when it is paid, only workshop registrations. Requiring at least one ticket or one workshop line is enforced in the application layer.';

COMMIT;
