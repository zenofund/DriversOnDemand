# Drivers On Demand

A production-ready full-stack driver booking platform built with React, Vite, Supabase, and Paystack.

## Overview

Drivers On Demand connects clients with verified professional drivers in real-time. The platform features role-based dashboards for drivers, clients, and admins, with real-time updates, secure payment processing, and location-based driver search.

## Tech Stack

### Frontend
- **React + Vite** - Fast, modern SPA
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Shadcn UI** - Beautiful, accessible components
- **React Query (TanStack Query)** - Server state management with optimized caching
- **Zustand** - Global client state management
- **Wouter** - Lightweight routing
- **Lucide React** - Icon library

### Backend
- **Supabase** - PostgreSQL database with real-time subscriptions
- **Supabase Auth** - Role-based authentication
- **Express.js** - API server
- **Paystack API** - Payment processing with split payments

### External Services
- **Google Maps API** - Location services and driver tracking
- **Paystack** - Payment gateway (90/10 split for drivers)

## Architecture

### Database Schema

**Drivers Table**
- Full profile with license verification
- Online/offline status
- Current location (JSONB coordinates)
- Hourly rate and ratings
- Paystack subaccount for split payments

**Clients Table**
- Basic profile information
- Booking history relationship

**Bookings Table**
- Complete trip details with coordinates
- Payment and booking status tracking
- Real-time updates via Supabase Realtime

**Transactions Table**
- Paystack reference for reconciliation
- Split payment tracking with driver_share and platform_share columns
- Settlement status (settled boolean)

**Admin Users Table**
- Role-based access (super_admin, moderator)
- Activity tracking

### Authentication Flow

1. User signs up with role selection (driver/client/admin)
2. Supabase Auth creates user account
3. Database trigger automatically creates profile in appropriate table
4. Role stored in user metadata for access control

### Driver Verification Flow

1. Driver registers and fills profile
2. System generates ₦5,000 Paystack payment link
3. Driver pays verification fee
4. Paystack webhook confirms payment
5. Driver profile marked as verified
6. Driver can now go online and receive bookings

### Booking Flow

1. Client enters pickup and destination
2. System queries nearby online verified drivers
3. Client selects driver and confirms booking
4. Paystack payment initialized with split (90% driver, 10% platform)
5. Payment success triggers booking creation
6. Driver receives real-time notification
7. Driver accepts/declines booking
8. Trip proceeds with live status updates
9. Completion triggers payout settlement

## Key Features

### Driver Dashboard
- Online/offline toggle with immediate status broadcast
- Real-time booking requests with accept/decline
- Earnings tracking (today, total, per trip)
- Rating display
- Active bookings management

### Client Dashboard
- Map-based driver search
- Real-time driver availability
- Booking form with cost calculator
- Trip history and status tracking
- Driver ratings

### Admin Dashboard
- Platform analytics (drivers, clients, revenue, trips)
- User management with verification approval
- Booking oversight and intervention
- Transaction monitoring
- Real-time platform health metrics

## Real-time Features

### Supabase Realtime Channels
- Driver status updates broadcast to all clients
- Booking status changes notify relevant parties
- Location tracking during active trips

### Optimization Strategies
- React Query caching prevents redundant fetches
- `refetchOnWindowFocus: false` for static data
- Replaced polling with Supabase Realtime subscriptions for instant updates
- Proper dependency arrays in useEffect to avoid infinite loops
- Realtime subscription cleanup on component unmount
- Centralized Google Maps loader to prevent duplicate API calls

## Payment Integration

### Paystack Setup
1. **Driver verification**: One-time ₦5,000 fee via `/api/payments/verify-driver`
2. **Booking payments**: Dynamic pricing based on hourly rate × duration via `/api/payments/initialize-booking`
3. **Split payments**: Subaccount with 10% percentage_charge ensures 90% to driver, 10% platform
4. **Subaccount creation**: `/api/payments/create-subaccount` creates Paystack subaccount for verified drivers
5. **Webhook verification**: Signature validation with `x-paystack-signature` header
6. **Transaction records**: Full reconciliation with driver_share and platform_share columns
7. **Security**: Booking ownership validation, server-side amount derivation from booking.total_cost

### Security
- Webhook signature validation prevents spoofing
- Transaction locks prevent duplicate charges
- Payment status tracking (pending → paid → settled)
- RLS policies restrict data access by role

## Row-Level Security (RLS)

All tables have RLS enabled with policies:
- Drivers: Can view/update own profile, public can see online verified drivers
- Clients: Can view/update own profile
- Bookings: Drivers see their bookings, clients see their bookings
- Transactions: Users see only their own transactions
- Admins: Full access to all tables

## Environment Variables

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
PAYSTACK_SECRET_KEY=your_paystack_secret_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## Database Setup

The SQL schema is provided in `supabase_schema.sql`. To set up:

1. Create a Supabase project
2. Go to SQL Editor in Supabase dashboard
3. Run the entire `supabase_schema.sql` script
4. Tables, indexes, RLS policies, and triggers will be created automatically

## Design System

