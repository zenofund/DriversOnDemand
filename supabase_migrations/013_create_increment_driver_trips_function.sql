-- Migration 013: Create atomic increment function for driver total_trips
-- This prevents race conditions and ensures accurate trip counting
-- Run this in your Supabase SQL Editor

-- Create function to atomically increment driver's total_trips
CREATE OR REPLACE FUNCTION increment_driver_trips(driver_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE drivers
  SET total_trips = COALESCE(total_trips, 0) + 1,
      updated_at = NOW()
  WHERE id = driver_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_driver_trips(UUID) TO authenticated;

-- Verify the function was created
SELECT proname, proargtypes, prosrc 
FROM pg_proc 
WHERE proname = 'increment_driver_trips';
