-- ============================================================================
-- Add Completion Confirmation Columns to Bookings
-- Migration: 010_add_completion_confirmation_columns.sql
-- Description: 
--   Add driver_confirmed_at and client_confirmed_at columns to support
--   2-way completion confirmation workflow with approve/decline functionality
-- ============================================================================

-- Add completion confirmation timestamp columns
ALTER TABLE bookings 
  ADD COLUMN IF NOT EXISTS driver_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_confirmed_at TIMESTAMPTZ;

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_bookings_driver_confirmed 
  ON bookings(driver_confirmed_at) 
  WHERE driver_confirmed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_client_confirmed 
  ON bookings(client_confirmed_at) 
  WHERE client_confirmed_at IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN bookings.driver_confirmed_at IS 'Timestamp when driver confirmed trip completion';
COMMENT ON COLUMN bookings.client_confirmed_at IS 'Timestamp when client approved trip completion and triggered payment';
