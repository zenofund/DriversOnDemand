import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { EmailType, EmailStatus } from '../../shared/schema';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================================================
// RESEND CLIENT SETUP (from Replit connector)
// ============================================================================

interface ConnectionSettings {
  settings: {
    api_key: string;
    from_email: string;
  };
}

let connectionSettings: ConnectionSettings | null = null;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || !connectionSettings.settings.api_key) {
    throw new Error('Resend not connected');
  }
  
  return {
    apiKey: connectionSettings.settings.api_key, 
    fromEmail: connectionSettings.settings.from_email
  };
}

async function getUncachableResendClient() {
  const credentials = await getCredentials();
  return {
    client: new Resend(credentials.apiKey),
    fromEmail: connectionSettings!.settings.from_email
  };
}

// ============================================================================
// EMAIL SERVICE TYPES
// ============================================================================

interface SendEmailParams {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text: string;
  emailType: keyof typeof EmailType;
  templateData?: Record<string, any>;
  userId?: string;
  bookingId?: string;
}

interface EmailLog {
  id: string;
  resend_email_id: string | null;
  to_email: string;
  status: string;
}

// ============================================================================
// CORE EMAIL SENDING FUNCTION
// ============================================================================

export async function sendEmail(params: SendEmailParams): Promise<EmailLog | null> {
  const {
    to,
    toName,
    subject,
    html,
    text,
    emailType,
    templateData,
    userId,
    bookingId
  } = params;

  try {
    // Create email log entry
    const { data: emailLog, error: logError } = await supabaseAdmin
      .from('email_logs')
      .insert({
        to_email: to,
        to_name: toName,
        email_type: emailType,
        subject,
        template_data: templateData,
        status: EmailStatus.QUEUED,
        user_id: userId,
        booking_id: bookingId,
        retry_count: 0
      })
      .select()
      .single();

    if (logError) {
      console.error('Failed to create email log:', logError);
      return null;
    }

    // Get Resend client
    const { client, fromEmail } = await getUncachableResendClient();

    // Send email via Resend
    const { data: resendData, error: resendError } = await client.emails.send({
      from: fromEmail,
      to: [to],
      subject,
      html,
      text,
    });

    if (resendError) {
      console.error('Resend API error:', resendError);
      
      // Update email log with error
      await supabaseAdmin
        .from('email_logs')
        .update({
          status: EmailStatus.FAILED,
          error_message: resendError.message,
          updated_at: new Date().toISOString()
        })
        .eq('id', emailLog.id);

      return null;
    }

    // Update email log with Resend email ID
    const { data: updatedLog } = await supabaseAdmin
      .from('email_logs')
      .update({
        resend_email_id: resendData?.id || null,
        status: EmailStatus.SENT,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', emailLog.id)
      .select()
      .single();

    console.log(`Email sent successfully: ${emailType} to ${to}`);
    return updatedLog || emailLog;

  } catch (error) {
    console.error('Failed to send email:', error);
    return null;
  }
}

// ============================================================================
// RETRY LOGIC FOR FAILED EMAILS
// ============================================================================

export async function retryFailedEmail(emailLogId: string): Promise<boolean> {
  try {
    // Get the failed email log
    const { data: emailLog, error } = await supabaseAdmin
      .from('email_logs')
      .select('*')
      .eq('id', emailLogId)
      .single();

    if (error || !emailLog) {
      console.error('Email log not found:', error);
      return false;
    }

    // Check retry count (max 3 retries)
    if (emailLog.retry_count >= 3) {
      console.error('Max retry count reached for email:', emailLogId);
      return false;
    }

    // Increment retry count
    await supabaseAdmin
      .from('email_logs')
      .update({
        retry_count: emailLog.retry_count + 1,
        status: EmailStatus.QUEUED,
        updated_at: new Date().toISOString()
      })
      .eq('id', emailLogId);

    // Retry sending (note: we don't have the original HTML/text, so this needs templates)
    // For now, just mark as queued - a background job should pick it up
    console.log(`Email marked for retry: ${emailLogId}`);
    return true;

  } catch (error) {
    console.error('Failed to retry email:', error);
    return false;
  }
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

export const emailTemplates = {
  // NIN Verification Approved
  ninVerificationApproved: (data: { clientName: string; approvedAt: string }) => ({
    subject: '✅ Your Identity Verification is Approved - Draba',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .success-icon { font-size: 48px; margin-bottom: 10px; }
            .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="success-icon">✅</div>
              <h1>Identity Verification Approved!</h1>
            </div>
            <div class="content">
              <p>Hi ${data.clientName},</p>
              <p>Great news! Your National Identification Number (NIN) has been successfully verified.</p>
              <p><strong>Verified on:</strong> ${new Date(data.approvedAt).toLocaleString()}</p>
              <p>You now have full access to all Draba features, including:</p>
              <ul>
                <li>Search and book verified drivers</li>
                <li>Real-time trip tracking</li>
                <li>Secure payments</li>
                <li>In-app messaging</li>
              </ul>
              <a href="${process.env.VITE_SUPABASE_URL || 'https://draba.com'}/client/dashboard" class="button">Go to Dashboard</a>
            </div>
            <div class="footer">
              <p>Draba - Connecting clients with verified professional drivers</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Hi ${data.clientName},\n\nGreat news! Your National Identification Number (NIN) has been successfully verified.\n\nVerified on: ${new Date(data.approvedAt).toLocaleString()}\n\nYou now have full access to all Draba features.\n\nDraba - Connecting clients with verified professional drivers`
  }),

  // NIN Verification Rejected
  ninVerificationRejected: (data: { clientName: string; reason: string; adminNotes?: string }) => ({
    subject: '❌ Identity Verification Update - Draba',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .alert-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Identity Verification Update</h1>
            </div>
            <div class="content">
              <p>Hi ${data.clientName},</p>
              <p>We regret to inform you that your NIN verification could not be completed at this time.</p>
              <div class="alert-box">
                <strong>Reason:</strong> ${data.reason}
                ${data.adminNotes ? `<br><br><strong>Additional notes:</strong> ${data.adminNotes}` : ''}
              </div>
              <p><strong>What's next?</strong></p>
              <ul>
                <li>Please ensure your NIN is correct and valid</li>
                <li>Take a clear selfie in good lighting</li>
                <li>Contact support if you need assistance</li>
              </ul>
              <p>You can try again or contact our support team for help.</p>
              <a href="${process.env.VITE_SUPABASE_URL || 'https://draba.com'}/client/verify-nin" class="button">Try Again</a>
            </div>
            <div class="footer">
              <p>Draba - Connecting clients with verified professional drivers</p>
              <p>Need help? Contact support@draba.com</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Hi ${data.clientName},\n\nWe regret to inform you that your NIN verification could not be completed.\n\nReason: ${data.reason}${data.adminNotes ? `\n\nAdditional notes: ${data.adminNotes}` : ''}\n\nPlease try again or contact support for assistance.\n\nDraba - Connecting clients with verified professional drivers`
  }),

  // NIN Verification Locked (Admin Alert)
  ninVerificationLocked: (data: { clientName: string; clientEmail: string; attemptsCount: number }) => ({
    subject: `🔒 NIN Verification Account Locked - ${data.clientEmail}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
            .button { display: inline-block; background: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔒 Account Locked - Manual Review Required</h1>
            </div>
            <div class="content">
              <p>Admin Alert,</p>
              <p>A client account has been locked after multiple failed NIN verification attempts and requires manual review.</p>
              <div class="warning-box">
                <strong>Client Details:</strong><br>
                Name: ${data.clientName}<br>
                Email: ${data.clientEmail}<br>
                Failed Attempts: ${data.attemptsCount}/3
              </div>
              <p><strong>Action Required:</strong></p>
              <ul>
                <li>Review the verification attempts</li>
                <li>Check for potential fraud indicators</li>
                <li>Approve or reject the verification</li>
                <li>Add admin notes for record-keeping</li>
              </ul>
              <a href="${process.env.VITE_SUPABASE_URL || 'https://draba.com'}/admin/nin-verifications" class="button">Review in Admin Panel</a>
            </div>
            <div class="footer">
              <p>Draba Admin - Security Alert System</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Admin Alert\n\nA client account has been locked after ${data.attemptsCount} failed NIN verification attempts.\n\nClient: ${data.clientName} (${data.clientEmail})\n\nPlease review in the admin panel.\n\nDraba Admin - Security Alert System`
  }),

  // Booking Confirmation
  bookingConfirmation: (data: {
    clientName: string;
    driverName: string;
    pickupLocation: string;
    destination: string;
    cost: number;
    bookingId: string;
  }) => ({
    subject: '🚗 Booking Confirmed - Draba',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚗 Booking Confirmed!</h1>
            </div>
            <div class="content">
              <p>Hi ${data.clientName},</p>
              <p>Your booking has been confirmed and payment received. Your driver will be in touch shortly.</p>
              <div class="booking-details">
                <h3>Booking Details</h3>
                <div class="detail-row">
                  <span>Driver:</span>
                  <strong>${data.driverName}</strong>
                </div>
                <div class="detail-row">
                  <span>Pickup:</span>
                  <strong>${data.pickupLocation}</strong>
                </div>
                <div class="detail-row">
                  <span>Destination:</span>
                  <strong>${data.destination}</strong>
                </div>
                <div class="detail-row">
                  <span>Total Cost:</span>
                  <strong>₦${data.cost.toLocaleString()}</strong>
                </div>
                <div class="detail-row">
                  <span>Booking ID:</span>
                  <strong>${data.bookingId}</strong>
                </div>
              </div>
              <a href="${process.env.VITE_SUPABASE_URL || 'https://draba.com'}/client/bookings/${data.bookingId}" class="button">Track Booking</a>
            </div>
            <div class="footer">
              <p>Draba - Connecting clients with verified professional drivers</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Hi ${data.clientName},\n\nYour booking has been confirmed!\n\nDriver: ${data.driverName}\nPickup: ${data.pickupLocation}\nDestination: ${data.destination}\nTotal Cost: ₦${data.cost.toLocaleString()}\nBooking ID: ${data.bookingId}\n\nDraba - Connecting clients with verified professional drivers`
  }),

  // Payment Receipt
  paymentReceipt: (data: {
    clientName: string;
    amount: number;
    reference: string;
    bookingId: string;
    paidAt: string;
  }) => ({
    subject: '💳 Payment Receipt - Draba',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .receipt { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #10b981; }
            .amount { font-size: 32px; font-weight: bold; color: #10b981; text-align: center; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💳 Payment Successful</h1>
            </div>
            <div class="content">
              <p>Hi ${data.clientName},</p>
              <p>Thank you for your payment. Your transaction was successful.</p>
              <div class="receipt">
                <div class="amount">₦${data.amount.toLocaleString()}</div>
                <div class="detail-row">
                  <span>Payment Reference:</span>
                  <strong>${data.reference}</strong>
                </div>
                <div class="detail-row">
                  <span>Booking ID:</span>
                  <strong>${data.bookingId}</strong>
                </div>
                <div class="detail-row">
                  <span>Paid At:</span>
                  <strong>${new Date(data.paidAt).toLocaleString()}</strong>
                </div>
              </div>
              <p style="text-align: center; color: #6b7280; font-size: 14px;">Keep this receipt for your records</p>
            </div>
            <div class="footer">
              <p>Draba - Secure Payment Processing</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Hi ${data.clientName},\n\nPayment Successful!\n\nAmount: ₦${data.amount.toLocaleString()}\nReference: ${data.reference}\nBooking ID: ${data.bookingId}\nPaid At: ${new Date(data.paidAt).toLocaleString()}\n\nDraba - Secure Payment Processing`
  })
};
