# Profile Pictures Setup - Simple Method (No SQL Needed)

## The Problem
The SQL migration requires special permissions. Here's the **manual UI method** that works for everyone:

---

## Step-by-Step Setup (2 minutes)

### Step 1: Create the Bucket

1. Go to your **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your **Draba project**
3. Click **Storage** in the left sidebar
4. Click the green **"New bucket"** button
5. Fill in:
   - **Name**: `profile-pictures`
   - **Public bucket**: ✅ **Check this box** (very important!)
   - Leave other settings as default
6. Click **"Create bucket"**

You should now see a bucket called `profile-pictures` with a green "Public" badge.

---

### Step 2: Set Up Permissions (Policies)

1. Click on your new **`profile-pictures`** bucket
2. Click the **"Policies"** tab at the top
3. Click **"New policy"**

**Create 4 policies:**

#### Policy 1: Allow Public Read

- Click **"New policy"**
- Select **"For full customization"**
- Fill in:
  - **Policy name**: `Public read access`
  - **Allowed operation**: `SELECT`
  - **Target roles**: `public`
  - **USING expression**: Leave empty or use `true`
- Click **"Review"** then **"Save policy"**

#### Policy 2: Allow Authenticated Upload

- Click **"New policy"**
- Select **"For full customization"**
- Fill in:
  - **Policy name**: `Authenticated users can upload`
  - **Allowed operation**: `INSERT`
  - **Target roles**: `authenticated`
  - **WITH CHECK expression**: `true`
- Click **"Review"** then **"Save policy"**

#### Policy 3: Allow Authenticated Update

- Click **"New policy"**
- Select **"For full customization"**
- Fill in:
  - **Policy name**: `Authenticated users can update`
  - **Allowed operation**: `UPDATE`
  - **Target roles**: `authenticated`
  - **USING expression**: `true`
  - **WITH CHECK expression**: `true`
- Click **"Review"** then **"Save policy"**

#### Policy 4: Allow Authenticated Delete

- Click **"New policy"**
- Select **"For full customization"**
- Fill in:
  - **Policy name**: `Authenticated users can delete`
  - **Allowed operation**: `DELETE`
  - **Target roles**: `authenticated`
  - **USING expression**: `true`
- Click **"Review"** then **"Save policy"**

---

### Step 3: Test It!

1. Go to your Draba app
2. Log in as a client or driver
3. Go to **Settings** page
4. Click **"Upload Picture"** or **"Change Picture"**
5. Select an image file (JPG, PNG, or WebP)
6. Crop it as desired
7. Click **"Crop & Save"**

You should see a green success toast notification! ✅

---

## Quick Verification

After setup, check:

- [ ] Bucket `profile-pictures` exists
- [ ] Bucket shows green "Public" badge
- [ ] 4 policies are visible in the Policies tab
- [ ] Upload works from the app
- [ ] Image displays correctly after upload

---

## Troubleshooting

**Still getting "Failed to upload image"?**

1. **Check Console Logs**:
   - Open browser DevTools (F12)
   - Go to Console tab
   - Look for detailed error message
   - It will tell you exactly what's wrong

2. **Common Issues**:
   - Bucket not public → Make sure green "Public" badge is showing
   - Not logged in → Log out and log back in
   - Wrong bucket name → Must be exactly `profile-pictures`
   - No policies → Make sure all 4 policies are created

**Images upload but don't show?**

- Verify bucket is **Public** (green badge)
- Clear your browser cache (Ctrl+Shift+Delete)
- Try logging out and back in

---

## What Gets Stored

Files are organized like this:
```
profile-pictures/
├── drivers/
│   └── {user-id}-{timestamp}.jpg
└── clients/
    └── {user-id}-{timestamp}.jpg
```

Each upload automatically overwrites your previous picture to save space.

---

## All Set! 🎉

Your profile picture feature is now ready to use. The app will:

- ✅ Auto-crop images to 1:1 squares
- ✅ Limit file size to 5MB
- ✅ Show green success notification
- ✅ Auto-dismiss notifications after 3 seconds
- ✅ Display uploaded picture immediately

Need help? Check the detailed error message in your browser console (F12).
