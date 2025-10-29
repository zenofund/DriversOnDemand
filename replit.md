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
- Split payment tracking
- Settlement status

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
- `refetchInterval: 15000` for booking updates (not every render)
- Proper dependency arrays in useEffect to avoid infinite loops
- Realtime subscription cleanup on component unmount

## Payment Integration

### Paystack Setup
1. Driver verification: One-time ₦5,000 fee
2. Booking payments: Dynamic pricing based on hourly rate × duration
3. Split payments: 90% to driver, 10% platform commission
4. Webhook verification with signature validation
5. Transaction records for reconciliation

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

## Future Enhancements

- Push notifications via OneSignal
- In-app chat between driver and client
- Advanced analytics with charts (Recharts)
- Batch payout processing
- Rating and review system
- Trip history export
- Geofencing alerts
- Route optimization
