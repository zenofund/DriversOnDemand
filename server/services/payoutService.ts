import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface TransferRecipient {
  recipient_code: string;
  type: string;
  name: string;
  bank_code: string;
  account_number: string;
}

/**
 * Create or retrieve a Paystack transfer recipient for a driver
 */
async function createTransferRecipient(
  driverId: string,
  bankCode: string,
  accountNumber: string,
  accountName: string
): Promise<TransferRecipient | null> {
  try {
    const response = await fetch('https://api.paystack.co/transferrecipient', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'nuban',
        name: accountName,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: 'NGN',
        metadata: {
          driver_id: driverId,
        },
      }),
    });

    const data = await response.json();

    if (!data.status) {
      console.error('Paystack recipient creation failed:', data.message);
      return null;
    }

    return data.data;
  } catch (error) {
    console.error('Error creating transfer recipient:', error);
    return null;
  }
}

/**
 * Initiate a Paystack transfer
 */
async function initiateTransfer(
  recipientCode: string,
  amount: number,
  reference: string,
  reason: string
): Promise<{ transfer_code: string; transfer_id: string } | null> {
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
        amount: amount * 100, // Convert to kobo
        recipient: recipientCode,
        reference,
      }),
    });

    const data = await response.json();

    if (!data.status) {
      console.error('Paystack transfer initiation failed:', data.message);
      return null;
    }

    return {
      transfer_code: data.data.transfer_code,
      transfer_id: data.data.id.toString(),
    };
  } catch (error) {
    console.error('Error initiating transfer:', error);
    return null;
  }
}

/**
 * Get pending settlements for a driver
 */
export async function getDriverPendingSettlements(driverId: string) {
  try {
    // Get all completed transactions that haven't been settled yet
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('driver_id', driverId)
      .eq('settled', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const totalPending = transactions?.reduce((sum, t) => sum + parseFloat(t.driver_share.toString()), 0) || 0;

    return {
      transactions: transactions || [],
      total_pending: totalPending,
      transaction_count: transactions?.length || 0,
    };
  } catch (error) {
    console.error('Error fetching pending settlements:', error);
    return null;
  }
}

/**
 * Process payout for a driver
 */
export async function processDriverPayout(
  driverId: string,
  bankCode: string,
  accountNumber: string,
  accountName: string
): Promise<{ success: boolean; payout_id?: string; error?: string }> {
  try {
    // Get pending settlements
    const settlements = await getDriverPendingSettlements(driverId);

    if (!settlements || settlements.total_pending === 0) {
      return { success: false, error: 'No pending settlements' };
    }

    // Create transfer recipient
    const recipient = await createTransferRecipient(
      driverId,
      bankCode,
      accountNumber,
      accountName
    );

    if (!recipient) {
      return { success: false, error: 'Failed to create transfer recipient' };
    }

    // Create payout record
    const transactionIds = settlements.transactions.map((t: any) => t.id);
    const reference = `payout_${driverId}_${Date.now()}`;

    const { data: payout, error: payoutError } = await supabase
      .from('payouts')
      .insert([{
        driver_id: driverId,
        amount: settlements.total_pending,
        transaction_ids: transactionIds,
        status: 'processing',
      }])
      .select()
      .single();

    if (payoutError) throw payoutError;

    // Initiate Paystack transfer
    const transfer = await initiateTransfer(
      recipient.recipient_code,
      settlements.total_pending,
      reference,
      `Payout for ${settlements.transaction_count} completed trips`
    );

    if (!transfer) {
      // Mark payout as failed
      await supabase
        .from('payouts')
        .update({
          status: 'failed',
          failure_reason: 'Transfer initiation failed',
        })
        .eq('id', payout.id);

      return { success: false, error: 'Transfer initiation failed' };
    }

    // Update payout with transfer details
    await supabase
      .from('payouts')
      .update({
        paystack_transfer_code: transfer.transfer_code,
        paystack_transfer_id: transfer.transfer_id,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', payout.id);

    // Mark transactions as settled
    await supabase
      .from('transactions')
      .update({ settled: true })
      .in('id', transactionIds);

    return { success: true, payout_id: payout.id };
  } catch (error) {
    console.error('Error processing payout:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Get payout history for a driver
 */
export async function getDriverPayoutHistory(driverId: string) {
  try {
    const { data: payouts, error } = await supabase
      .from('payouts')
      .select('*')
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return payouts || [];
  } catch (error) {
    console.error('Error fetching payout history:', error);
    return [];
  }
}

/**
 * Scheduled job to process pending payouts automatically
 * Run this daily or weekly via a cron job
 */
export async function processAutomatedPayouts() {
  try {
    // Get all drivers with pending settlements (minimum threshold: ₦1000)
    const { data: drivers } = await supabase
      .from('drivers')
      .select('id, full_name, bank_code, account_number, account_name')
      .eq('verified', true);

    if (!drivers) return { processed: 0, failed: 0 };

    let processed = 0;
    let failed = 0;

    for (const driver of drivers) {
      // Skip if driver doesn't have bank details
      if (!driver.bank_code || !driver.account_number || !driver.account_name) {
        continue;
      }

      const settlements = await getDriverPendingSettlements(driver.id);

      // Only process if above minimum threshold
      if (settlements && settlements.total_pending >= 1000) {
        const result = await processDriverPayout(
          driver.id,
          driver.bank_code,
          driver.account_number,
          driver.account_name
        );

        if (result.success) {
          processed++;
        } else {
          failed++;
        }
      }
    }

    return { processed, failed };
  } catch (error) {
    console.error('Error in automated payout processing:', error);
    return { processed: 0, failed: 0 };
  }
}
