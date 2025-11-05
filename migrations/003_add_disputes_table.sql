-- ============================================================================
-- DISPUTES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  reported_by_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reported_by_role TEXT CHECK (reported_by_role IN ('driver', 'client')) NOT NULL,
  dispute_type TEXT CHECK (dispute_type IN ('payment', 'service_quality', 'cancellation', 'other')) NOT NULL,
  description TEXT NOT NULL,
  status TEXT CHECK (status IN ('open', 'investigating', 'resolved', 'closed')) DEFAULT 'open',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  admin_notes TEXT,
  resolution TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for disputes
CREATE INDEX IF NOT EXISTS idx_disputes_booking_id ON disputes(booking_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_reported_by ON disputes(reported_by_user_id);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON disputes(created_at DESC);

-- Enable RLS for disputes
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

-- Disputes Policies
CREATE POLICY "Users can view their own disputes"
  ON disputes FOR SELECT
  USING (
    reported_by_user_id = auth.uid()
  );

CREATE POLICY "Users can create disputes for their bookings"
  ON disputes FOR INSERT
  WITH CHECK (
    reported_by_user_id = auth.uid() AND
    booking_id IN (
      SELECT id FROM bookings WHERE
        client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
        OR driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Admins can manage all disputes"
  ON disputes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

-- Add realtime for disputes
ALTER PUBLICATION supabase_realtime ADD TABLE disputes;
