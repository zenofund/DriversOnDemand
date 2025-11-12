-- ============================================================================
-- Fix Real-time Sync and Add 2-Way Ratings Support
-- Migration: 009_fix_realtime_and_add_rater_role.sql
-- Description: 
--   1. Add SELECT RLS policies on bookings to enable Realtime events
--   2. Add rater_role to ratings table for 2-way reviews (client rates driver, driver rates client)
-- ============================================================================

-- ============================================================================
-- PART 1: FIX REALTIME SYNC BY ADDING SELECT POLICIES ON BOOKINGS
-- ============================================================================

-- Clients can view their own bookings
CREATE POLICY "Clients can view their own bookings"
  ON bookings FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  );

-- Drivers can view their assigned bookings
CREATE POLICY "Drivers can view their assigned bookings"
  ON bookings FOR SELECT
  USING (
    driver_id IN (
      SELECT id FROM drivers WHERE user_id = auth.uid()
    )
  );

-- Admins can view all bookings
CREATE POLICY "Admins can view all bookings"
  ON bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- ============================================================================
-- PART 2: ADD 2-WAY RATINGS SUPPORT
-- ============================================================================

-- Create rater_role enum for 2-way ratings
CREATE TYPE rater_role AS ENUM ('client', 'driver');

-- Add rater_role column to ratings table (nullable first for migration)
ALTER TABLE ratings ADD COLUMN rater_role rater_role;

-- Backfill existing ratings to 'client' (all existing ratings are from clients)
UPDATE ratings SET rater_role = 'client' WHERE rater_role IS NULL;

-- Make rater_role NOT NULL now that data is backfilled
ALTER TABLE ratings ALTER COLUMN rater_role SET NOT NULL;

-- Drop old unique constraint on booking_id (1 rating per booking)
ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_booking_id_key;

-- Add new composite unique constraint (1 rating per role per booking)
ALTER TABLE ratings ADD CONSTRAINT ratings_booking_id_rater_role_unique 
  UNIQUE (booking_id, rater_role);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN ratings.rater_role IS 'Who provided the rating: client rates driver, driver rates client';
COMMENT ON CONSTRAINT ratings_booking_id_rater_role_unique ON ratings IS 'Allows one rating per role per booking for 2-way reviews';
