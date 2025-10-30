-- Migration: Make license_no nullable for drivers
-- Reason: Drivers don't have license info at signup, they provide it during profile completion
-- Date: 2025-10-29

-- Make license_no nullable
ALTER TABLE drivers ALTER COLUMN license_no DROP NOT NULL;

-- Add a comment to document this
COMMENT ON COLUMN drivers.license_no IS 'Driver license number - provided during profile completion, not required at signup';
