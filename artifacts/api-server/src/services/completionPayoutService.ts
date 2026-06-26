import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Get platform commission percentage
 */
async function getCommissionPercentage(): Promise<number> {
  try {
    const { data } = await supabase
      .from('platform_settings')
      .select('setting_value')
      .eq('setting_key', 'commission_percentage')
      .single();

    if (data && data.setting_value) {
      const commission = parseFloat(data.setting_value);
      if (commission >= 0 && commission <= 100) {
        return commission;
      }
    }

    // Default to 10% if not found or invalid
    return 10;
  } catch (error) {
    console.error('Error getting commission:', error);
    return 10;
  }
}

/**
 * Initiate Paystack transfer to driver
 */
async function initiateDriverTransfer(
  recipientCode: string,
  amount: number,
  reference: string,
  reason: string
): Promise<{ success: boolean; transfer_code?: string; error?: string }> {
  try {
    const response = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        reason,
        amount: Math.round(amount * 100), // Convert to kobo
        recipient: recipientCode,
        reference,
      }),
    });

    const data = await response.json();

    if (!data.status || !data.data) {
      console.error('Transfer initiation failed:', data.message);
      return {
        success: false,
        error: data.message || 'Transfer failed',
      };
    }

    return {
      success: true,
      transfer_code: data.data.transfer_code,
    };
  } catch (error) {
    console.error('Error initiating transfer:', error);
    return {
      success: false,
      error: 'Network error during transfer',
    };
  }
}

/**
 * Process payout when both driver and client confirm completion
 */
export async function processCompletionPayout(
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get booking with driver and transaction details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        driver:drivers(id, paystack_recipient_code, full_name)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return { success: false, error: 'Booking not found' };
    }

    // Verify both parties have confirmed
    if (!booking.driver_confirmed || !booking.client_confirmed) {
      return { success: false, error: 'Both parties must confirm completion' };
    }

    // Check if driver has recipient code
    if (!booking.driver?.paystack_recipient_code) {
      return { success: false, error: 'Driver has not set up bank account' };
    }

    // Get commission percentage
    const commissionPercentage = await getCommissionPercentage();

    // Atomically claim and mark transaction as processing (true atomic operation)
    // This prevents race condition by locking the row during update
    const { data: claimedTransactions, error: claimError } = await supabase
      .from('transactions')
      .update({ settled: true }) // Mark as settled immediately to claim it
      .eq('booking_id', bookingId)
      .eq('transaction_type', 'booking')
      .eq('settled', false) // Only update if currently unsettled
      .select();

    // If no rows updated, transaction was already settled by concurrent request
    if (claimError || !claimedTransactions || claimedTransactions.length === 0) {
      return { success: true }; // Already processed
    }

    const claimedTransaction = claimedTransactions[0];

    // Calculate split
    const totalAmount = parseFloat(claimedTransaction.amount.toString());
    const platformShare = (totalAmount * commissionPercentage) / 100;
    const driverShare = totalAmount - platformShare;

    // Generate idempotent transfer reference
    const transferReference = `completion_${bookingId.substring(0, 8)}_${claimedTransaction.id.substring(0, 8)}`;

    // Initiate transfer to driver
    const transfer = await initiateDriverTransfer(
      booking.driver.paystack_recipient_code,
      driverShare,
      transferReference,
      `Payment for completed trip #${bookingId.substring(0, 8)}`
    );

    if (!transfer.success) {
      // Transfer failed - revert the settled flag so it can be retried
      const { error: revertError } = await supabase
        .from('transactions')
        .update({ settled: false })
        .eq('id', claimedTransaction.id);

      if (revertError) {
        // Critical: flag is stuck as settled but no transfer occurred
        console.error(`CRITICAL: Failed to revert settled flag for transaction ${claimedTransaction.id}, booking ${bookingId}`);
        console.error('Manual intervention required:', revertError);
      }

      return {
        success: false,
        error: transfer.error || 'Failed to transfer funds to driver',
      };
    }

    // Update transaction with split details and transfer code
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        driver_share: driverShare,
        platform_share: platformShare,
        split_code: transfer.transfer_code,
      })
      .eq('id', claimedTransaction.id);

    if (updateError) {
      // Transfer succeeded but metadata update failed - requires reconciliation
      console.error(`WARNING: Transfer ${transfer.transfer_code} succeeded but metadata update failed for booking ${bookingId}`);
      console.error('Transfer details:', {
        booking_id: bookingId,
        transaction_id: claimedTransaction.id,
        transfer_code: transfer.transfer_code,
        driver_share: driverShare,
        platform_share: platformShare,
      });
      console.error('Database error:', updateError);
      // Don't return error - transfer succeeded, just metadata is missing
      // The settled=true flag is correct, manual reconciliation needed for split amounts
    }

    // Update booking status to completed
    const { error: bookingUpdateError } = await supabase
      .from('bookings')
      .update({
        booking_status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (bookingUpdateError) {
      console.error(`WARNING: Payout completed but booking status update failed for ${bookingId}`);
      console.error('Booking update error:', bookingUpdateError);
      // Transfer succeeded, just status update failed - not critical
    }

    return { success: true };
  } catch (error) {
    console.error('Error in processCompletionPayout:', error);
    return {
      success: false,
      error: 'Internal error processing payout',
    };
  }
}
