-- Migration 012: Add new notification preference columns
-- This migration adds the new column names to support the updated notification preferences UI
-- Run this in your Supabase SQL Editor

-- Add new notification preference columns
ALTER TABLE notification_preferences 
ADD COLUMN IF NOT EXISTS booking_notifications BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS payment_notifications BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS message_notifications BOOLEAN DEFAULT TRUE;

-- Copy existing data from old columns to new ones
UPDATE notification_preferences 
SET 
  booking_notifications = COALESCE(booking_updates, TRUE),
  payment_notifications = COALESCE(payment_alerts, TRUE),
  message_notifications = COALESCE(chat_messages, TRUE);

-- Optional: You can drop the old columns after verifying everything works
-- Uncomment these lines if you want to remove the old columns:
-- ALTER TABLE notification_preferences DROP COLUMN IF EXISTS booking_updates;
-- ALTER TABLE notification_preferences DROP COLUMN IF EXISTS payment_alerts;
-- ALTER TABLE notification_preferences DROP COLUMN IF EXISTS chat_messages;

-- Verify the changes
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'notification_preferences' 
AND column_name IN ('booking_notifications', 'payment_notifications', 'message_notifications')
ORDER BY column_name;
