import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { sendEmail, emailTemplates } from './emailService';
import { EmailType } from '../../shared/schema';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const YOUVERIFY_API_TOKEN = process.env.YOUVERIFY_API_TOKEN!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface VerifyNINRequest {
  nin: string;
  selfieBase64?: string;
  clientId: string;
}

interface YouVerifyResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data?: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    gender?: string;
    dateOfBirth?: string;
    mobile?: string;
    email?: string;
    image?: string;
    address?: {
      town?: string;
      lga?: string;
      state?: string;
    };
    validations?: {
      selfie?: {
        match: boolean;
        confidence: number;
      };
    };
  };
  error?: string;
}

interface VerificationResult {
  success: boolean;
  verified: boolean;
  confidence?: number;
  message: string;
  attemptsRemaining?: number;
  locked?: boolean;
  data?: any;
}

export class NINVerificationService {
  private hashNIN(nin: string, salt: string): string {
    return crypto.createHash('sha256').update(nin + salt).digest('hex');
  }

  private generateSalt(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  async canAttemptVerification(clientId: string): Promise<{
    canAttempt: boolean;
    attemptsRemaining: number;
    state: string;
    message?: string;
  }> {
    const { data: client, error } = await supabase
      .from('clients')
      .select('nin_verification_state, nin_attempts_count, last_attempt_at')
      .eq('id', clientId)
      .single();

    if (error || !client) {
      return {
        canAttempt: false,
        attemptsRemaining: 0,
        state: 'error',
        message: 'Client not found',
      };
    }

    if (client.nin_verification_state === 'verified') {
      return {
        canAttempt: false,
        attemptsRemaining: 0,
        state: 'verified',
        message: 'Already verified',
      };
    }

    if (client.nin_verification_state === 'locked') {
      return {
        canAttempt: false,
        attemptsRemaining: 0,
        state: 'locked',
        message: 'Account locked. Please contact admin for manual verification.',
      };
    }

    const lastAttempt = client.last_attempt_at ? new Date(client.last_attempt_at) : null;
    const now = new Date();
    const hoursSinceLastAttempt = lastAttempt
      ? (now.getTime() - lastAttempt.getTime()) / (1000 * 60 * 60)
      : 999;

    if (hoursSinceLastAttempt >= 24) {
      await supabase
        .from('clients')
        .update({ nin_attempts_count: 0 })
        .eq('id', clientId);

      return {
        canAttempt: true,
        attemptsRemaining: 3,
        state: client.nin_verification_state,
      };
    }

    const attemptsCount = client.nin_attempts_count || 0;
    const attemptsRemaining = 3 - attemptsCount;

    if (attemptsRemaining <= 0) {
      await supabase
        .from('clients')
        .update({ nin_verification_state: 'locked' })
        .eq('id', clientId);

      return {
        canAttempt: false,
        attemptsRemaining: 0,
        state: 'locked',
        message: 'Maximum attempts exceeded. Account locked.',
      };
    }

    return {
      canAttempt: true,
      attemptsRemaining,
      state: client.nin_verification_state,
    };
  }

  async callYouVerifyAPI(nin: string, selfieBase64?: string): Promise<YouVerifyResponse> {
    try {
      const requestBody: any = {
        id: nin,
        isSubjectConsent: true,
      };

      if (selfieBase64) {
        requestBody.validations = {
          selfie: {
            image: selfieBase64,
          },
        };
      }

      const response = await fetch('https://api.youverify.co/v2/identities/verifications/ng/nin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': YOUVERIFY_API_TOKEN,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      return {
        success: response.ok,
        statusCode: response.status,
        message: data.message || 'Verification completed',
        data: data.data,
        error: data.error,
      };
    } catch (error: any) {
      console.error('YouVerify API Error:', error);
      return {
        success: false,
        statusCode: 500,
        message: 'API call failed',
        error: error.message,
      };
    }
  }

  async verifyNIN(request: VerifyNINRequest): Promise<VerificationResult> {
    const { nin, selfieBase64, clientId } = request;

    const validNIN = /^\d{11}$/.test(nin);
    if (!validNIN) {
      return {
        success: false,
        verified: false,
        message: 'Invalid NIN format. Must be 11 digits.',
      };
    }

    const attemptCheck = await this.canAttemptVerification(clientId);
    if (!attemptCheck.canAttempt) {
      return {
        success: false,
        verified: false,
        message: attemptCheck.message || 'Cannot attempt verification',
        attemptsRemaining: attemptCheck.attemptsRemaining,
        locked: attemptCheck.state === 'locked',
      };
    }

    await supabase
      .from('clients')
      .update({
        nin_attempts_count: (attemptCheck.attemptsRemaining || 3) - 1,
        last_attempt_at: new Date().toISOString(),
        nin_verification_state: 'pending',
      })
      .eq('id', clientId);

    const apiResponse = await this.callYouVerifyAPI(nin, selfieBase64);

    const salt = this.generateSalt();
    const ninHash = this.hashNIN(nin, salt);

    const isSuccess = apiResponse.success && apiResponse.data;
    const confidence = apiResponse.data?.validations?.selfie?.confidence ?? undefined;
    const selfieMatch = apiResponse.data?.validations?.selfie?.match !== false;

    const verificationStatus = isSuccess && selfieMatch ? 'success' : 'failed';

    const { data: verification } = await supabase
      .from('nin_verifications')
      .insert({
        client_id: clientId,
        nin_hash: ninHash,
        status: verificationStatus,
        confidence_score: confidence,
        request_metadata: {
          nin_length: nin.length,
          has_selfie: !!selfieBase64,
          salt,
        },
        response_metadata: {
          status_code: apiResponse.statusCode,
          message: apiResponse.message,
          has_data: !!apiResponse.data,
          selfie_match: selfieMatch,
        },
        failure_reason: !isSuccess ? apiResponse.error || apiResponse.message : null,
      })
      .select()
      .single();

    await supabase.from('nin_verification_events').insert({
      verification_id: verification?.id,
      event_type: verificationStatus === 'success' ? 'success' : 'failure',
      message: apiResponse.message,
      payload_snapshot: {
        confidence,
        selfie_match: selfieMatch,
      },
    });

    if (verificationStatus === 'success') {
      await supabase
        .from('clients')
        .update({
          nin_verification_state: 'verified',
          nin_verified_at: new Date().toISOString(),
          nin_last_confidence: confidence,
          nin_reference_id: verification?.id,
        })
        .eq('id', clientId);

      return {
        success: true,
        verified: true,
        confidence,
        message: 'NIN verified successfully!',
        data: {
          firstName: apiResponse.data?.firstName,
          lastName: apiResponse.data?.lastName,
        },
      };
    } else {
      const currentAttempts = (attemptCheck.attemptsRemaining || 3) - 1;
      const remaining = 3 - currentAttempts;

      if (remaining <= 0) {
        await supabase
          .from('clients')
          .update({ nin_verification_state: 'locked' })
          .eq('id', clientId);

        await supabase.from('nin_verification_events').insert({
          verification_id: verification?.id,
          event_type: 'locked',
          message: 'Account locked after 3 failed attempts',
          payload_snapshot: { attempts: 3 },
        });

        // Get client details for admin alert email
        const { data: client } = await supabase
          .from('clients')
          .select('full_name, email')
          .eq('id', clientId)
          .single();

        // Send admin alert email (non-blocking, fire-and-forget)
        if (client) {
          const adminAlertTemplate = emailTemplates.ninVerificationLocked({
            clientName: client.full_name,
            clientEmail: client.email,
            attemptsCount: 3
          });

          // Get active admin emails
          const { data: admins } = await supabase
            .from('admin_users')
            .select('email')
            .eq('is_active', true);

          // Send email to all active admins
          if (admins && admins.length > 0) {
            admins.forEach((admin: any) => {
              sendEmail({
                to: admin.email,
                subject: adminAlertTemplate.subject,
                html: adminAlertTemplate.html,
                text: adminAlertTemplate.text,
                emailType: 'admin_alert',
                templateData: {
                  client_name: client.full_name,
                  client_email: client.email,
                  attempts_count: 3
                }
              }).catch(err => console.error('Failed to send admin alert email:', err));
            });
          }
        }

        return {
          success: false,
          verified: false,
          message: 'Verification failed. Account locked. Please contact admin.',
          attemptsRemaining: 0,
          locked: true,
        };
      }

      await supabase
        .from('clients')
        .update({ nin_verification_state: 'unverified' })
        .eq('id', clientId);

      return {
        success: false,
        verified: false,
        confidence,
        message: apiResponse.error || apiResponse.message || 'Verification failed',
        attemptsRemaining: remaining,
      };
    }
  }

  async getVerificationStatus(clientId: string) {
    const { data: client } = await supabase
      .from('clients')
      .select('nin_verification_state, nin_attempts_count, nin_last_confidence, nin_verified_at')
      .eq('id', clientId)
      .single();

    if (!client) {
      return null;
    }

    const attemptsRemaining = Math.max(0, 3 - (client.nin_attempts_count || 0));

    return {
      verified: client.nin_verification_state === 'verified',
      state: client.nin_verification_state,
      attemptsRemaining,
      lastConfidence: client.nin_last_confidence,
      verifiedAt: client.nin_verified_at,
    };
  }
}

export const ninVerificationService = new NINVerificationService();
