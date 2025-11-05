# Admin System Documentation

## Overview
A comprehensive administrative oversight system has been fully implemented for the Drivers On Demand platform. This system provides administrators with complete control over platform operations, user management, analytics, and dispute resolution.

## Features Implemented

### 1. Admin Dashboard (`/admin/dashboard`)
**Location**: `/client/src/pages/admin/AdminDashboard.tsx`

**Features**:
- **Real-time KPI Metrics**:
  - Active Drivers count
  - Total Clients count
  - Total Revenue tracking
  - Commission Earned analytics
  
- **Trip Analytics**:
  - Today's trips count
  - Monthly trips count
  
- **Quick Action Cards**:
  - User Management access
  - Bookings overview access
  - Transactions tracking access
  - Dispute resolution access
  
- **Real-time Updates**:
  - Subscribes to database changes via Supabase Realtime
  - Auto-refreshes stats when bookings, drivers, or clients change

---

### 2. User Management (`/admin/users`)
**Location**: `/client/src/pages/admin/Users.tsx`

**Features**:
- **Dual User Type Management**:
  - Drivers tab with full details
  - Clients tab with full details
  
- **Driver Management**:
  - View all drivers with comprehensive details (name, email, phone, license, status)
  - Verify drivers manually (admin override)
  - Monitor online/offline status
  - Track ratings and total trips
  - View hourly rates
  - Search/filter functionality
  
- **Client Management**:
  - View all clients
  - Monitor verification status
  - Track registration dates
  - Search/filter functionality
  
- **Statistics Dashboard**:
  - Total drivers count
  - Verified drivers count
  - Total clients count
  - Online drivers count

---

### 3. Bookings Management (`/admin/bookings`)
**Location**: `/client/src/pages/admin/Bookings.tsx`

**Features**:
- **Comprehensive Booking Oversight**:
  - View all platform bookings
  - Filter by location, driver, or client
  - Monitor booking status (pending, ongoing, completed, cancelled)
  - Track payment status
  
- **Booking Details**:
  - Date and time
  - Client and driver information
  - Route details (pickup and destination)
  - Distance and duration
  - Cost breakdown
  
- **Analytics**:
  - Total bookings count
  - Status-based statistics (pending, ongoing, completed, cancelled)
  - Total revenue calculation

---

### 4. Transaction Tracking (`/admin/transactions`)
**Location**: `/client/src/pages/admin/Transactions.tsx`

**Features**:
- **Complete Transaction History**:
  - All platform transactions
  - Paystack reference numbers
  - Transaction types (booking, verification)
  
- **Revenue Analytics**:
  - Total transaction volume
  - Platform revenue (commission)
  - Driver earnings
  - Settled vs pending transactions
  
- **Transaction Details**:
  - Date and reference
  - Driver information
  - Amount breakdown (total, driver share, platform share)
  - Settlement status
  
- **Search & Filter**:
  - Search by reference number
  - Filter by driver

---

### 5. Dispute Resolution System (`/admin/disputes`)
**Location**: `/client/src/pages/admin/Disputes.tsx`

**Admin Side Features**:
- **Dispute Management**:
  - View all user disputes
  - Update dispute status (open, investigating, resolved, closed)
  - Set priority levels (low, medium, high, urgent)
  - Add internal admin notes
  - Provide resolution descriptions
  
- **Dispute Analytics**:
  - Total disputes count
  - Open disputes
  - Under investigation
  - Resolved disputes
  - Urgent disputes
  
- **Dispute Details**:
  - Reporter role (driver or client)
  - Dispute type (payment, service quality, cancellation, other)
  - Full description
  - Timeline tracking

**User Side Features** (Component: `DisputeDialog.tsx`):
- Users (drivers and clients) can file disputes for their bookings
- Select dispute type
- Provide detailed description
- Automatic status tracking

---

