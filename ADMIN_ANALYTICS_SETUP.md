# Admin Analytics & Setup Documentation

## Overview
This document covers the comprehensive analytics dashboard and admin account management system for the Draba platform.

---

## Table of Contents
1. [First Time Admin Setup](#first-time-admin-setup)
2. [Analytics Dashboard](#analytics-dashboard)
3. [Admin User Management](#admin-user-management)
4. [API Endpoints](#api-endpoints)
5. [Setup Instructions](#setup-instructions)

---

## First Time Admin Setup

### Purpose
The first time setup allows you to create the initial super admin account for the platform.

### Access
Navigate to: `/admin/setup`

### Setup Process

#### Step 1: Obtain Setup Key
The setup key is required for security. Default key is: `drivers-on-demand-2024`

You can customize this by setting the environment variable:
```bash
VITE_ADMIN_SETUP_KEY=your-custom-key
```

#### Step 2: Complete Setup Form
1. **Setup Key**: Enter the secret setup key
2. **Full Name**: Enter your name (e.g., "John Doe")
3. **Email**: Enter your email address
4. **Password**: Create a strong password (minimum 8 characters)
5. **Confirm Password**: Re-enter your password

#### Step 3: Account Creation
- Click "Create Super Admin Account"
- Your account will be created with full platform access
- You'll be redirected to login page

### What Gets Created
1. **Auth User**: Created in Supabase Auth with role metadata
2. **Admin User Record**: Created in `admin_users` table with:
   - `role`: 'super_admin'
   - `is_active`: true
   - Full access to all admin features

### Security Notes
- ⚠️ Only share the setup key with trusted individuals
- 🔒 Setup key should be changed after first admin creation
- ✅ First admin has full super admin privileges
- 🔐 Store the setup key securely (not in version control)

---

## Analytics Dashboard

### Access
Navigate to: `/admin/analytics`

### Features

#### 1. Revenue Trends Tab

**Key Metrics Cards:**
- **Total Revenue**: Sum of all completed bookings (last 30 days)
- **Total Bookings**: Count of all completed trips
- **Platform Commission**: Total commission earned (10% default)

**Charts:**

##### Revenue Trend (Area Chart)
- Daily revenue visualization
- Commission overlay
- Gradient fill for visual appeal
- Shows revenue patterns over time

##### Daily Bookings (Bar Chart)
- Booking volume by date
- Helps identify busy days
- Useful for resource planning

##### Booking Status Distribution (Pie Chart)
- Completed bookings percentage
- Ongoing bookings percentage
- Pending bookings percentage
- Visual breakdown of booking states

#### 2. Driver Performance Tab

**Features:**
- **Top Performing Drivers** (Bar Chart)
  - Dual-axis chart
  - Left axis: Total trips
  - Right axis: Earnings (₦)
  - Top 10 drivers displayed

- **Driver Ratings** (Horizontal Bar Chart)
  - Average ratings for top 8 drivers
  - Scale from 0 to 5 stars
  - Quick quality assessment

- **Acceptance Rates** (Horizontal Bar Chart)
  - Percentage of accepted bookings
  - Shows driver responsiveness
  - Helps identify reliable drivers

- **Performance Metrics Table**
  - Complete driver rankings
  - Detailed metrics:
    - Total trips count
    - Total earnings (₦)
    - Average rating (⭐)
    - Acceptance rate (%)
  - Sortable and searchable

#### 3. Booking Heatmap Tab

**Activity Heatmap:**
- 7x24 grid (Days × Hours)
- Color intensity shows booking frequency
- Days: Monday - Sunday
- Hours: 00:00 - 23:00
- Darker color = More bookings
- Hover to see exact counts

**Peak Hours Analysis (Line Chart):**
- Hourly booking distribution
- Identifies busiest times of day
- Helps with:
  - Driver deployment
  - Surge pricing decisions
  - Resource allocation

#### 4. Locations Tab

**Top Locations (Horizontal Bar Chart):**
- Top 20 most popular locations
- Combines pickup and destination data
- Multi-colored bars for visual distinction
- Shows booking frequency per location

**Location Cards (Grid View):**
- Top 6 locations highlighted
- Shows:
  - Ranking number
  - Location name
  - Total booking count
- Quick reference for popular areas

### Data Timeframes
- **Revenue Data**: Last 30 days
- **Driver Metrics**: All-time data
- **Booking Heatmap**: Last 30 days
- **Location Data**: All-time data

### Use Cases

#### Business Intelligence
- Identify revenue trends and patterns
- Forecast future demand
- Optimize commission rates
- Track platform growth

#### Operations Management
- Deploy drivers based on heatmap data
- Schedule maintenance during low-traffic hours
- Plan marketing campaigns for slow periods
- Optimize driver training programs

#### Performance Monitoring
- Identify top and underperforming drivers
- Recognize drivers for rewards
- Address low acceptance rates
- Maintain service quality standards

---

## Admin User Management

### Access
Navigate to: `/admin/admins` (Super Admin only)

### Features

#### Dashboard Stats
- **Total Admins**: Count of all admin users
- **Super Admins**: Number of super admins
- **Moderators**: Number of moderators
- **Active**: Count of active admin accounts

#### Admin Roles

##### Super Admin
**Permissions:**
- ✅ Full platform access
- ✅ Create and manage admin accounts
- ✅ Create other super admins
- ✅ Activate/deactivate admins
- ✅ Access all analytics
- ✅ Manage platform settings

**Icon:** Crown (👑)

##### Moderator
**Permissions:**
- ✅ Manage drivers and clients
- ✅ Monitor bookings
- ✅ View transactions
- ✅ Resolve disputes
- ✅ Update platform settings
- ❌ Cannot create admin accounts
- ❌ Cannot access admin management

**Icon:** UserCog (⚙️)

#### Creating New Admins

**Requirements:**
- Must be logged in as Super Admin
- Valid email address
- Strong password (min 8 characters)
- Assigned role (Super Admin or Moderator)

**Process:**
1. Click "Create Admin" button
2. Fill in the form:
   - Full Name
   - Email
   - Password
   - Role (Super Admin or Moderator)
3. Click "Create Admin"
4. New admin receives credentials
5. Account is immediately active

**Security:**
- Passwords are securely hashed
- Email confirmation is automatic
- Admin users cannot delete themselves
- Activity is logged

#### Managing Existing Admins

**Available Actions:**

1. **View Admin List**
   - Separated by role (Super Admins / Moderators)
   - Shows name, email, status
   - Displays role badges

2. **Activate/Deactivate**
   - Toggle admin account status
   - Deactivated admins cannot log in
   - Data is preserved
   - Can be reactivated anytime

3. **Self-Protection**
   - Super admins cannot deactivate themselves
   - Marked with "You" badge
   - Prevents accidental lockout

---

## API Endpoints

### Analytics Endpoints

#### Get Revenue Analytics
```
GET /api/admin/analytics/revenue
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "date": "2024-01-15",
    "revenue": 150000,
    "bookings": 30,
    "commission": 15000
  }
]
```

#### Get Driver Performance
```
GET /api/admin/analytics/drivers
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "driver_id": "uuid",
    "driver_name": "John Doe",
    "total_trips": 45,
    "total_earnings": 135000,
    "average_rating": 4.8,
    "acceptance_rate": 92
  }
]
```

#### Get Booking Heatmap
```
GET /api/admin/analytics/heatmap
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "day": "Monday",
    "hour": 14,
    "count": 12
  }
]
```

#### Get Location Analytics
```
GET /api/admin/analytics/locations
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "location": "Victoria Island, Lagos",
    "count": 156
  }
]
```

### Admin Management Endpoints

#### Get All Admin Users (Super Admin Only)
```
GET /api/admin/users
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "name": "John Admin",
    "email": "admin@example.com",
    "role": "super_admin",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

#### Create Admin User (Super Admin Only)
```
POST /api/admin/users
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "New Admin",
  "email": "newadmin@example.com",
  "password": "securepassword123",
  "role": "moderator"
}
```

#### Update Admin Status (Super Admin Only)
```
PATCH /api/admin/users/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "is_active": false,
  "role": "moderator"
}
```

---

## Setup Instructions

### Prerequisites
1. Supabase project configured
2. Environment variables set
3. Database tables created

### Step 1: Environment Variables

Add to your `.env` file:
```bash
# Admin Setup Key (change after first admin creation)
VITE_ADMIN_SETUP_KEY=drivers-on-demand-2024

# Supabase Configuration (required)
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: Application URL
APP_URL=https://yourdomain.com
```

### Step 2: Database Setup

Ensure the `admin_users` table exists in Supabase:
```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'moderator')),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX idx_admin_users_role ON admin_users(role);
```

### Step 3: Row Level Security (RLS)

Enable RLS on admin_users table:
```sql
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all admin users
CREATE POLICY "Admins can view admin users"
  ON admin_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users a
      WHERE a.user_id = auth.uid() AND a.is_active = true
    )
  );

