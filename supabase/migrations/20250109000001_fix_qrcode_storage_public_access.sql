-- Fix QR Code Storage Public Access
-- Ensure QR codes are accessible to anonymous users (for email clients)

-- Drop the existing public read policy
DROP POLICY IF EXISTS "Public read access to ticket QR codes" ON storage.objects;

-- Create a new policy that explicitly allows anonymous access
CREATE POLICY "Public read access to ticket QR codes"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'ticket-qrcodes');

-- Also ensure the bucket is truly public
UPDATE storage.buckets
SET public = true
WHERE id = 'ticket-qrcodes';