### 6. Platform Settings (`/admin/settings`)
**Location**: `/client/src/pages/admin/Settings.tsx`

**Features**:
- **Commission Management**:
  - Set platform commission percentage (0-100%)
  - Real-time split calculation preview
  - Example revenue breakdown
  
- **Settings Include**:
  - Commission percentage configuration
  - Live preview of revenue splits
  - Example calculations for ₦10,000 booking
  
- **Platform Information**:
  - Admin role display
  - Platform status
  - Payment gateway info (Paystack)
  - Database info (Supabase)

---

## API Endpoints

### Admin Stats
- `GET /api/admin/stats` - Get dashboard statistics
- `GET /api/admin/recent-bookings` - Get recent bookings

### User Management
- `GET /api/admin/drivers` - Get all drivers
- `GET /api/admin/clients` - Get all clients
- `PATCH /api/admin/drivers/:id` - Update driver (verify, etc.)

### Bookings Management
- `GET /api/admin/bookings` - Get all bookings with driver and client details

### Transaction Tracking
- `GET /api/admin/transactions` - Get all transactions with details

### Dispute Management
- `GET /api/admin/disputes` - Get all disputes
- `PATCH /api/admin/disputes/:id` - Update dispute status
- `POST /api/disputes` - Create dispute (user endpoint)
- `GET /api/disputes` - Get user's disputes

### Settings
- `GET /api/admin/settings` - Get platform settings
- `PUT /api/admin/settings/commission` - Update commission percentage

---

## Database Schema

### Disputes Table
**Location**: `/migrations/003_add_disputes_table.sql`

