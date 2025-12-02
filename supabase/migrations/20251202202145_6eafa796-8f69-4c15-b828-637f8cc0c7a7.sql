-- Make the storage bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'bioimpedance-images';

-- Drop existing storage policies if any
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete images" ON storage.objects;

-- Create RLS policies for storage
CREATE POLICY "Authenticated users can upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'bioimpedance-images');

CREATE POLICY "Authenticated users can view images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'bioimpedance-images');

CREATE POLICY "Authenticated users can update images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'bioimpedance-images');

CREATE POLICY "Authenticated users can delete images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'bioimpedance-images');