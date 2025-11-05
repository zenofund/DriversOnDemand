# In-App Chat Feature Documentation

## Overview
A complete real-time messaging system has been implemented for drivers and clients to communicate during bookings. The chat feature is secured with Row-Level Security (RLS) and includes real-time message delivery via Supabase Realtime.

## Features Implemented

### 1. Real-Time Messaging
**Technology**: Supabase Realtime with PostgreSQL Change Data Capture (CDC)

**Features**:
- ✅ Instant message delivery
- ✅ Real-time message subscriptions
- ✅ No polling required
- ✅ Efficient bandwidth usage
- ✅ Automatic reconnection on network issues

### 2. Security with Row-Level Security (RLS)

**Database Policies** (from `supabase_schema.sql`):

```sql
-- Messages Policies
CREATE POLICY "Participants can view messages in their bookings"
  ON messages FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM bookings WHERE
        client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
        OR driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Participants can send messages in their bookings"
  ON messages FOR INSERT
  WITH CHECK (
    booking_id IN (
      SELECT id FROM bookings WHERE
        client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
        OR driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
    )
    AND sender_id = auth.uid()
  );
```

**Security Guarantees**:
- ✅ Users can only view messages from their own bookings
- ✅ Users cannot send messages on behalf of others
- ✅ Server-side verification of user identity
- ✅ Protection against SQL injection
- ✅ Automatic enforcement at database level

### 3. Chat Components

#### Driver Chat Page
**Location**: `/client/src/pages/driver/Chat.tsx`

**Features**:
- Full-screen chat interface
- Client profile picture and name display
- Booking route information
- Real-time message updates
- Typing indicators (placeholder)
- Auto-scroll to new messages
- Message timestamps
- Send message with Enter key

**Access**: `/driver/chat/:bookingId`

#### Client Chat Page
**Location**: `/client/src/pages/client/Chat.tsx`

**Features**:
- Full-screen chat interface
- Driver profile picture display
- Booking reference number
- Real-time message updates
- Auto-scroll functionality
- Message timestamps
- Clean, simple UI

**Access**: `/client/chat/:bookingId`

#### ChatBox Component
**Location**: `/client/src/components/ChatBox.tsx`

**Features**:
- Reusable chat widget
- Can be embedded in dashboards
- Compact card-based design
- All chat functionality included
- Profile pictures in messages

### 4. API Endpoints

#### Get Messages
```
GET /api/messages/:bookingId
Authorization: Bearer {token}
```

**Response**:
```json
[
  {
    "id": "uuid",
    "booking_id": "uuid",
    "sender_id": "uuid",
    "sender_role": "driver" | "client",
    "message": "Hello!",
    "created_at": "2024-01-01T12:00:00Z"
  }
]
```

**Security**:
- Verifies user is participant in booking
- Returns 403 if unauthorized
- Returns messages in chronological order

#### Send Message
```
POST /api/messages
Authorization: Bearer {token}
Content-Type: application/json

{
  "booking_id": "uuid",
  "message": "Hello, I'm on my way!"
}
```

**Validation**:
- Message length: 1-1000 characters
- User must be booking participant
- Booking must exist
- Automatic sender role detection

#### Get Booking Details
```
GET /api/bookings/:id
Authorization: Bearer {token}
```

**Returns**: Booking with driver and client details (for chat header)

### 5. Database Schema

**Messages Table** (from `supabase_schema.sql`):

```sql
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('driver', 'client')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_messages_booking_id ON messages(booking_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```

### 6. Access Points

#### From Driver Dashboard

1. **Active Bookings Page** (`/driver/bookings`)
   - Chat button available for `accepted` and `ongoing` bookings
   - Click "Chat" button to open chat with client
   - Button shows MessageCircle icon

2. **Direct Access**
   - Navigate to `/driver/chat/:bookingId`
   - Requires authentication
   - Verifies booking participation

#### From Client Dashboard

1. **My Bookings Page** (`/client/bookings`)
   - Chat button available for `accepted` and `ongoing` bookings
   - Click "Chat" button to open chat with driver
   - Button shows MessageCircle icon

2. **Direct Access**
   - Navigate to `/client/chat/:bookingId`
   - Requires authentication
   - Verifies booking participation

### 7. User Experience Flow

#### Driver Initiating Chat

1. Driver logs in
2. Goes to Active Bookings
3. Sees accepted/ongoing booking
4. Clicks "Chat" button
5. Chat opens with client's name and profile picture
6. Types message and sends
7. Message appears instantly
8. Client receives message in real-time

#### Client Initiating Chat

