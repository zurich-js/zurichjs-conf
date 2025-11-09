-- Add Transfer Tracking Fields
-- Tracks original owner information when tickets are transferred/reassigned

ALTER TABLE tickets
ADD COLUMN transferred_from_name TEXT,
ADD COLUMN transferred_from_email TEXT,
ADD COLUMN transferred_at TIMESTAMPTZ;

-- Add index for transfer tracking queries
CREATE INDEX idx_tickets_transferred_at ON tickets(transferred_at) WHERE transferred_at IS NOT NULL;

-- Add comment
COMMENT ON COLUMN tickets.transferred_from_name IS 'Name of the person who originally owned this ticket before transfer';
COMMENT ON COLUMN tickets.transferred_from_email IS 'Email of the person who originally owned this ticket before transfer';
COMMENT ON COLUMN tickets.transferred_at IS 'Timestamp when the ticket was transferred to the current owner';
