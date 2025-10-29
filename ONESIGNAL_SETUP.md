# OneSignal Push Notifications Setup Guide

This guide explains how to set up OneSignal for push notifications in the Drivers On Demand platform.

## Prerequisites

1. A OneSignal account (create one at [https://onesignal.com](https://onesignal.com))
2. Your app running on Replit with HTTPS enabled

## Step 1: Create OneSignal App

1. Log in to OneSignal dashboard
2. Click "New App/Website"
3. Enter app name: "Drivers On Demand"
4. Select "Web Push" as the platform

## Step 2: Configure Web Push

1. In OneSignal dashboard, go to Settings → Web Push
2. **Site URL**: Enter your Replit app URL (e.g., `https://your-app.replit.app`)
3. **Auto Resubscribe**: Enable
4. **Prompt Settings**: Configure the permission prompt
   - Title: "Get instant booking updates"
   - Message: "Stay notified about your bookings and payments"
   - Accept button: "Allow"
   - Cancel button: "No thanks"

## Step 3: Get API Credentials

1. In OneSignal dashboard, go to Settings → Keys & IDs
2. Copy the following:
   - **App ID**: This is your `ONESIGNAL_APP_ID`
   - **REST API Key**: This is your `ONESIGNAL_API_KEY`

## Step 4: Add Environment Variables to Replit

Add these secrets to your Replit project:

```bash
ONESIGNAL_APP_ID=your-app-id-here
ONESIGNAL_API_KEY=your-rest-api-key-here
```

## Step 5: Frontend Integration

The platform automatically handles OneSignal integration. Users will be prompted to allow notifications on first visit.

### Notification Types

The platform sends notifications for:

1. **Booking Events**
   - New booking created (to driver)
   - Booking accepted (to client)
   - Booking completed
   - Booking cancelled

2. **Payment Events**
   - Payment received (to driver)
   - Payment successful (to client)

3. **Chat Messages**
   - New message received

4. **Driver Alerts**
   - Driver nearby (to client)

## Step 6: Testing Notifications

### Test Notification from Dashboard

1. Go to OneSignal dashboard → Messages
2. Click "New Push"
3. Select "Send to Test Users"
4. Add your player ID
5. Send test message

### Test from Application

1. Log in as a client
2. Create a booking
3. Log in as the assigned driver (different browser/device)
4. You should receive a push notification

## Notification Preferences

Users can manage their notification preferences:

- Enable/disable all push notifications
- Enable/disable specific notification types:
  - Booking updates
  - Payment alerts
  - Chat messages

Access via: User Dashboard → Settings → Notifications

## Troubleshooting

### Notifications not working?

1. **Check HTTPS**: OneSignal requires HTTPS. Replit provides this automatically.
2. **Check permissions**: Users must grant notification permission in their browser
3. **Check environment variables**: Ensure `ONESIGNAL_APP_ID` and `ONESIGNAL_API_KEY` are set
4. **Check browser support**: Some browsers block notifications. Test in Chrome/Firefox.

### Getting Player ID

Player IDs are automatically registered when users grant notification permission. They're stored in the `notification_preferences` table.

## Advanced Configuration

### Custom Notification Sounds

1. Upload sound files to OneSignal
2. Configure in `server/services/notificationService.ts`
3. Specify sound in notification payload

### Notification Icons

1. Upload icon files to your public assets folder
2. Update OneSignal settings to point to icon URLs

### Rich Notifications

Add images, action buttons, and custom data to notifications by modifying the `sendPushNotification` function in `server/services/notificationService.ts`.

## Security

- Never expose your REST API Key on the frontend
- Use server-side API calls only
- Validate user permissions before sending notifications
- Rate limit notification endpoints to prevent spam

## API Endpoints

### Get Notification Preferences
```
GET /api/notifications/preferences
Authorization: Bearer <token>
```

### Update Notification Preferences
```
PUT /api/notifications/preferences
Authorization: Bearer <token>
Body: {
  "push_enabled": true,
  "booking_updates": true,
  "payment_alerts": true,
  "chat_messages": false
}
```

### Get Notification Logs
```
GET /api/notifications/logs
Authorization: Bearer <token>
```

### Mark Notification as Read
```
PUT /api/notifications/:id/read
Authorization: Bearer <token>
```

## Resources

- [OneSignal Web Push Documentation](https://documentation.onesignal.com/docs/web-push-quickstart)
- [OneSignal REST API](https://documentation.onesignal.com/reference/create-notification)
- [Browser Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
