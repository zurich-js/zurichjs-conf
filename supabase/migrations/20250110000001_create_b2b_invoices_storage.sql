-- Create storage bucket for B2B invoice PDFs
-- This bucket stores generated and uploaded invoice PDF files

-- Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'b2b-invoices',
  'b2b-invoices',
  true, -- Public bucket so PDFs can be accessed/downloaded
  10485760, -- 10MB max file size
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to invoice PDFs
CREATE POLICY "Public read access to B2B invoice PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'b2b-invoices');

-- Allow service role to upload/update/delete invoice PDFs
CREATE POLICY "Service role can manage B2B invoice PDFs"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'b2b-invoices')
WITH CHECK (bucket_id = 'b2b-invoices');
