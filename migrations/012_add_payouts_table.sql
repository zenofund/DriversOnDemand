-- Migration: Add payouts table for driver payout tracking
-- This table tracks payout requests from drivers and their processing status

CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  transaction_ids UUID[] NOT NULL,
  status TEXT CHECK (status IN ('processing', 'completed', 'failed')) DEFAULT 'processing',
  paystack_transfer_code TEXT,
  paystack_transfer_id TEXT,
  paystack_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payouts_driver_id ON payouts(driver_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_created_at ON payouts(created_at DESC);

-- Enable Row Level Security
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- Policies for payouts
-- Drivers can view their own payouts
CREATE POLICY "Drivers can view their own payouts"
  ON payouts FOR SELECT
  USING (
    driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
  );

-- Admins can view all payouts
CREATE POLICY "Admins can view all payouts"
  ON payouts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

-- Service role can insert/update payouts (for backend operations)
CREATE POLICY "Service role can manage payouts"
  ON payouts FOR ALL
  USING (auth.role() = 'service_role');
