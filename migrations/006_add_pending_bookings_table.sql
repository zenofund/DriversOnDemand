-- ============================================================================
-- PENDING BOOKINGS TABLE - FOR PAYMENT FLOW FIX
-- ============================================================================
-- This table temporarily stores booking data before payment is confirmed.
-- Bookings are only created in the main bookings table after successful payment.
-- ============================================================================

-- Create pending_bookings table
CREATE TABLE IF NOT EXISTS pending_bookings (
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
  payment_reference TEXT, -- Will be set when payment is initialized
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on expires_at for cleanup
CREATE INDEX IF NOT EXISTS idx_pending_bookings_expires_at ON pending_bookings(expires_at);

-- Create index on payment_reference for webhook lookups
CREATE INDEX IF NOT EXISTS idx_pending_bookings_payment_ref ON pending_bookings(payment_reference);

-- Enable RLS on pending_bookings
ALTER TABLE pending_bookings ENABLE ROW LEVEL SECURITY;

-- Policy: Clients can only see their own pending bookings
CREATE POLICY "Clients can view own pending bookings"
  ON pending_bookings FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM clients WHERE id = client_id
    )
  );

-- Policy: Clients can create pending bookings
CREATE POLICY "Clients can create pending bookings"
  ON pending_bookings FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM clients WHERE id = client_id
    )
  );

-- Cleanup function: Auto-delete expired pending bookings
CREATE OR REPLACE FUNCTION cleanup_expired_pending_bookings()
RETURNS void AS $$
BEGIN
  DELETE FROM pending_bookings
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: In production, set up a pg_cron job to run this periodically
-- For now, it can be called manually or via application logic