1. Client logs in
2. Goes to My Bookings
3. Sees accepted/ongoing booking
4. Clicks "Chat" button
5. Chat opens with driver's name and profile picture
6. Types message and sends
7. Message appears instantly
8. Driver receives message in real-time

### 8. Real-Time Implementation

**Subscription Setup**:

```typescript
// Subscribe to new messages
useEffect(() => {
  if (!bookingId) return;

  const channel = supabase
    .channel(`messages-${bookingId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `booking_id=eq.${bookingId}`,
      },
      () => {
        // Refetch messages when new message inserted
        queryClient.invalidateQueries({ 
          queryKey: ['/api/messages', bookingId] 
        });
      }
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}, [bookingId]);
```

**How It Works**:
1. User opens chat
2. Component subscribes to messages table changes
3. Filters for current booking_id
4. When new message inserted, event fires
5. React Query refetches messages
6. UI updates with new message
7. Auto-scrolls to bottom

### 9. Message Features

#### Visual Design

**Driver Messages** (Own messages):
- Aligned to right
- Primary color background
- White text
- Rounded corners (bottom-right sharp)
- Profile picture on right

**Client Messages** (Received):
- Aligned to left
- Muted/card background
- Default text color
- Rounded corners (bottom-left sharp)
- Profile picture on left

#### Timestamps
- Format: `HH:MM` (e.g., `14:30`)
- Shown below each message
- Uses local timezone
- Muted foreground color

#### Empty State
- Shows when no messages yet
- Friendly message encouraging conversation
- MessageCircle icon
- Call-to-action text

### 10. Performance Optimizations

#### Efficient Queries
- Messages fetched only when chat opens
- Uses React Query caching
- `refetchOnWindowFocus: false` to prevent unnecessary fetches
- Indexed database queries

#### Real-Time Efficiency
- Single subscription per chat
- Filter at database level (`filter: booking_id=eq.${id}`)
- Automatic cleanup on unmount
- No polling - push-based updates

#### Auto-Scroll Optimization
- Uses `scrollIntoView` with smooth behavior
- Only triggers when messages change
- Ref-based implementation (no DOM queries)

#### Network Efficiency
- Messages loaded once
- Real-time updates use WebSocket (efficient)
- React Query prevents duplicate requests
- Optimistic updates possible (not implemented yet)

### 11. Chat Availability

**When Chat is Available**:
- Booking status: `accepted` or `ongoing`
- User is participant (driver or client)
- Both parties authenticated

**When Chat is NOT Available**:
- Booking status: `pending` (not yet accepted)
- Booking status: `completed` (trip finished)
- Booking status: `cancelled`
- User not authenticated
- User not participant in booking

### 12. TypeScript Types

```typescript
// Message type
interface Message {
  id: string;
  booking_id: string;
  sender_id: string;
  sender_role: 'driver' | 'client';
  message: string;
  created_at: string;
}

// Extended for display
interface ChatMessage extends Message {
  sender_name?: string;
}

