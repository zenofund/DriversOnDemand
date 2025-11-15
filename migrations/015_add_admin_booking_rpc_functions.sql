-- Migration 015: Admin Booking RPC Functions
-- Creates atomic RPC functions for admin booking operations with audit trails

-- ============================================================================
-- FUNCTION: admin_update_booking_status
-- Atomically updates booking status and creates audit trail
-- ============================================================================
CREATE OR REPLACE FUNCTION admin_update_booking_status(
  p_booking_id UUID,
  p_admin_id UUID,
  p_new_status TEXT,
  p_reason TEXT,
  p_dispute_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_status TEXT;
  v_admin_action_id UUID;
  v_result JSON;
BEGIN
  -- Validate booking exists and get current status
  SELECT booking_status INTO v_old_status
  FROM bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Booking not found'
    );
  END IF;

  -- Update booking status
  UPDATE bookings
  SET 
    booking_status = p_new_status,
    updated_at = now()
  WHERE id = p_booking_id;

  -- Create audit trail
  INSERT INTO admin_booking_actions (
    booking_id,
    admin_id,
    action_type,
    old_status,
    new_status,
    reason,
    dispute_id
  ) VALUES (
    p_booking_id,
    p_admin_id,
    'status_change',
    v_old_status,
    p_new_status,
    p_reason,
    p_dispute_id
  ) RETURNING id INTO v_admin_action_id;

  -- Return success with details
  RETURN json_build_object(
    'success', true,
    'old_status', v_old_status,
    'new_status', p_new_status,
    'admin_action_id', v_admin_action_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- ============================================================================
-- FUNCTION: admin_force_complete_booking
-- Atomically marks booking as completed and creates audit trail
-- Booking completion triggers payout processing via outbox
-- ============================================================================
CREATE OR REPLACE FUNCTION admin_force_complete_booking(
  p_booking_id UUID,
  p_admin_id UUID,
  p_reason TEXT,
  p_dispute_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_status TEXT;
  v_admin_action_id UUID;
  v_result JSON;
BEGIN
  -- Validate booking exists and get current status
  SELECT booking_status INTO v_old_status
  FROM bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Booking not found'
    );
  END IF;

  -- Prevent double completion
  IF v_old_status = 'completed' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Booking is already completed'
    );
  END IF;

  -- Update booking to completed status
  UPDATE bookings
  SET 
    booking_status = 'completed',
    driver_confirmed = true,
    client_confirmed = true,
    driver_confirmed_at = now(),
    client_confirmed_at = now(),
    updated_at = now()
  WHERE id = p_booking_id;

  -- Create audit trail
  INSERT INTO admin_booking_actions (
    booking_id,
    admin_id,
    action_type,
    old_status,
    new_status,
    reason,
    dispute_id,
    metadata
  ) VALUES (
    p_booking_id,
    p_admin_id,
    'force_complete',
    v_old_status,
    'completed',
    p_reason,
    p_dispute_id,
    json_build_object(
      'override_confirmations', true,
      'trigger_payout', true
    )
  ) RETURNING id INTO v_admin_action_id;

  -- Return success with details
  RETURN json_build_object(
    'success', true,
    'old_status', v_old_status,
    'new_status', 'completed',
    'admin_action_id', v_admin_action_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- ============================================================================
-- FUNCTION: admin_force_cancel_booking
-- Atomically cancels booking and creates audit trail
-- Cancellation may trigger refund processing via outbox
-- ============================================================================
CREATE OR REPLACE FUNCTION admin_force_cancel_booking(
  p_booking_id UUID,
  p_admin_id UUID,
  p_reason TEXT,
  p_dispute_id UUID DEFAULT NULL,
  p_process_refund BOOLEAN DEFAULT false
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_status TEXT;
  v_admin_action_id UUID;
  v_result JSON;
BEGIN
  -- Validate booking exists and get current status
  SELECT booking_status INTO v_old_status
  FROM bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Booking not found'
    );
  END IF;

  -- Prevent double cancellation
  IF v_old_status = 'cancelled' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Booking is already cancelled'
    );
  END IF;

  -- Update booking to cancelled status
  UPDATE bookings
  SET 
    booking_status = 'cancelled',
    updated_at = now()
  WHERE id = p_booking_id;

  -- Create audit trail
  INSERT INTO admin_booking_actions (
    booking_id,
    admin_id,
    action_type,
    old_status,
    new_status,
    reason,
    dispute_id,
    metadata
  ) VALUES (
    p_booking_id,
    p_admin_id,
    'force_cancel',
    v_old_status,
    'cancelled',
    p_reason,
    p_dispute_id,
    json_build_object(
      'process_refund', p_process_refund
    )
  ) RETURNING id INTO v_admin_action_id;

  -- Return success with details
  RETURN json_build_object(
    'success', true,
    'old_status', v_old_status,
    'new_status', 'cancelled',
    'admin_action_id', v_admin_action_id,
    'process_refund', p_process_refund
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permissions to authenticated users
-- (Authorization is checked in the Express endpoints)
GRANT EXECUTE ON FUNCTION admin_update_booking_status TO authenticated;
GRANT EXECUTE ON FUNCTION admin_force_complete_booking TO authenticated;
GRANT EXECUTE ON FUNCTION admin_force_cancel_booking TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION admin_update_booking_status IS 'Atomically updates booking status and creates audit trail in a single transaction';
COMMENT ON FUNCTION admin_force_complete_booking IS 'Admin override to mark booking as completed with automatic confirmation flags';
COMMENT ON FUNCTION admin_force_cancel_booking IS 'Admin override to cancel booking with optional refund trigger';
