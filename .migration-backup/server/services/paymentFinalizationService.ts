import { createClient } from '@supabase/supabase-js';
import { sendNotification, NotificationTemplates } from './notificationService';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface PaymentFinalizationResult {
  success: boolean;
  booking_id?: string;
  already_processed?: boolean;
  error?: string;
}

/**
 * Finalizes a booking payment by creating the actual booking from pending_booking
 * This function is idempotent and can be safely called by both webhook and callback
 * 
 * @param reference - Paystack payment reference
 * @param metadata - Payment metadata containing pending_booking_id and driver_id
 * @param amount - Payment amount in main currency units (not kobo)
 * @returns Result object with success status and booking_id or error
 */
export async function finalizeBookingFromPayment(
  reference: string,
  metadata: any,
  amount: number
): Promise<PaymentFinalizationResult> {
  try {
    const pending_booking_id = metadata?.pending_booking_id;
    
    if (!pending_booking_id) {
      console.error('No pending_booking_id in payment metadata');
      return {
        success: false,
        error: 'Invalid payment metadata - missing pending_booking_id',
      };
    }

    console.log('Finalizing payment for pending_booking:', pending_booking_id, 'reference:', reference);

    // CRITICAL: Check if transaction already exists FIRST (idempotency check)
    // This prevents race conditions with concurrent requests
    const { data: existingTransaction } = await supabase
      .from('transactions')
      .select('id, booking_id')
      .eq('paystack_ref', reference)
      .maybeSingle();

    if (existingTransaction) {
      console.log('Payment already processed for reference:', reference, 'booking:', existingTransaction.booking_id);
      return {
        success: true,
        already_processed: true,
        booking_id: existingTransaction.booking_id,
      };
    }

    // Get pending booking details
    const { data: pendingBooking, error: fetchError } = await supabase
      .from('pending_bookings')
      .select('*')
      .eq('id', pending_booking_id)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching pending booking:', fetchError);
      return {
        success: false,
        error: 'Failed to fetch pending booking',
      };
    }

    if (!pendingBooking) {
      console.error('Pending booking not found or already processed:', pending_booking_id);
      // Check if booking was already processed
      const { data: checkTx } = await supabase
        .from('transactions')
        .select('id, booking_id')
        .eq('paystack_ref', reference)
        .maybeSingle();
      
      if (checkTx) {
        return {
          success: true,
          already_processed: true,
          booking_id: checkTx.booking_id,
        };
      }

      return {
        success: false,
        error: 'Pending booking not found or expired',
      };
    }

    // Check if pending booking has expired
    if (new Date(pendingBooking.expires_at) < new Date()) {
      console.error('Pending booking expired:', pending_booking_id);
      // Clean up expired pending booking
      await supabase.from('pending_bookings').delete().eq('id', pending_booking_id);
      return {
        success: false,
        error: 'Booking session expired',
      };
    }

    // Double-check transaction doesn't exist (race condition guard)
    const { data: doubleCheckTx } = await supabase
      .from('transactions')
      .select('id, booking_id')
      .eq('paystack_ref', reference)
      .maybeSingle();

    if (doubleCheckTx) {
      console.log('Transaction created by concurrent request:', reference);
      return {
        success: true,
        already_processed: true,
        booking_id: doubleCheckTx.booking_id,
      };
    }

    // Create the actual booking from pending booking data
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert([{
        client_id: pendingBooking.client_id,
        driver_id: pendingBooking.driver_id,
        start_location: pendingBooking.start_location,
        destination: pendingBooking.destination,
        start_coordinates: pendingBooking.start_coordinates,
        destination_coordinates: pendingBooking.destination_coordinates,
        distance_km: pendingBooking.distance_km,
        duration_hr: pendingBooking.duration_hr,
        total_cost: pendingBooking.total_cost,
        payment_status: 'paid',
        booking_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (bookingError) {
      console.error('Failed to create booking from pending booking:', bookingError);
      return {
        success: false,
        error: 'Failed to create booking',
      };
    }

    console.log('Booking created successfully:', booking.id);

    // Send notification to driver about new booking
    try {
      // Fetch driver and client details for notifications
      const { data: driver } = await supabase
        .from('drivers')
        .select('user_id, full_name')
        .eq('id', booking.driver_id)
        .single();
      
      const { data: client } = await supabase
        .from('clients')
        .select('user_id, full_name')
        .eq('id', booking.client_id)
        .single();
      
      if (driver?.user_id && client?.full_name) {
        const template = NotificationTemplates.bookingCreated(
          driver.full_name || 'Driver',
          client.full_name || 'Client'
        );
        
        await sendNotification({
          userId: driver.user_id,
          type: 'booking_created',
          title: template.driver.title,
          message: template.driver.message,
          data: { 
            booking_id: booking.id,
            client_name: client.full_name,
          },
        });
      }
    } catch (notificationError) {
      console.error('Failed to send new booking notification:', notificationError);
      // Don't fail the booking creation if notification fails
    }

    // Create transaction record
    // The unique constraint on paystack_ref will prevent duplicates
    const { error: txError } = await supabase
      .from('transactions')
      .insert([{
        booking_id: booking.id,
        driver_id: metadata.driver_id,
        paystack_ref: reference,
        amount: amount,
        driver_share: 0, // Will be calculated upon completion
        platform_share: 0, // Will be calculated upon completion
        transaction_type: 'booking',
        settled: false,
        created_at: new Date().toISOString(),
      }]);

    if (txError) {
      // If transaction insert fails due to duplicate key, another request won the race
      if (txError.code === '23505') {
        console.log('Transaction already created by concurrent request, cleaning up duplicate booking');
        // Delete the duplicate booking we just created
        await supabase.from('bookings').delete().eq('id', booking.id);
        
        // Return the existing transaction's booking
        const { data: existingTx } = await supabase
          .from('transactions')
          .select('booking_id')
          .eq('paystack_ref', reference)
          .single();
        
        return {
          success: true,
          already_processed: true,
          booking_id: existingTx?.booking_id,
        };
      }
      
      console.error('Failed to create transaction record:', txError);
      return {
        success: false,
        error: 'Failed to create transaction record',
      };
    }

    // Clean up pending booking
    const { error: deleteError } = await supabase
      .from('pending_bookings')
      .delete()
      .eq('id', pending_booking_id);

    if (deleteError) {
      console.error('Failed to delete pending booking:', deleteError);
      // Don't fail - booking is created, cleanup is just housekeeping
    }

    console.log('Payment finalized successfully for booking:', booking.id);

    return {
      success: true,
      booking_id: booking.id,
    };
  } catch (error) {
    console.error('Error in finalizeBookingFromPayment:', error);
    return {
      success: false,
      error: 'Unexpected error during payment finalization',
    };
  }
}
