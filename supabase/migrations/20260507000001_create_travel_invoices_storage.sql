-- Create storage bucket for travel invoice PDFs (flights, trains, hotels, etc.)
-- Used by src/pages/api/admin/cfp/travel/invoices/[id]/upload.ts

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'travel-invoices',
  'travel-invoices',
  true,
  10485760, -- 10MB
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access to travel invoice PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'travel-invoices');

CREATE POLICY "Service role can manage travel invoice PDFs"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'travel-invoices')
WITH CHECK (bucket_id = 'travel-invoices');
