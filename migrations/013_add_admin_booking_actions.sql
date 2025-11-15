-- Create admin_booking_actions table for audit trail
CREATE TABLE IF NOT EXISTS admin_booking_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  admin_user_id UUID NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('status_change', 'force_complete', 'force_cancel', 'trigger_payout', 'process_refund', 'override_confirmation')),
  previous_status TEXT,
  new_status TEXT,
  reason TEXT NOT NULL,
  dispute_id UUID REFERENCES disputes(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index on booking_id for quick lookups
CREATE INDEX IF NOT EXISTS idx_admin_booking_actions_booking_id ON admin_booking_actions(booking_id);

-- Add index on admin_user_id for auditing
CREATE INDEX IF NOT EXISTS idx_admin_booking_actions_admin_user_id ON admin_booking_actions(admin_user_id);

-- Add index on dispute_id for linking dispute resolutions
CREATE INDEX IF NOT EXISTS idx_admin_booking_actions_dispute_id ON admin_booking_actions(dispute_id);

-- Add index on created_at for timeline queries
CREATE INDEX IF NOT EXISTS idx_admin_booking_actions_created_at ON admin_booking_actions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE admin_booking_actions ENABLE ROW LEVEL SECURITY;

-- Admin users can view all booking actions
CREATE POLICY "Admins can view all booking actions"
  ON admin_booking_actions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- Admin users can insert booking actions
CREATE POLICY "Admins can insert booking actions"
  ON admin_booking_actions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- Add comment for documentation
COMMENT ON TABLE admin_booking_actions IS 'Audit trail for all admin actions on bookings, including status changes, forced completions, cancellations, and refunds';
