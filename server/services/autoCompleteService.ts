import { createClient } from '@supabase/supabase-js';
import { processCompletionPayout } from './completionPayoutService';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

export async function autoCompleteOverdueBookings() {
  try {
    const twelveHoursAgo = new Date(Date.now() - TWELVE_HOURS_MS).toISOString();

    const { data: overdueBookings, error } = await supabase
      .from('bookings')
      .select('id, driver_confirmed, client_confirmed, updated_at')
      .eq('driver_confirmed', true)
      .eq('client_confirmed', false)
      .lte('updated_at', twelveHoursAgo);

    if (error) {
      console.error('[AutoComplete] Error fetching overdue bookings:', error);
      return { success: false, error: error.message };
    }

    if (!overdueBookings || overdueBookings.length === 0) {
      console.log('[AutoComplete] No overdue bookings found');
      return { success: true, processed: 0 };
    }

    console.log(`[AutoComplete] Found ${overdueBookings.length} overdue bookings to process`);

    let processed = 0;
    let failed = 0;

    for (const booking of overdueBookings) {
      try {
        const { data: openDisputes } = await supabase
          .from('disputes')
          .select('id, status')
          .eq('booking_id', booking.id)
          .eq('status', 'open');

        if (openDisputes && openDisputes.length > 0) {
          console.log(`[AutoComplete] Skipping booking ${booking.id} - has open dispute`);
          continue;
        }

        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            client_confirmed: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', booking.id);

        if (updateError) {
          console.error(`[AutoComplete] Error updating booking ${booking.id}:`, updateError);
          failed++;
          continue;
        }

        const payoutResult = await processCompletionPayout(booking.id);
        if (payoutResult.success) {
          console.log(`[AutoComplete] Successfully processed booking ${booking.id}`);
          processed++;
        } else {
          console.error(`[AutoComplete] Payout failed for booking ${booking.id}:`, payoutResult.error);
          failed++;
        }
      } catch (err) {
        console.error(`[AutoComplete] Error processing booking ${booking.id}:`, err);
        failed++;
      }
    }

    console.log(`[AutoComplete] Completed: ${processed} successful, ${failed} failed`);
    return { success: true, processed, failed };
  } catch (error) {
    console.error('[AutoComplete] Fatal error in autoCompleteOverdueBookings:', error);
    return { success: false, error: String(error) };
  }
}

export function startAutoCompleteWorker() {
  const INTERVAL_MS = 15 * 60 * 1000;

  console.log('[AutoComplete] Starting worker - checking every 15 minutes');

  setInterval(async () => {
    await autoCompleteOverdueBookings();
  }, INTERVAL_MS);

  autoCompleteOverdueBookings();
}
