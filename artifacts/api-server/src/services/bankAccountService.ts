import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface BankDetails {
  bank_code: string;
  account_number: string;
}

interface AccountVerificationResult {
  account_name: string;
  account_number: string;
  bank_code: string;
}

/**
 * Verify bank account with Paystack
 */
export async function verifyBankAccount(
  accountNumber: string,
  bankCode: string
): Promise<AccountVerificationResult | null> {
  try {
    const response = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      {
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET}`,
        },
      }
    );

    const data = await response.json();

    if (!data.status || !data.data) {
      console.error('Account verification failed:', data.message);
      return null;
    }

    return {
      account_name: data.data.account_name,
      account_number: data.data.account_number,
      bank_code: bankCode,
    };
  } catch (error) {
    console.error('Error verifying bank account:', error);
    return null;
  }
}

/**
 * Create Paystack transfer recipient
 */
export async function createTransferRecipient(
  driverId: string,
  accountName: string,
  accountNumber: string,
  bankCode: string
): Promise<string | null> {
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

    if (!data.status || !data.data) {
      console.error('Transfer recipient creation failed:', data.message);
      return null;
    }

    return data.data.recipient_code;
  } catch (error) {
    console.error('Error creating transfer recipient:', error);
    return null;
  }
}

/**
 * Update driver bank details and create transfer recipient
 */
export async function updateDriverBankDetails(
  driverId: string,
  bankCode: string,
  accountNumber: string
): Promise<{ success: boolean; account_name?: string; error?: string }> {
  try {
    // Verify account first
    const verification = await verifyBankAccount(accountNumber, bankCode);
    
    if (!verification) {
      return {
        success: false,
        error: 'Could not verify bank account. Please check account number and bank code.',
      };
    }

    // Create transfer recipient
    const recipientCode = await createTransferRecipient(
      driverId,
      verification.account_name,
      accountNumber,
      bankCode
    );

    if (!recipientCode) {
      return {
        success: false,
        error: 'Failed to create payment recipient. Please try again.',
      };
    }

    // Update driver record
    const { error: updateError } = await supabase
      .from('drivers')
      .update({
        bank_code: bankCode,
        account_number: accountNumber,
        account_name: verification.account_name,
        paystack_recipient_code: recipientCode,
      })
      .eq('id', driverId);

    if (updateError) {
      console.error('Error updating driver:', updateError);
      return {
        success: false,
        error: 'Failed to save bank details.',
      };
    }

    return {
      success: true,
      account_name: verification.account_name,
    };
  } catch (error) {
    console.error('Error in updateDriverBankDetails:', error);
    return {
      success: false,
      error: 'An unexpected error occurred.',
    };
  }
}

/**
 * Get list of Nigerian banks from Paystack
 */
export async function getNigerianBanks() {
  try {
    const response = await fetch('https://api.paystack.co/bank?currency=NGN', {
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET}`,
      },
    });

    const data = await response.json();

    if (!data.status || !data.data) {
      console.error('Failed to fetch banks:', data.message);
      return [];
    }

    return data.data.map((bank: any) => ({
      name: bank.name,
      code: bank.code,
      slug: bank.slug,
    }));
  } catch (error) {
    console.error('Error fetching banks:', error);
    return [];
  }
}
