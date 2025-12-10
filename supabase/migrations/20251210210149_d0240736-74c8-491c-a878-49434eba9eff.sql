-- Fix storage security: Make bioimpedance-images bucket private
UPDATE storage.buckets SET public = false WHERE id = 'bioimpedance-images';

-- Drop existing public storage policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view bioimpedance images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload bioimpedance images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload bioimpedance images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view bioimpedance images" ON storage.objects;

-- Create secure storage policies for authenticated users only
CREATE POLICY "Authenticated users can view bioimpedance images" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (bucket_id = 'bioimpedance-images');

CREATE POLICY "Authenticated users can upload bioimpedance images" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'bioimpedance-images');

CREATE POLICY "Master can delete bioimpedance images" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (bucket_id = 'bioimpedance-images' AND public.is_master(auth.uid()));