### Colors
- Primary: Blue (#2563EB) - CTAs, links, driver status
- Success: Green - Online status, completed bookings
- Destructive: Red - Offline, cancelled bookings
- Muted: Gray - Secondary text, inactive states

### Typography
- Font Family: Inter (primary), Manrope (headings)
- Hierarchy: 7xl hero → 4xl sections → 2xl cards → base body → xs metadata

### Components
- Cards: Elevated with subtle borders
- Buttons: Size variants (default, lg, sm, icon)
- Badges: Rounded-full for status indicators
- Stat Cards: Icon + metric + trend indicator

### Spacing
- Micro: 2-4px (component padding)
- Component: 6-8px (between elements)
- Section: 12-20px (major blocks)
- Page margins: 24px (desktop), 6px (mobile)

## Development Notes

### Preventing Infinite Loops

**React Query Configuration:**
```typescript
useQuery({
  queryKey: ['/api/drivers/me'],
  refetchOnWindowFocus: false, // Don't refetch on tab focus
  retry: false, // Don't retry failed requests
});
```

**State Updates:**
```typescript
// Compare before updating to prevent unnecessary writes
const handleToggleOnline = (online: boolean) => {
  if (isOnline !== online) {
    toggleOnlineMutation.mutate(online);
  }
};
```

**Realtime Subscriptions:**
```typescript
useEffect(() => {
  const channel = supabase.channel('driver-status')
    .on('postgres_changes', { ... }, handleUpdate)
    .subscribe();

  return () => {
    channel.unsubscribe(); // Cleanup on unmount
  };
}, []); // Stable dependencies
```

### Testing Considerations

- Driver verification requires ₦5,000 test payment
- Use Paystack test keys for development
- Mock GPS coordinates for location testing
- Admin features require admin user in database

## API Endpoints

### Driver Endpoints
- `GET /api/drivers/me` - Get current driver profile
- `GET /api/drivers/stats` - Get driver statistics
- `POST /api/drivers/toggle-online` - Toggle online status
- `GET /api/drivers/nearby` - Search nearby drivers

### Booking Endpoints
- `GET /api/bookings/active` - Get active bookings
- `POST /api/bookings/:id/accept` - Accept booking
- `POST /api/bookings` - Create new booking

### Admin Endpoints
- `GET /api/admin/stats` - Platform statistics
- `GET /api/admin/recent-bookings` - Recent bookings

### Payment Endpoints
- `POST /api/payments/initialize` - Initialize Paystack payment
- `POST /api/webhooks/paystack` - Paystack webhook handler

## Current Development Status (October 29, 2025)

### ✅ Completed Features
1. **Real Database Statistics** - All dashboards show live data from Supabase
   - Driver stats: today's trips/earnings calculated from transactions table
   - Admin stats: active drivers, total clients, revenue, commission from real data
   - Proper split payment tracking with driver_share and platform_share columns

2. **Google Maps Integration** - Location autocomplete with coordinate validation
   - Centralized singleton loader prevents duplicate API calls
   - Places autocomplete restricted to Nigeria
   - Haversine distance calculation for nearby driver search
   - Coordinate validation before driver search

3. **Paystack Payment Flow** - Complete driver verification and booking payments
   - Driver verification: ₦5,000 payment endpoint with proper metadata
   - Booking payment: Server-side amount validation from booking.total_cost
   - Subaccount creation: For verified drivers to receive split payments
   - Security: Booking ownership validation, no client-side amount spoofing

4. **Paystack Webhook Handler** - Signature validation and payment confirmation
   - Verification payment: Marks driver as verified
   - Booking payment: Updates booking status and creates transaction records
   - Split calculation: 90/10 split with driver_share and platform_share

5. **Supabase Realtime Subscriptions** - Instant updates across all dashboards
   - Client dashboard: Driver status changes (online/offline) auto-refresh
   - Driver dashboard: Booking requests with instant toast notifications
   - Admin dashboard: Platform-wide booking, driver, and client changes
   - Proper cleanup: All subscriptions unsubscribe on component unmount

6. **Driver Rating and Review System** - Complete rating functionality
   - Database: ratings table with unique constraint (one rating per booking)
   - API endpoints: Create, update, and fetch ratings with security validation
   - Auto-calculation: Driver average rating updates after each submission
   - UI: RatingDialog component with 5-star rating and optional review text
   - Security: Clients can only rate completed bookings they participated in

7. **In-App Chat System** - Real-time messaging between driver and client
   - Database: messages table with RLS policies for participant-only access
   - Real-time: Supabase Realtime publication for instant message delivery
   - API endpoints: GET/POST with booking participation validation
   - UI: ChatBox component with auto-scroll and sender/receiver styling
   - Security: Server-side role detection, RLS enforcement, realtime scoped to booking

8. **Push Notification System** - OneSignal integration for instant updates
   - Database: notification_preferences and notification_logs tables with RLS
   - Notification service: Automatic push notifications for booking/payment events
   - API endpoints: GET/PUT preferences, GET logs, mark as read
   - Templates: Pre-configured notifications for all booking events
   - User control: Granular notification preferences per event type
   - Documentation: Complete OneSignal setup guide (ONESIGNAL_SETUP.md)

9. **Automated Payout Processing** - Paystack Transfer API for driver settlements
   - Database: payouts table with status tracking and transaction linking
   - Payout service: Automatic transfer recipient creation and settlement
   - API endpoints: GET pending/history, POST request payout, admin batch processing
   - Security: Bank detail validation, minimum threshold (₦1,000)
   - Scheduling: Automated daily/weekly payout job support
   - Audit trail: Complete payout history with Paystack transfer codes

10. **Driver Alerts & Route Optimization** - Google Maps integration for accurate routing
   - Distance Matrix API: Real driving distances with live traffic data
   - Geofencing: 500m radius alerts for pickup/destination zones
   - Route optimization: Multi-waypoint route calculation with turn-by-turn
   - ETA calculation: Dynamic arrival time based on current traffic
   - API endpoints: POST calculate, check-geofence, optimize route

### 🔨 Planned Enhancements
- Advanced analytics with Recharts charts
- Trip history CSV export and PDF receipts
- Audit logging and dispute resolution
