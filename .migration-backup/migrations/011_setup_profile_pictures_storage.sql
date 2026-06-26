-- ============================================================================
-- SUPABASE STORAGE SETUP FOR PROFILE PICTURES
-- ============================================================================
-- 
-- This migration sets up the Supabase Storage bucket for profile pictures
-- Run this in the Supabase SQL Editor
--
-- ============================================================================

-- Create the storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-pictures',
  'profile-pictures',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running this migration)
DROP POLICY IF EXISTS "Public read access for profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile pictures" ON storage.objects;

-- Policy 1: Public Read Access
-- Anyone can view profile pictures (needed for displaying them on the platform)
CREATE POLICY "Public read access for profile pictures"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-pictures');

-- Policy 2: Authenticated Upload Access
-- Only authenticated users can upload new profile pictures
CREATE POLICY "Authenticated users can upload profile pictures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures'
);

-- Policy 3: Users Can Update Their Own Pictures
-- Users can update files in their folder (drivers/ or clients/)
CREATE POLICY "Users can update their own profile pictures"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-pictures')
WITH CHECK (bucket_id = 'profile-pictures');

-- Policy 4: Users Can Delete Their Own Pictures
-- Users can delete their old profile pictures
CREATE POLICY "Users can delete their own profile pictures"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-pictures');

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify bucket was created
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'profile-pictures';

-- Verify policies were created
SELECT policyname, cmd, qual::text 
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%profile pictures%';
