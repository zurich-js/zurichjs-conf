-- Add QR code URL field to tickets table
-- Stores the Supabase storage URL for the ticket's QR code

ALTER TABLE tickets
ADD COLUMN qr_code_url TEXT;

-- Add comment
COMMENT ON COLUMN tickets.qr_code_url IS 'Public URL to the stored QR code image in Supabase storage';