// Booking details for chat
interface BookingDetails {
  id: string;
  client: {
    full_name: string;
    profile_picture_url: string | null;
  };
  driver: {
    full_name: string;
    profile_picture_url: string | null;
  };
  start_location: string;
  destination: string;
}
```

### 13. Error Handling

**Connection Errors**:
- Supabase Realtime auto-reconnects
- Messages refetch on reconnection
- User sees existing messages during disconnect

**Send Failures**:
- Toast notification shows error
- Message stays in input field
- User can retry sending
- Error details logged to console

**Loading States**:
- Skeleton loaders while fetching messages
- Disabled send button while sending
- Loading state on page load

**Authorization Errors**:
- Redirect to login if not authenticated
- 403 error if not booking participant
- Clear error messages to user

### 14. Future Enhancements (Not Yet Implemented)

#### Typing Indicators
- Show when other party is typing
- Uses Supabase presence feature
- Real-time typing state broadcast

#### Read Receipts
- Track when messages are read
- Add `read_at` timestamp to messages
- Display checkmarks for read status

#### Unread Message Counts
- Badge showing unread count
- Highlight bookings with unread messages
- Update in real-time

#### Message Notifications
- OneSignal push notifications for new messages
- In-app notification badges
- Sound alerts (optional)

#### Rich Media
- Image sharing
- Location sharing
- Voice messages
- File attachments

#### Message Reactions
- Emoji reactions to messages
- Quick responses
- Like/thumbs up

#### Message Search
- Search within conversation
- Filter by date
- Highlight results

#### Chat History
- View past chats from completed bookings
- Archive old conversations
- Export chat logs

### 15. Testing the Feature

#### Manual Testing Steps

**As Driver**:
1. ✅ Accept a booking
2. ✅ Go to Active Bookings
3. ✅ Click Chat button
4. ✅ Send message to client
5. ✅ Verify message appears
6. ✅ Check timestamp is correct
7. ✅ Send another message
8. ✅ Verify auto-scroll works

**As Client**:
1. ✅ Create and pay for booking
2. ✅ Wait for driver to accept
3. ✅ Go to My Bookings
4. ✅ Click Chat button
5. ✅ Send message to driver
6. ✅ Verify message appears
7. ✅ Receive driver's response
8. ✅ Verify real-time updates

**Cross-User Testing**:
1. ✅ Open driver chat in one browser
2. ✅ Open client chat in another browser (or incognito)
3. ✅ Send message from driver
4. ✅ Verify client receives instantly
5. ✅ Send message from client
6. ✅ Verify driver receives instantly
7. ✅ Test multiple rapid messages
8. ✅ Verify order is maintained

#### Security Testing
1. ✅ Try accessing chat for booking you're not in (should fail)
2. ✅ Try accessing chat while logged out (should redirect)
3. ✅ Try sending message with empty text (should be blocked)
4. ✅ Try accessing another user's booking ID (should fail)

### 16. Troubleshooting

#### Messages Not Appearing

**Check**:
1. Is user authenticated?
2. Is user participant in booking?
3. Is booking in correct status (accepted/ongoing)?
4. Check browser console for errors
5. Check network tab for failed requests
6. Verify Supabase connection

**Solution**:
- Refresh page
- Re-authenticate
- Check Supabase status
- Verify RLS policies are enabled

#### Real-Time Not Working

**Check**:
1. Is Supabase Realtime enabled?
2. Is messages table added to publication?
3. Check browser WebSocket connection
4. Check console for subscription errors

**Solution**:
```sql
-- Verify realtime is enabled
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```

#### Chat Button Not Showing

**Check**:
1. Booking status (`accepted` or `ongoing`)?
2. Is user viewing correct page?
3. Check booking data in React DevTools

**Solution**:
- Accept booking first (if pending)
- Navigate to Active Bookings / My Bookings
- Complete booking if already finished

### 17. Database Queries

#### Get All Messages for Booking
```sql
SELECT * FROM messages
WHERE booking_id = 'uuid'
ORDER BY created_at ASC;
```

#### Get Unread Messages Count (Future)
```sql
SELECT COUNT(*) FROM messages
WHERE booking_id = 'uuid'
  AND sender_id != 'current_user_id'
  AND read_at IS NULL;
```

#### Get Recent Chats for User (Future)
```sql
SELECT DISTINCT booking_id, MAX(created_at) as last_message
FROM messages
WHERE booking_id IN (
  SELECT id FROM bookings 
  WHERE client_id = 'user_client_id' OR driver_id = 'user_driver_id'
)
GROUP BY booking_id
ORDER BY last_message DESC
LIMIT 10;
```

### 18. Monitoring & Analytics

#### Metrics to Track
- Total messages sent per day
- Average messages per booking
- Chat usage rate (% of bookings with chat)
- Average response time
- Most active chat times

#### Queries for Analytics
```sql
-- Messages per day
SELECT DATE(created_at) as date, COUNT(*) as count
FROM messages
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY date
ORDER BY date DESC;

-- Average messages per booking
SELECT AVG(message_count) FROM (
  SELECT booking_id, COUNT(*) as message_count
  FROM messages
  GROUP BY booking_id
) as counts;

-- Chat adoption rate
SELECT 
  (SELECT COUNT(DISTINCT booking_id) FROM messages) * 100.0 /
  (SELECT COUNT(*) FROM bookings WHERE booking_status IN ('accepted', 'ongoing', 'completed'))
  AS adoption_percentage;
```

## Summary

The in-app chat feature provides:

✅ **Real-Time Communication**
- Instant message delivery
- WebSocket-based subscriptions
- No polling overhead
- Automatic reconnection

✅ **Security**
- Row-Level Security (RLS)
- Server-side verification
- Participant-only access
- Protection against unauthorized access

✅ **Great UX**
- Clean, modern interface
- Profile pictures in chat
- Auto-scroll to new messages
- Smooth animations
- Loading states
- Error handling

✅ **Performance**
- Indexed queries
- React Query caching
- Efficient real-time updates
- Minimal network usage

✅ **Full Integration**
- Available from active bookings
- Both driver and client sides
- Easy access with one click
- Booking context included

The chat feature is **production-ready** and provides a seamless communication channel for drivers and clients during their bookings.
