-- ============================================================================
-- Email Tracking Tables for Resend Integration
-- Migration: 008_add_email_tracking.sql
-- Description: Add tables to track sent emails and webhook events from Resend
-- ============================================================================

-- Email delivery status enum
CREATE TYPE email_status AS ENUM ('queued', 'sent', 'delivered', 'bounced', 'complained', 'failed');

-- Email type enum for categorization
CREATE TYPE email_type AS ENUM (
  'nin_verification_approved',
  'nin_verification_rejected', 
  'nin_verification_locked',
  'booking_confirmation',
  'booking_driver_assigned',
  'booking_trip_started',
  'booking_trip_completed',
  'payment_receipt',
  'payment_payout',
  'admin_alert'
);

-- ============================================================================
-- EMAIL_LOGS TABLE
-- Purpose: Track all emails sent through Resend with metadata
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Resend data
  resend_email_id varchar(255) UNIQUE, -- Resend's unique email ID
  
  -- Recipient information
  to_email varchar(255) NOT NULL,
  to_name varchar(255),
  
  -- Email content metadata
  email_type email_type NOT NULL,
  subject varchar(500) NOT NULL,
  template_data jsonb, -- Store dynamic template variables
  
  -- Delivery tracking
  status email_status NOT NULL DEFAULT 'queued',
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  bounced_at timestamptz,
  complained_at timestamptz,
  
  -- Error tracking
  error_message text,
  retry_count integer DEFAULT 0,
  
  -- Context linking
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- EMAIL_EVENTS TABLE
-- Purpose: Store webhook events from Resend for audit trail and analytics
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to email log
  email_log_id uuid REFERENCES email_logs(id) ON DELETE CASCADE,
  resend_email_id varchar(255) NOT NULL, -- Resend's email ID from webhook
  
  -- Event data
  event_type varchar(50) NOT NULL, -- email.sent, email.delivered, email.opened, etc.
  event_data jsonb, -- Full webhook payload
  
  -- Timestamp
  occurred_at timestamptz NOT NULL,
  received_at timestamptz DEFAULT now(),
  
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Email logs indexes
CREATE INDEX idx_email_logs_resend_id ON email_logs(resend_email_id);
CREATE INDEX idx_email_logs_to_email ON email_logs(to_email);
CREATE INDEX idx_email_logs_email_type ON email_logs(email_type);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX idx_email_logs_booking_id ON email_logs(booking_id);
CREATE INDEX idx_email_logs_created_at ON email_logs(created_at DESC);

-- Email events indexes
CREATE INDEX idx_email_events_email_log_id ON email_events(email_log_id);
CREATE INDEX idx_email_events_resend_id ON email_events(resend_email_id);
CREATE INDEX idx_email_events_event_type ON email_events(event_type);
CREATE INDEX idx_email_events_occurred_at ON email_events(occurred_at DESC);

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

-- Admin users can view all email logs
CREATE POLICY "Admins can view all email logs"
  ON email_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- Admin users can view all email events
CREATE POLICY "Admins can view all email events"
  ON email_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- Service role can insert/update email logs
CREATE POLICY "Service role can manage email logs"
  ON email_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Service role can insert email events
CREATE POLICY "Service role can manage email events"
  ON email_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_email_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_logs_updated_at
  BEFORE UPDATE ON email_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_email_logs_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE email_logs IS 'Tracks all emails sent through Resend with delivery status';
COMMENT ON TABLE email_events IS 'Stores webhook events from Resend for audit trail and analytics';
COMMENT ON COLUMN email_logs.resend_email_id IS 'Unique email ID from Resend API response';
COMMENT ON COLUMN email_logs.template_data IS 'Dynamic variables passed to email template';
COMMENT ON COLUMN email_events.event_data IS 'Full webhook payload from Resend';
