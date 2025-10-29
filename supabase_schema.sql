-- ============================================================================
-- DRIVERS ON DEMAND - SUPABASE SCHEMA
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS for geolocation
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Drivers Table
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  license_no TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  verification_payment_ref TEXT,
  paystack_subaccount TEXT,
  hourly_rate NUMERIC NOT NULL,
  online_status TEXT CHECK (online_status IN ('online', 'offline')) DEFAULT 'offline',
  current_location JSONB,
  rating NUMERIC DEFAULT 5.0 CHECK (rating >= 0 AND rating <= 5),
  total_trips INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients Table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE NOT NULL,
  start_location TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_coordinates JSONB NOT NULL,
  destination_coordinates JSONB NOT NULL,
  distance_km NUMERIC NOT NULL,
  duration_hr NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL,
  payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')) DEFAULT 'pending',
  booking_status TEXT CHECK (booking_status IN ('pending', 'accepted', 'ongoing', 'completed', 'cancelled')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  paystack_ref TEXT NOT NULL UNIQUE,
  amount NUMERIC NOT NULL,
  driver_share NUMERIC DEFAULT 0,
  platform_share NUMERIC DEFAULT 0,
  split_code TEXT,
  settled BOOLEAN DEFAULT FALSE,
  transaction_type TEXT CHECK (transaction_type IN ('booking', 'verification')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT CHECK (role IN ('super_admin', 'moderator')) DEFAULT 'moderator',
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ratings Table
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(booking_id) -- One rating per booking
);

-- ============================================================================
-- MESSAGES TABLE (In-App Chat)
-- ============================================================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('driver', 'client')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_drivers_online_status ON drivers(online_status);
CREATE INDEX IF NOT EXISTS idx_drivers_verified ON drivers(verified);

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);

CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_driver_id ON bookings(driver_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);

CREATE INDEX IF NOT EXISTS idx_transactions_booking_id ON transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_transactions_driver_id ON transactions(driver_id);
CREATE INDEX IF NOT EXISTS idx_transactions_paystack_ref ON transactions(paystack_ref);

CREATE INDEX IF NOT EXISTS idx_ratings_driver_id ON ratings(driver_id);
CREATE INDEX IF NOT EXISTS idx_ratings_client_id ON ratings(client_id);
CREATE INDEX IF NOT EXISTS idx_ratings_booking_id ON ratings(booking_id);

CREATE INDEX IF NOT EXISTS idx_messages_booking_id ON messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drivers Policies
CREATE POLICY "Drivers can view their own profile"
  ON drivers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Drivers can update their own profile"
  ON drivers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view online verified drivers"
  ON drivers FOR SELECT
  USING (online_status = 'online' AND verified = TRUE);

CREATE POLICY "New users can insert driver profile"
  ON drivers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Clients Policies
CREATE POLICY "Clients can view their own profile"
  ON clients FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Clients can update their own profile"
  ON clients FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "New users can insert client profile"
  ON clients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Bookings Policies
CREATE POLICY "Clients can view their own bookings"
  ON bookings FOR SELECT
  USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

CREATE POLICY "Drivers can view their bookings"
  ON bookings FOR SELECT
  USING (
    driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
  );

CREATE POLICY "Clients can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

CREATE POLICY "Drivers can update their bookings"
  ON bookings FOR UPDATE
  USING (
    driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
  );

-- Transactions Policies
CREATE POLICY "Drivers can view their transactions"
  ON transactions FOR SELECT
  USING (
    driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
  );

CREATE POLICY "Clients can view booking transactions"
  ON transactions FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM bookings WHERE client_id IN (
        SELECT id FROM clients WHERE user_id = auth.uid()
      )
    )
  );

-- Admin Policies (Super admins can see everything)
CREATE POLICY "Admins can view all drivers"
  ON drivers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "Admins can view all clients"
  ON clients FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "Admins can view all bookings"
  ON bookings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "Admins can view all transactions"
  ON transactions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

-- Ratings Policies
CREATE POLICY "Anyone can view ratings"
  ON ratings FOR SELECT
  USING (TRUE);

CREATE POLICY "Clients can create ratings for their bookings"
  ON ratings FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM clients WHERE id = client_id)
  );

CREATE POLICY "Clients can update their own ratings"
  ON ratings FOR UPDATE
  USING (
    auth.uid() IN (SELECT user_id FROM clients WHERE id = client_id)
  );

CREATE POLICY "Admins can view all ratings"
  ON ratings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

-- Messages Policies
CREATE POLICY "Participants can view messages in their bookings"
  ON messages FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM bookings WHERE
        client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
        OR driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Participants can send messages in their bookings"
  ON messages FOR INSERT
  WITH CHECK (
    booking_id IN (
      SELECT id FROM bookings WHERE
        client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
        OR driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
    )
    AND sender_id = auth.uid()
  );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to create driver/client profile after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check user role from metadata
  IF NEW.raw_user_meta_data->>'role' = 'driver' THEN
    INSERT INTO public.drivers (user_id, full_name, email, phone, hourly_rate)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'full_name',
      NEW.email,
      NEW.raw_user_meta_data->>'phone',
      2000 -- Default hourly rate
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
    INSERT INTO public.admin_users (user_id, name, email)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'full_name',
      NEW.email
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- REALTIME PUBLICATION
-- ============================================================================

-- Enable realtime for tables that need live updates
ALTER PUBLICATION supabase_realtime ADD TABLE drivers;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE ratings;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ============================================================================
-- SEED DATA (Optional - for testing)
-- ============================================================================

-- You can add sample data here for testing
-- Example:
-- INSERT INTO drivers (user_id, full_name, email, phone, license_no, verified, hourly_rate, online_status)
-- VALUES (uuid_generate_v4(), 'John Doe', 'john@example.com', '08012345678', 'ABC123', true, 3000, 'online');
