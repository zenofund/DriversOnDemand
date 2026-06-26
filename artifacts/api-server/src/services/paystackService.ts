import { createClient } from '@supabase/supabase-js';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

interface PaystackVerificationResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: 'success' | 'failed' | 'abandoned';
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: {
      type?: 'verification' | 'booking';
      driver_id?: string;
      client_id?: string;
      [key: string]: any;
    };
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
    };
    customer: {
      id: number;
      first_name: string | null;
      last_name: string | null;
      email: string;
      customer_code: string;
      phone: string | null;
      metadata: any;
      risk_action: string;
    };
  };
}

interface VerificationResult {
  success: boolean;
  verified?: boolean;
  error?: string;
  message?: string;
  data?: {
    reference: string;
    amount: number;
    status: string;
    paid_at: string;
  };
}

export async function verifyDriverVerificationPayment(
  reference: string,
  driverId: string
): Promise<VerificationResult> {
  try {
    if (!PAYSTACK_SECRET) {
      return {
        success: false,
        error: 'Paystack secret key not configured'
      };
    }

    // Call Paystack verification API
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: `Paystack API error: ${errorData.message || response.statusText}`
      };
    }

    const result: PaystackVerificationResponse = await response.json();

    // Validate response structure
    if (!result.status || !result.data) {
      return {
        success: false,
        error: 'Invalid response from Paystack'
      };
    }

    const { data } = result;

    // Check if payment was successful
    if (data.status !== 'success') {
      return {
        success: false,
        error: `Payment not successful: ${data.status}`,
        data: {
          reference: data.reference,
          amount: data.amount / 100,
          status: data.status,
          paid_at: data.paid_at
        }
      };
    }

    // Validate amount (₦5,000 = 500000 kobo)
    const expectedAmount = 500000;
    if (data.amount !== expectedAmount) {
      return {
        success: false,
        error: `Amount mismatch: expected ₦5,000, got ₦${data.amount / 100}`
      };
    }

    // Validate metadata
    if (data.metadata?.type !== 'verification') {
      return {
        success: false,
        error: 'Transaction is not a verification payment'
      };
    }

    if (data.metadata?.driver_id !== driverId) {
      return {
        success: false,
        error: 'Driver ID mismatch'
      };
    }

    // Check if driver is already verified with this reference (idempotency)
    const { data: existingDriver } = await supabaseAdmin
      .from('drivers')
      .select('id, verified, verification_payment_ref')
      .eq('id', driverId)
      .single();

    if (!existingDriver) {
      return {
        success: false,
        error: 'Driver not found'
      };
    }

    // If already verified with this reference, return success (idempotent)
    if (existingDriver.verified && existingDriver.verification_payment_ref === reference) {
      return {
        success: true,
        verified: true,
        message: 'Driver already verified with this payment',
        data: {
          reference: data.reference,
          amount: data.amount / 100,
          status: data.status,
          paid_at: data.paid_at
        }
      };
    }

    // Update driver verification status
    const { error: updateError } = await supabaseAdmin
      .from('drivers')
      .update({
        verified: true,
        verification_payment_ref: reference
      })
      .eq('id', driverId);

    if (updateError) {
      console.error('Failed to update driver verification:', updateError);
      return {
        success: false,
        error: 'Failed to update driver status'
      };
    }

    // Create transaction record if not exists
    const { data: existingTx } = await supabaseAdmin
      .from('transactions')
      .select('id')
      .eq('paystack_ref', reference)
      .single();

    if (!existingTx) {
      const verificationAmount = data.amount / 100;
      
      const { error: txError } = await supabaseAdmin
        .from('transactions')
        .insert([{
          driver_id: driverId,
          paystack_ref: reference,
          amount: verificationAmount,
          driver_share: 0,
          platform_share: verificationAmount,
          transaction_type: 'verification',
          settled: true,
          created_at: new Date().toISOString(),
        }]);

      if (txError) {
        console.error('Failed to create verification transaction:', txError);
        // Don't fail - driver is already verified
      }
    }

    return {
      success: true,
      verified: true,
      message: 'Driver verified successfully',
      data: {
        reference: data.reference,
        amount: data.amount / 100,
        status: data.status,
        paid_at: data.paid_at
      }
    };

  } catch (error) {
    console.error('Error verifying driver payment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