```sql
CREATE TABLE disputes (
  id UUID PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id),
  reported_by_user_id UUID REFERENCES auth.users(id),
  reported_by_role TEXT ('driver' | 'client'),
  dispute_type TEXT ('payment' | 'service_quality' | 'cancellation' | 'other'),
  description TEXT NOT NULL,
  status TEXT ('open' | 'investigating' | 'resolved' | 'closed'),
  priority TEXT ('low' | 'medium' | 'high' | 'urgent'),
  admin_notes TEXT,
  resolution TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Platform Settings Table
**Already exists in schema** (`platform_settings`)

```sql
CREATE TABLE platform_settings (
  id UUID PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
);
```

---

## Security & Access Control

### Row Level Security (RLS)
All admin endpoints are protected with:
1. Authentication check (valid JWT token)
2. Admin role verification (check `admin_users` table)
3. Active admin status check (`is_active = TRUE`)

### Dispute Policies
- Users can view their own disputes
- Users can create disputes for their bookings only
- Admins can view and manage all disputes
- Automatic tracking of who resolved disputes

---

## Navigation Structure

### Admin Sidebar Menu
1. **Dashboard** - Overview and analytics
2. **Users** - Manage drivers and clients
3. **Bookings** - Monitor all bookings
4. **Transactions** - Track revenue and payments
5. **Disputes** - Resolve user issues
6. **Settings** - Configure platform settings

---

## User Experience Improvements

### Search & Filter Functionality
- All admin pages include search bars
- Real-time filtering of data
- Multi-field search (name, email, phone, etc.)

### Visual Indicators
- Status badges (online/offline, verified/unverified)
- Color-coded priorities (urgent, high, medium, low)
- Payment status indicators
- Booking status badges

### Quick Actions
- Direct navigation cards on dashboard
- One-click actions (verify driver, update dispute)
- Inline editing where appropriate

### Real-time Updates
- Dashboard subscribes to database changes
- Automatic data refresh on updates
- Live statistics

---

## Usage Instructions

### For Super Admins

#### Managing Users
1. Navigate to "Users" from sidebar
2. Use tabs to switch between Drivers and Clients
3. Search users using the search bar
4. Click "Verify" button to manually verify drivers

#### Monitoring Bookings
1. Go to "Bookings" page
2. View all bookings with full details
3. Use search to filter by location, driver, or client
4. Monitor status and payment information

#### Tracking Revenue
1. Open "Transactions" page
2. View platform revenue breakdown
3. Monitor settled vs pending transactions
4. Search by reference or driver

#### Resolving Disputes
1. Access "Disputes" page
2. Click "Manage" on any dispute
3. Update status (open → investigating → resolved)
4. Set priority level
5. Add admin notes for internal tracking
6. Provide resolution description for user

#### Configuring Commission
1. Navigate to "Settings"
2. Enter new commission percentage
3. Preview the revenue split
4. Click "Update Commission"
5. Changes apply to all new bookings immediately

---

## Commission System

### How It Works
1. Commission is set as a percentage (default: 10%)
2. Applied automatically on booking completion
3. Calculated when both driver and client confirm completion
4. Split is recorded in transactions table:
   - `platform_share` - Platform commission
   - `driver_share` - Driver earnings
   
### Example
For a ₦10,000 booking with 10% commission:
- Platform receives: ₦1,000 (10%)
- Driver receives: ₦9,000 (90%)

---

## Dispute Resolution Workflow

### User Files Dispute
1. User clicks "Report Issue" on a booking
2. Selects dispute type
3. Provides detailed description
4. Dispute created with status "open" and priority "medium"

### Admin Manages Dispute
1. Admin views dispute in Disputes page
2. Updates status to "investigating"
3. May adjust priority if urgent
4. Adds internal notes
5. Resolves issue (status → "resolved")
6. Provides resolution text for user

### Resolution Tracking
- Automatic timestamp when resolved
- Admin who resolved is tracked
- User receives resolution description

---

## Technical Details

### State Management
- Uses Zustand for auth state
- React Query for server state
- Optimistic updates where appropriate

### Real-time Features
- Supabase Realtime subscriptions
- Auto-refresh on data changes
- Live statistics updates

### Performance Optimizations
- Query result caching
- Pagination ready (currently shows all)
- Efficient search/filter algorithms

---

## Future Enhancements (Suggestions)

1. **Analytics Dashboard**
   - Charts and graphs for revenue trends
   - Driver performance metrics
   - Booking heatmaps

2. **Bulk Operations**
   - Bulk verify drivers
   - Bulk dispute resolution
   - Export data to CSV

3. **Email Notifications**
   - Notify users of dispute status changes
   - Alert admins of urgent disputes
   - Weekly revenue reports

4. **Advanced Filters**
   - Date range filters
   - Multi-select status filters
   - Custom saved filters

5. **Audit Logs**
   - Track all admin actions
   - View change history
   - Compliance reporting

---

## Migration Instructions

### Database Migration
Run the following migration to add the disputes table:

```bash
# Execute the SQL migration file
psql -d your_database < migrations/003_add_disputes_table.sql
```

Or in Supabase Dashboard:
1. Go to SQL Editor
2. Paste contents of `003_add_disputes_table.sql`
3. Execute query

### Environment Variables
No new environment variables required. Uses existing:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PAYSTACK_SECRET_KEY`

---

## Support & Maintenance

### Monitoring
- Check admin dashboard daily for platform health
- Monitor dispute queue regularly
- Review transaction settlements

### Best Practices
- Respond to disputes within 24 hours
- Review and adjust commission as needed
- Verify new drivers promptly
- Keep admin notes detailed for future reference

---

## Summary

The admin system provides complete oversight and control over the platform with:
- ✅ User management (drivers & clients)
- ✅ Booking oversight with full details
- ✅ Transaction tracking and revenue analytics
- ✅ Dispute resolution (both admin and user-facing)
- ✅ Platform settings (commission configuration)
- ✅ Real-time analytics and statistics
- ✅ Search and filter functionality
- ✅ Comprehensive API endpoints
- ✅ Secure access control
- ✅ Modern, intuitive UI

All features are production-ready and fully integrated with the existing platform infrastructure.
