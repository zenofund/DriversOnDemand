-- ============================================================================
-- COMPLETE FIX FOR ADMIN ACCOUNT CREATION ERROR
-- ============================================================================
-- This SQL fixes the "Database error saving new user" issue and prevents
-- race conditions by:
-- 1. Adding is_first_admin column with unique constraint
-- 2. Adding proper RLS policies for admin_users table
-- 3. Updating the trigger to properly set admin role and status
-- ============================================================================

-- Step 1: Add is_first_admin column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='admin_users' AND column_name='is_first_admin'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN is_first_admin BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Step 2: Create unique partial index to prevent race conditions
-- This ensures only ONE admin can have is_first_admin=true
DROP INDEX IF EXISTS idx_admin_users_first_admin;
CREATE UNIQUE INDEX idx_admin_users_first_admin 
  ON admin_users (is_first_admin) 
  WHERE is_first_admin = TRUE;

-- Step 3: Drop existing admin_users policies
DROP POLICY IF EXISTS "Allow admin account creation during setup" ON admin_users;
DROP POLICY IF EXISTS "Allow trigger to insert admin users" ON admin_users;
DROP POLICY IF EXISTS "Admins can view their own profile" ON admin_users;
DROP POLICY IF EXISTS "Super admins can view all admins" ON admin_users;

-- Step 4: Add proper RLS policies
CREATE POLICY "Allow trigger to insert admin users"
  ON admin_users FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
  );

CREATE POLICY "Admins can view their own profile"
  ON admin_users FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all admins"
  ON admin_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND role = 'super_admin' AND is_active = TRUE
    )
  );

-- Step 5: Update the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  is_first_admin BOOLEAN;
BEGIN
  -- Check user role from metadata
  IF NEW.raw_user_meta_data->>'role' = 'driver' THEN
    INSERT INTO public.drivers (user_id, full_name, email, phone, hourly_rate)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'full_name',
      NEW.email,
      NEW.raw_user_meta_data->>'phone',
      2000
    );
  ELSIF NEW.raw_user_meta_data->>'role' = 'client' THEN
    INSERT INTO public.clients (user_id, full_name, email, phone)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'full_name',
      NEW.email,
      NEW.raw_user_meta_data->>'phone'
    );
  ELSIF NEW.raw_user_meta_data->>'role' = 'admin' THEN
    -- Check if this is the first admin (atomic check due to unique index)
    SELECT NOT EXISTS (SELECT 1 FROM public.admin_users LIMIT 1) INTO is_first_admin;
    
    -- Insert admin user - the unique index will prevent race conditions
    -- If two requests try to create is_first_admin=true, the second will fail
    INSERT INTO public.admin_users (user_id, name, email, role, is_active, is_first_admin)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'name',
      NEW.email,
      'super_admin',
      true,
      is_first_admin
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
