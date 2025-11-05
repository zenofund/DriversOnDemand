# Supabase Storage Setup for Profile Pictures

## Overview
This guide explains how to set up the Supabase Storage bucket for profile pictures in the Drivers On Demand platform.

## Setup Steps

### 1. Create Storage Bucket

1. **Log in to Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to **Storage** in the left sidebar

2. **Create New Bucket**
   - Click "New bucket" button
   - Enter bucket name: `profile-pictures`
   - **Public bucket**: ✅ Check this box (to allow public read access)
   - Click "Create bucket"

### 2. Configure Bucket Policies

The bucket needs to allow:
- **Public Read Access**: Anyone can view profile pictures
- **Authenticated Write Access**: Only authenticated users can upload their pictures

#### Set up RLS Policies

1. Click on the `profile-pictures` bucket
2. Go to **Policies** tab
3. Add the following policies:

**Policy 1: Public Read Access**
```sql
CREATE POLICY "Public read access for profile pictures"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-pictures');
```

**Policy 2: Authenticated Upload Access**
```sql
CREATE POLICY "Authenticated users can upload profile pictures"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-pictures' 
  AND auth.role() = 'authenticated'
);
```

**Policy 3: Users can update their own pictures**
```sql
CREATE POLICY "Users can update their own profile pictures"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

**Policy 4: Users can delete their own pictures**
```sql
CREATE POLICY "Users can delete their own profile pictures"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### 3. Configure Bucket Settings

1. **File Size Limit**: 5 MB (already enforced in client-side code)
2. **Allowed MIME Types**: 
   - image/jpeg
   - image/jpg
   - image/png
   - image/webp

3. **Folder Structure**:
   ```
   profile-pictures/
   ├── drivers/
   │   ├── {driver-id}-{timestamp}.jpg
   │   └── ...
   └── clients/
       ├── {client-id}-{timestamp}.jpg
       └── ...
   ```

### 4. Test Upload

After setup, test the upload functionality:

1. Log in as a driver or client
2. Go to Settings page
3. Click "Upload Picture" or "Change Picture"
4. Select an image file
5. Crop the image
6. Click "Crop & Save"

The image should upload successfully and display immediately.

## Alternative: Using Supabase CLI

If you prefer to set up via CLI:

```bash
# Create bucket
npx supabase storage create profile-pictures --public

# Add policies (run these SQL commands)
npx supabase db execute -f storage-policies.sql
```

Create `storage-policies.sql` with:
```sql
-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Public read access for profile pictures"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-pictures');

-- Authenticated upload
CREATE POLICY "Authenticated users can upload profile pictures"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-pictures' 
  AND auth.role() = 'authenticated'
);

-- Update own pictures
CREATE POLICY "Users can update their own profile pictures"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Delete own pictures
CREATE POLICY "Users can delete their own profile pictures"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## Verification

After setup, verify:

1. ✅ Bucket `profile-pictures` exists
2. ✅ Bucket is public
3. ✅ RLS policies are enabled
4. ✅ Upload works from the app
5. ✅ Images display correctly

## Troubleshooting

### Upload Fails
- Check if bucket exists
- Verify bucket is public
- Check RLS policies are correctly set
- Ensure user is authenticated

### Images Don't Display
- Verify bucket is public
- Check image URLs in database
- Clear browser cache
- Check CORS settings in Supabase

### Permission Denied
- Verify RLS policies are correct
- Check user authentication
- Ensure policy conditions match folder structure

## Storage URL Format

Public URLs follow this format:
```
https://[project-ref].supabase.co/storage/v1/object/public/profile-pictures/drivers/[filename]
```

Example:
```
https://abcdefgh.supabase.co/storage/v1/object/public/profile-pictures/drivers/550e8400-e29b-41d4-a716-446655440000-1234567890.jpg
```

## Best Practices

1. **Image Optimization**
   - Images are cropped to 1:1 aspect ratio
   - Compressed to JPEG at 95% quality
   - Max file size: 5MB

2. **Naming Convention**
   - Format: `{user-id}-{timestamp}.{ext}`
   - Prevents filename conflicts
   - Easy to identify owner

3. **Security**
   - Public read access only
   - Write access requires authentication
   - Users can only modify their own images

4. **Cleanup**
   - Old images are automatically overwritten (upsert: true)
   - Consider implementing periodic cleanup of unused images

## Environment Variables

Ensure these are set in your `.env`:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Database Migration

Don't forget to run the database migration to add profile picture columns:

```bash
psql -d your_database < migrations/004_add_profile_pictures.sql
```

Or in Supabase Dashboard:
1. Go to SQL Editor
2. Paste contents of `004_add_profile_pictures.sql`
3. Execute

## Done!

Profile pictures should now be fully functional in your application.
