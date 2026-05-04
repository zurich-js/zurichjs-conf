-- Add QR code, check-in, and registrant detail columns to workshop_registrations
ALTER TABLE workshop_registrations
  ADD COLUMN IF NOT EXISTS qr_code_url text,
  ADD COLUMN IF NOT EXISTS checked_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS company text,
  ADD COLUMN IF NOT EXISTS job_title text;

-- Backfill company/job_title from metadata for existing rows
UPDATE workshop_registrations
  SET company = metadata->>'company',
      job_title = metadata->>'job_title'
  WHERE metadata->>'company' IS NOT NULL
     OR metadata->>'job_title' IS NOT NULL;
