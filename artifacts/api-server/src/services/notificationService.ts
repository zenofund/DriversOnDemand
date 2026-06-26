import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
}

/**
 * Send a push notification via OneSignal
 */
async function sendPushNotification(playerIds: string[], title: string, message: string, data?: Record<string, any>) {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
    console.warn('OneSignal not configured. Skipping push notification.');
    return null;
  }

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_player_ids: playerIds,
        headings: { en: title },
        contents: { en: message },
        data: data || {},
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OneSignal API error:', error);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to send push notification:', error);
    return null;
  }
}

/**
 * Main notification service - sends notifications and logs them
 */
export async function sendNotification(payload: NotificationPayload): Promise<boolean> {
  try {
    const { userId, type, title, message, data } = payload;

    // Get user's notification preferences
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Check if user has preferences set
    if (!prefs) {
      // Create default preferences
      await supabase
        .from('notification_preferences')
        .insert([{ user_id: userId }]);
    }

    // Check if notifications are enabled based on type
    const shouldSend = prefs && prefs.push_enabled && (
      (type.includes('booking') && prefs.booking_updates) ||
      (type.includes('payment') && prefs.payment_alerts) ||
      (type.includes('message') && prefs.chat_messages)
    );

    // Send push notification if enabled and player ID exists
    if (shouldSend && prefs?.onesignal_player_id) {
      await sendPushNotification([prefs.onesignal_player_id], title, message, data);
    }

    // Log the notification
    await supabase
      .from('notification_logs')
      .insert([{
        user_id: userId,
        notification_type: type,
        title,
        message,
        data,
      }]);

    return true;
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
}

/**
 * Send notification to multiple users
 */
export async function sendBulkNotifications(payloads: NotificationPayload[]): Promise<void> {
  await Promise.all(payloads.map(payload => sendNotification(payload)));
}

/**
 * Notification templates for common events
 */
export const NotificationTemplates = {
  bookingCreated: (driverName: string, clientName: string) => ({
    driver: {
      title: 'New Booking Request',
      message: `${clientName} has requested your services`,
    },
    client: {
      title: 'Booking Created',
      message: `Your booking request with ${driverName} has been created`,
    },
  }),

  bookingAccepted: (driverName: string) => ({
    title: 'Booking Accepted',
    message: `${driverName} has accepted your booking`,
  }),

  bookingCompleted: (amount: number) => ({
    title: 'Trip Completed',
    message: `Your trip has been completed. Amount: ₦${amount.toLocaleString()}`,
  }),

  bookingCancelled: (by: 'driver' | 'client') => ({
    title: 'Booking Cancelled',
    message: `Your booking has been cancelled by the ${by}`,
  }),

  paymentReceived: (amount: number) => ({
    title: 'Payment Received',
    message: `You've received ₦${amount.toLocaleString()} for a completed trip`,
  }),

  messageReceived: (senderName: string) => ({
    title: 'New Message',
    message: `${senderName} sent you a message`,
  }),

  driverNearby: (driverName: string, eta: number) => ({
    title: 'Driver Nearby',
    message: `${driverName} is ${eta} minutes away`,
  }),
};
