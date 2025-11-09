-- Create storage bucket for ticket QR codes
-- This bucket stores generated QR code images for tickets

-- Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ticket-qrcodes',
  'ticket-qrcodes',
  true, -- Public bucket so QR codes can be accessed in emails
  1048576, -- 1MB max file size (QR codes are small)
  ARRAY['image/png']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Note: RLS is already enabled on storage.objects by default in Supabase
-- No need to enable it explicitly

-- Allow public read access to QR codes (needed for email display)
CREATE POLICY "Public read access to ticket QR codes"
ON storage.objects FOR SELECT
USING (bucket_id = 'ticket-qrcodes');

-- Allow service role to upload/update QR codes
CREATE POLICY "Service role can manage QR codes"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'ticket-qrcodes')
WITH CHECK (bucket_id = 'ticket-qrcodes');

-- Allow authenticated users to upload their own QR codes (future use)
CREATE POLICY "Authenticated users can upload QR codes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ticket-qrcodes');
