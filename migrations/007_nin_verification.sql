-- ============================================================================
-- NIN VERIFICATION SYSTEM
-- ============================================================================
-- Purpose: Add client NIN verification capability to prevent fraudulent activities
-- Provider: YouVerify API
-- Security: Hashed NIN storage, attempt limits, admin oversight

-- Step 1: Add NIN verification fields to clients table
ALTER TABLE clients 
  ADD COLUMN IF NOT EXISTS nin_verification_state TEXT 
    CHECK (nin_verification_state IN ('unverified', 'pending', 'verified', 'locked', 'pending_manual')) 
    DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS nin_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS nin_attempts_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nin_last_confidence NUMERIC,
  ADD COLUMN IF NOT EXISTS nin_reference_id TEXT;

-- Create index for verification state queries
CREATE INDEX IF NOT EXISTS idx_clients_verification_state ON clients(nin_verification_state);
CREATE INDEX IF NOT EXISTS idx_clients_last_attempt ON clients(last_attempt_at);

-- Step 2: Create NIN verifications table (main verification records)
CREATE TABLE IF NOT EXISTS nin_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  nin_hash TEXT NOT NULL,
  selfie_storage_path TEXT,
  status TEXT CHECK (status IN ('success', 'failed', 'pending', 'rejected', 'approved')) NOT NULL,
  confidence_score NUMERIC,
  request_metadata JSONB,
  response_metadata JSONB,
  failure_reason TEXT,
  reviewer_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for nin_verifications
CREATE INDEX IF NOT EXISTS idx_nin_verifications_client ON nin_verifications(client_id);
CREATE INDEX IF NOT EXISTS idx_nin_verifications_status ON nin_verifications(status);
CREATE INDEX IF NOT EXISTS idx_nin_verifications_created ON nin_verifications(created_at DESC);

-- Step 3: Create NIN verification events log (audit trail)
CREATE TABLE IF NOT EXISTS nin_verification_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  verification_id UUID REFERENCES nin_verifications(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT CHECK (event_type IN ('attempt', 'success', 'failure', 'locked', 'admin_override', 'admin_approve', 'admin_reject')) NOT NULL,
  message TEXT,
  payload_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for events
CREATE INDEX IF NOT EXISTS idx_nin_events_verification ON nin_verification_events(verification_id);
CREATE INDEX IF NOT EXISTS idx_nin_events_type ON nin_verification_events(event_type);
CREATE INDEX IF NOT EXISTS idx_nin_events_created ON nin_verification_events(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE nin_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE nin_verification_events ENABLE ROW LEVEL SECURITY;

-- Clients can only view their own verification records
CREATE POLICY "Clients can view own verifications"
  ON nin_verifications FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  );

-- Admins can view all verification records
CREATE POLICY "Admins can view all verifications"
  ON nin_verifications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

-- Clients can view their own verification events
CREATE POLICY "Clients can view own events"
  ON nin_verification_events FOR SELECT
  USING (
    verification_id IN (
      SELECT id FROM nin_verifications WHERE client_id IN (
        SELECT id FROM clients WHERE user_id = auth.uid()
      )
    )
  );

-- Admins can view all verification events
CREATE POLICY "Admins can view all events"
  ON nin_verification_events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if client can attempt verification
CREATE OR REPLACE FUNCTION can_attempt_nin_verification(p_client_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_state TEXT;
  v_attempts INTEGER;
  v_last_attempt TIMESTAMPTZ;
BEGIN
  SELECT nin_verification_state, nin_attempts_count, last_attempt_at
  INTO v_state, v_attempts, v_last_attempt
  FROM clients
  WHERE id = p_client_id;
  
  -- Can't attempt if locked or already verified
  IF v_state IN ('locked', 'verified') THEN
    RETURN FALSE;
  END IF;
  
  -- Check if 24 hours have passed since last attempt (reset counter)
  IF v_last_attempt IS NOT NULL AND v_last_attempt < NOW() - INTERVAL '24 hours' THEN
    -- Reset attempt counter
    UPDATE clients 
    SET nin_attempts_count = 0 
    WHERE id = p_client_id;
    RETURN TRUE;
  END IF;
  
  -- Check if under 3 attempts
  IF v_attempts >= 3 THEN
    -- Lock the account
    UPDATE clients 
    SET nin_verification_state = 'locked' 
    WHERE id = p_client_id;
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to hash NIN (SHA-256)
CREATE OR REPLACE FUNCTION hash_nin(p_nin TEXT, p_salt TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(digest(p_nin || p_salt, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;
