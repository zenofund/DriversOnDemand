# Profile Pictures Setup - Quick Start

## Problem
Profile picture uploads are failing because the Supabase Storage bucket doesn't exist yet.

## Solution - 2 Minutes Setup ⚡

### Option 1: Using Supabase SQL Editor (Recommended)

1. **Open Supabase Dashboard**
   - Go to your Supabase project: https://supabase.com/dashboard
   - Click on your project

2. **Run the Migration**
   - Click **SQL Editor** in the left sidebar
   - Click **New query**
   - Copy and paste the contents of `migrations/011_setup_profile_pictures_storage.sql`
   - Click **Run** or press `Ctrl+Enter`

3. **Verify Success**
   - You should see output showing the bucket and policies were created
   - Go to **Storage** in the left sidebar
   - You should see a bucket named `profile-pictures` with a green "Public" badge

4. **Test Upload**
   - Go to your app
   - Navigate to Settings page (as driver or client)
   - Click "Upload Picture"
   - Select an image and upload - it should work! ✅

---

### Option 2: Manual Setup (Alternative)

If the SQL approach doesn't work:

1. **Create Bucket**
   - Go to **Storage** in Supabase Dashboard
   - Click **New bucket**
   - Name: `profile-pictures`
   - ✅ Check "Public bucket"
   - Click **Create bucket**

2. **Add Policies**
   - Click on the `profile-pictures` bucket
   - Go to **Policies** tab
   - Click **New Policy** → **For full customization**
   - Copy each policy from `migrations/011_setup_profile_pictures_storage.sql` and create them one by one

---

## Verification Checklist

After setup, verify these:

- [ ] Bucket `profile-pictures` exists in Storage
- [ ] Bucket has green "Public" badge
- [ ] 4 policies are visible in the Policies tab
- [ ] Upload works from the app
- [ ] Uploaded image displays correctly

## Troubleshooting

**Still getting errors?**
1. Check browser console (F12) for detailed error message
2. Verify you're logged in
3. Check that the bucket is public
4. Make sure RLS policies are active

**Images upload but don't display?**
- Verify bucket is public
- Clear browser cache
- Check the URL in database matches the actual file location

## File Structure

Once working, images are stored like this:
```
profile-pictures/
├── drivers/
│   └── {driver-id}-{timestamp}.jpg
└── clients/
    └── {client-id}-{timestamp}.jpg
```

## Features

- ✅ Auto-crop to 1:1 aspect ratio
- ✅ 5MB file size limit
- ✅ Supports: JPG, PNG, WebP
- ✅ Auto-dismiss success/error toasts
- ✅ Instant preview after upload

---

Need help? Check the detailed guide in `SUPABASE_STORAGE_SETUP.md`
