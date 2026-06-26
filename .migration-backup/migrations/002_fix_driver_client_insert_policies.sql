-- Migration: Fix RLS policies to allow trigger-based profile creation
-- Reason: The trigger function can't insert into drivers/clients tables because RLS blocks it
-- Date: 2025-10-30

-- Drop existing restrictive insert policies
DROP POLICY IF EXISTS "New users can insert driver profile" ON drivers;
DROP POLICY IF EXISTS "New users can insert client profile" ON clients;

-- Create new permissive policies that allow both user inserts and trigger inserts
-- These policies allow inserts when:
-- 1. The user is inserting their own profile (auth.uid() = user_id), OR
-- 2. The insert is being done by the authenticated service (for trigger context)

CREATE POLICY "Allow driver profile creation"
  ON drivers FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    auth.jwt() IS NOT NULL  -- Allows trigger to insert during signup
  );

CREATE POLICY "Allow client profile creation"
  ON clients FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    auth.jwt() IS NOT NULL  -- Allows trigger to insert during signup
  );
