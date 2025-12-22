-- Storage policies for workout-images bucket
-- These policies allow authenticated users to upload, read, and delete their own images

-- Enable RLS on storage.objects (if not already enabled)
-- Note: This is typically enabled by default, but we'll ensure it's set

-- Policy: Users can upload images to their own folder
CREATE POLICY "Users can upload their own images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'workout-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can read their own images
CREATE POLICY "Users can read their own images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'workout-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own images
CREATE POLICY "Users can delete their own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'workout-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Public read access (if bucket is public)
-- This allows anyone to view images via public URL
CREATE POLICY "Public can read images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'workout-images');

