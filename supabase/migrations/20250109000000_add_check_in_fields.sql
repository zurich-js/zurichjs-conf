-- Add check-in tracking fields to tickets table
-- Migration: Add checked_in and checked_in_at columns

ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS checked_in BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN public.tickets.checked_in IS 'Whether the ticket has been checked in at the venue';
COMMENT ON COLUMN public.tickets.checked_in_at IS 'Timestamp when the ticket was checked in';
