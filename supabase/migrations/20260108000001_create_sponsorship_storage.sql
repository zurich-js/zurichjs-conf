-- Create storage bucket for sponsorship assets
-- This bucket stores sponsor logos and invoice PDF files

-- Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sponsorship-assets',
  'sponsorship-assets',
  true, -- Public bucket so logos can be displayed on homepage
  10485760, -- 10MB max file size
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to sponsorship assets (logos and PDFs)
CREATE POLICY "Public read access to sponsorship assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'sponsorship-assets');

-- Allow service role to upload/update/delete sponsorship assets
CREATE POLICY "Service role can manage sponsorship assets"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'sponsorship-assets')
WITH CHECK (bucket_id = 'sponsorship-assets');
