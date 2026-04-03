-- Create storage bucket for ticket invoice PDFs

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ticket-invoices',
  'ticket-invoices',
  true,
  10485760, -- 10MB
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access to ticket invoice PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'ticket-invoices');

CREATE POLICY "Service role can manage ticket invoice PDFs"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'ticket-invoices')
WITH CHECK (bucket_id = 'ticket-invoices');
