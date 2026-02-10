-- Create the cleaning-photos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('cleaning-photos', 'cleaning-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload cleaning photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cleaning-photos');

-- Allow authenticated users to read files
CREATE POLICY "Authenticated users can read cleaning photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'cleaning-photos');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete cleaning photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'cleaning-photos');
