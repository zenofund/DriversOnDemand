-- Migration 014: Admin Payout Jobs Outbox Table
-- Creates outbox pattern for async processing of payouts/refunds with idempotency

-- Outbox table for queueing payout and refund operations
CREATE TABLE IF NOT EXISTS admin_payout_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  admin_action_id UUID REFERENCES admin_booking_actions(id) ON DELETE SET NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('payout', 'refund')),
  idempotency_key TEXT NOT NULL UNIQUE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  error_message TEXT,
  last_attempt_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices for performance
CREATE INDEX idx_admin_payout_jobs_status ON admin_payout_jobs(status);
CREATE INDEX idx_admin_payout_jobs_booking ON admin_payout_jobs(booking_id);
CREATE INDEX idx_admin_payout_jobs_idempotency ON admin_payout_jobs(idempotency_key);
CREATE INDEX idx_admin_payout_jobs_created_at ON admin_payout_jobs(created_at);
CREATE INDEX idx_admin_payout_jobs_pending ON admin_payout_jobs(status, created_at) WHERE status = 'pending';

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_admin_payout_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_admin_payout_jobs_updated_at
  BEFORE UPDATE ON admin_payout_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_payout_jobs_updated_at();

-- RLS Policies: Only admins can access payout jobs
ALTER TABLE admin_payout_jobs ENABLE ROW LEVEL SECURITY;

-- Admins can view all payout jobs
CREATE POLICY "Admins can view all payout jobs"
  ON admin_payout_jobs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- System can insert and update payout jobs (service role)
CREATE POLICY "System can manage payout jobs"
  ON admin_payout_jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comment for documentation
COMMENT ON TABLE admin_payout_jobs IS 'Outbox table for async processing of admin-triggered payouts and refunds with idempotency guarantees';
COMMENT ON COLUMN admin_payout_jobs.idempotency_key IS 'Unique key to prevent duplicate job execution (format: {job_type}_{booking_id}_{timestamp})';
COMMENT ON COLUMN admin_payout_jobs.payload IS 'JSONB payload containing job-specific data (e.g., amount, recipient, reason)';
COMMENT ON COLUMN admin_payout_jobs.attempts IS 'Number of processing attempts made';
COMMENT ON COLUMN admin_payout_jobs.max_attempts IS 'Maximum retry attempts before marking as failed';
