-- ============================================================================
-- ADD PROFILE PICTURES TO DRIVERS AND CLIENTS
-- ============================================================================

-- Add profile_picture_url to drivers table
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Add profile_picture_url to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Create storage bucket for profile pictures (this will be done via Supabase Dashboard or API)
-- Bucket name: profile-pictures
-- Public: true (read access)
-- File size limit: 5MB
-- Allowed mime types: image/jpeg, image/png, image/webp

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_drivers_profile_picture ON drivers(profile_picture_url);
CREATE INDEX IF NOT EXISTS idx_clients_profile_picture ON clients(profile_picture_url);