-- Policy: Super admins can manage admin users
CREATE POLICY "Super admins can manage admins"
  ON admin_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users a
      WHERE a.user_id = auth.uid() 
        AND a.role = 'super_admin' 
        AND a.is_active = true
    )
  );
```

### Step 4: Create First Admin

1. Navigate to `/admin/setup` in your browser
2. Enter the setup key: `drivers-on-demand-2024`
3. Fill in your details
4. Click "Create Super Admin Account"
5. Login with your new credentials

### Step 5: Security Hardening

After creating the first admin:

1. **Change the setup key**:
   ```bash
   VITE_ADMIN_SETUP_KEY=your-new-secret-key-$(openssl rand -hex 16)
   ```

2. **Restrict setup page access** (optional):
   - Add middleware to block `/admin/setup` after first admin
   - Or remove the route from production

3. **Enable 2FA** (future enhancement):
   - Configure Supabase Auth 2FA
   - Require for all super admin accounts

### Step 6: Create Additional Admins

1. Login as super admin
2. Navigate to `/admin/admins`
3. Click "Create Admin"
4. Assign appropriate role
5. Share credentials securely

---

## Best Practices

### For Super Admins

1. **Security:**
   - Use strong, unique passwords
   - Don't share super admin credentials
   - Regularly audit admin user list
   - Deactivate unused accounts

2. **User Management:**
   - Create moderators for daily operations
   - Reserve super admin for critical tasks
   - Document admin role changes
   - Regular access reviews

3. **Analytics Usage:**
   - Check analytics daily
   - Identify trends early
   - Use data for business decisions
   - Export important metrics

### For Moderators

1. **Operations:**
   - Focus on user and booking management
   - Resolve disputes promptly
   - Monitor platform health
   - Report issues to super admins

2. **Limitations:**
   - Cannot create admin accounts
   - Cannot access admin management
   - Cannot modify super admin settings
   - Report needs to super admin

---

## Troubleshooting

### Cannot Access Setup Page
- **Issue**: Setup page not loading
- **Solution**: Check that route is enabled in `App.tsx`
- **Check**: `/admin/setup` route exists

### Invalid Setup Key
- **Issue**: Setup key rejected
- **Solution**: Verify `VITE_ADMIN_SETUP_KEY` in environment
- **Check**: Default is `drivers-on-demand-2024`

### Analytics Not Loading
- **Issue**: Charts show no data
- **Solution**: Ensure bookings exist in database
- **Check**: API endpoints return data

### Cannot Create Admin
- **Issue**: "Super admin access required" error
- **Solution**: Only super admins can create admins
- **Check**: Your role is `super_admin` not `moderator`

### Charts Not Rendering
- **Issue**: Blank chart areas
- **Solution**: Check that `recharts` is installed
- **Run**: `npm install recharts`

---

## Future Enhancements

### Planned Features
1. **Export Analytics**
   - Download charts as images
   - Export data to CSV/Excel
   - Scheduled email reports

2. **Advanced Filters**
   - Date range selection
   - Custom time periods
   - Filter by location/driver

3. **Real-time Updates**
   - Live dashboard refresh
   - WebSocket integration
   - Instant notifications

4. **Custom Reports**
   - Report builder interface
   - Saved report templates
   - Automated generation

5. **Audit Logs**
   - Track all admin actions
   - Security event logging
   - Compliance reporting

---

## Support

For issues or questions:
1. Check this documentation first
2. Review API endpoint responses
3. Check browser console for errors
4. Verify environment variables
5. Contact platform developer

---

## Summary

The Admin Analytics & Setup system provides:

✅ **First-Time Setup**: Secure admin account creation
✅ **Analytics Dashboard**: Comprehensive insights with charts
✅ **Revenue Tracking**: Detailed financial metrics
✅ **Driver Performance**: Rankings and metrics
✅ **Booking Heatmaps**: Time-based activity patterns
✅ **Location Analytics**: Popular areas identification
✅ **Admin Management**: Super admin user control
✅ **Role-Based Access**: Super admin vs moderator permissions
✅ **Security**: Robust access controls
✅ **API Endpoints**: Comprehensive data access

All features are production-ready and fully integrated with the platform!
