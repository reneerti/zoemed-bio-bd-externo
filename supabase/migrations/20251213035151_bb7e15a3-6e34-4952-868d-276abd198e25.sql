-- Fix storage policies to verify ownership using folder structure
-- First, drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view bioimpedance images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload bioimpedance images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view bioimpedance images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload bioimpedance images" ON storage.objects;

-- Create ownership-based policies using folder structure (user_id/filename)
-- Users can only view their own images (files in their folder)
CREATE POLICY "Users can view own bioimpedance images" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (
  bucket_id = 'bioimpedance-images' 
  AND (
    -- Owner can view their own files
    (storage.foldername(name))[1] = auth.uid()::text
    -- Or master/admin can view all files
    OR is_master(auth.uid())
  )
);

-- Users can upload to their own folder only
CREATE POLICY "Users can upload own bioimpedance images" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'bioimpedance-images' 
  AND (
    -- Owner uploads to their own folder
    (storage.foldername(name))[1] = auth.uid()::text
    -- Or master/admin can upload anywhere
    OR is_master(auth.uid())
  )
);

-- Users can update their own images
CREATE POLICY "Users can update own bioimpedance images" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'bioimpedance-images' 
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR is_master(auth.uid())
  )
);

-- Users can delete their own images
CREATE POLICY "Users can delete own bioimpedance images" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'bioimpedance-images' 
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR is_master(auth.uid())
  )
);