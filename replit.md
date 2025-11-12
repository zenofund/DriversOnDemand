# Draba

## Overview
Draba is a production-ready, full-stack platform designed to connect clients with verified professional drivers in real-time. It features role-based dashboards for drivers, clients, and administrators, offering real-time updates, secure payment processing, and location-based driver search. The project aims to provide a seamless and efficient booking experience, leveraging modern web technologies to ensure scalability and reliability.

## User Preferences
I prefer clear, concise explanations and an iterative development approach. Please ask before implementing major changes or making significant architectural decisions. I value detailed explanations when new features or complex logic are introduced. I also want to make sure the agent does not make changes to the existing folder structure unless explicitly asked.

## System Architecture

### UI/UX Decisions
The platform utilizes React with Vite for a fast Single Page Application experience. Styling is handled by Tailwind CSS for a utility-first approach, complemented by Shadcn UI for accessible and aesthetically pleasing components. Inter and Manrope are used for typography, with a clear hierarchy. Color schemes include primary blue for CTAs, green for success, red for destructive actions, and gray for muted states. Components are designed with consistency, using cards, various button sizes, rounded badges, and stat cards with trend indicators. Spacing is systematically applied across micro, component, section, and page levels.

**Dark Mode:** Full dark mode support with ThemeProvider and localStorage persistence. Theme toggle available in public header and all dashboard sidebars. No flash on load using useLayoutEffect to apply theme before first paint.

**Mobile-First Design:** Progressive responsive padding (p-4 sm:p-6 md:p-8) across all pages. Dashboard sidebar uses Shadcn sidebar primitives with automatic mobile responsiveness - hidden on mobile (< 1024px) with hamburger menu toggle, persistent on desktop (≥ 1024px). DashboardLayout component provides unified responsive structure for all role-based dashboards.

### Technical Implementations
The frontend uses TypeScript for type safety, React Query for server state management with optimized caching, Zustand for global client state, Wouter for routing, and Lucide React for icons. The backend is powered by Supabase, providing a PostgreSQL database with real-time subscriptions and built-in authentication. Express.js serves as the API server, integrating with the Paystack API for payment processing, including split payments. Google Maps API is used for location services, driver tracking, and route optimization, including distance matrix calculations and geofencing.

### Feature Specifications
The platform includes comprehensive features such as:
- **Role-Based Dashboards:** Separate interfaces for drivers, clients, and administrators, each tailored to their specific needs.
- **Driver Settings:** Comprehensive settings page allowing drivers to manage profile information (name, phone, license, hourly rate), bank account details for payouts, and password changes.
- **Driver Availability Toggle:** Drivers can switch between online/offline status via POST /api/drivers/toggle-online endpoint. Status persists in database (`online_status` field) and syncs across app. Only online drivers appear in client searches.
- **Client NIN Verification:** **NEW SECURITY FEATURE** - Mandatory identity verification using Nigerian National Identification Number (NIN) via YouVerify API before clients can book drivers. Prevents fraudulent activities including kidnapping and identity theft. Features include:
  - **Selfie Matching:** Facial biometric verification against government NIN database
  - **Rate Limiting:** Maximum 3 verification attempts within 24 hours
  - **Account Locking:** Automatic lock after failed attempts, requiring admin manual approval
  - **Hashed Storage:** NIN stored as SHA-256 hash, never plaintext
  - **Audit Trail:** Complete verification event logging in nin_verification_events table
  - **Route Guard:** Automatic redirect to /client/verify-nin for unverified clients
  - **Status Tracking:** `nin_verification_state` enum (unverified, pending, verified, locked, pending_manual)
- **Real-time Capabilities:** Leveraging Supabase Realtime for instant updates on driver status, booking requests, and in-app chat messages.
- **Secure Payment Processing:** Integration with Paystack for driver verification fees, upfront client payments (held in escrow), and automatic split payouts to drivers upon trip completion.
- **Driver Verification:** A process involving a one-time payment and profile completion to ensure professional standards.
- **Booking Flow:** Clients search for nearby drivers, confirm bookings, make upfront payments, and track trip progress with real-time updates. Drivers receive and manage booking requests. **NOTE:** Clients MUST verify NIN before accessing booking functionality.
- **Admin Oversight:** Administrators can manage users, monitor platform analytics (drivers, clients, revenue, trips), oversee bookings, track transactions, and manually approve/reject NIN verifications.
- **In-App Chat:** Real-time messaging between drivers and clients, secured with Row-Level Security (RLS).
- **Push Notifications:** OneSignal integration for event-driven alerts.
- **Rating and Review System:** Allows clients to rate and review drivers post-trip.
- **Completion-Based Payouts:** Automatic, commission-based payouts to drivers only after both driver and client confirm trip completion, with race condition prevention and comprehensive logging.
- **Landing Page:** Mobile-first responsive design with streamlined sections (hero, features, CTA). Minimal footer with legal links.

### System Design Choices
- **Database Schema:** Structured with tables for Drivers, Clients, Bookings, Transactions, and Admin Users, with appropriate relationships and JSONB for location data.
- **Authentication:** Supabase Auth for user management, with roles stored in user metadata for access control.
- **Row-Level Security (RLS):** Implemented across all tables to restrict data access based on user roles, ensuring data privacy and security.
- **Real-time Optimization:** Replaced polling with Supabase Realtime subscriptions for instant updates, minimizing redundant fetches with React Query caching, and proper cleanup of subscriptions.
- **Payment Security:** Webhook signature validation, transaction locks, and comprehensive payment status tracking are implemented to ensure secure and reliable financial operations.
- **Idempotency:** Deterministic transfer references for Paystack ensure duplicate transactions are rejected.
- **Input Validation:** Multi-layer validation using Zod schemas on both frontend and backend, with field whitelisting on profile updates to prevent unauthorized field modifications.
- **Bank Account Security:** Bank account updates require Paystack verification (PATCH /api/drivers/bank-account) - drivers cannot inject bank details through the profile endpoint, ensuring all payout accounts are verified before accepting payments.

## Recent Changes (November 12, 2025)

### Client NIN Verification System Implemented:
**Security Feature:** Implemented comprehensive NIN (National Identification Number) verification system using YouVerify API to prevent fraudulent activities and ensure client identity validation before booking.

**Key Components:**
1. **Database Schema:**
   - Extended `clients` table with NIN verification fields: `nin_verification_state`, `nin_verified_at`, `last_attempt_at`, `nin_attempts_count`, `nin_last_confidence`, `nin_reference_id`
   - New `nin_verifications` table: Stores verification attempts with hashed NIN, selfie path, status, confidence score, and metadata
   - New `nin_verification_events` table: Complete audit trail of all verification events

2. **Backend Service (server/services/ninVerificationService.ts):**
   - SHA-256 NIN hashing with per-record salt (never stores plaintext)
   - 3-attempt rate limiting within 24-hour rolling window
   - Automatic account locking after failed attempts
   - YouVerify API integration with selfie matching
   - Comprehensive error handling and logging

3. **API Endpoints:**
   - `POST /api/clients/verify-nin`: Submit NIN + selfie for verification
   - `GET /api/clients/verification-status`: Check current verification state

4. **Frontend Components:**
   - `/client/verify-nin`: Full verification page with camera integration, selfie capture, NIN input, and real-time validation
   - `useNINGuard` hook: Automatic redirect for unverified clients
   - ClientDashboard banner: Prominent verification reminder with CTA
   - Disabled booking search until verified

5. **Security Features:**
   - NIN hashed before storage (SHA-256 + salt)
   - Rate limiting prevents brute force attacks
   - Account lockout requires admin manual approval
   - Complete audit trail for compliance
   - Client consent tracking

**Workflow:** Client signup → Redirect to NIN verification → Enter 11-digit NIN → Capture selfie → YouVerify validation → Verified status → Booking access enabled

### Admin NIN Verification Review UI Implemented:
**Admin Feature:** Complete admin panel interface for manually reviewing and approving/rejecting locked NIN verification accounts. Completes the NIN verification workflow by allowing admin intervention when clients are locked after 3 failed attempts.

**Key Components:**
1. **Backend Endpoints (server/routes.ts):**
   - `GET /api/admin/nin-verifications/pending`: Fetches all clients with 'locked' or 'pending_manual' verification states with latest verification attempt details
   - `POST /api/admin/nin-verifications/:id/review`: Approve/reject verification with admin notes, updates client state, logs audit events

2. **Frontend Admin Page (client/src/pages/admin/NINVerifications.tsx):**
   - Search and filter by client name, email, or phone
   - Stats cards showing total pending, locked accounts, and manual reviews
   - Table view with client info, status badges, attempt counters, confidence scores
   - Review modal with comprehensive verification details and admin notes textarea
   - Approve/Reject actions with React Query mutations and toast notifications

3. **Navigation Integration:**
   - Route `/admin/nin-verifications` added to App.tsx
   - "NIN Verifications" link in admin sidebar with ShieldCheck icon
   - Auto-refresh every 30 seconds for real-time updates

**Admin Workflow:** Admin logs in → Clicks "NIN Verifications" → Reviews locked accounts → Opens client detail modal → Reviews verification info and failure reasons → Adds admin notes → Approves (sets verified) or Rejects (keeps locked, resets attempts) → Audit logged

## Previous Changes (November 11, 2025)

### Critical Bug Fixes Implemented:
1. **Payment-Before-Booking Fix:** Implemented pending_bookings staging table to ensure bookings are only created AFTER successful Paystack payment confirmation via webhook. Uses unique paystack_ref for idempotency protection.

2. **Driver Proximity Filtering:** Updated GET /api/drivers/nearby endpoint to filter drivers within 20km radius using Haversine formula based on client's pickup location coordinates.

3. **Driver Rejection Endpoint:** Added POST /api/bookings/:id/reject endpoint with proper validation. Drivers can reject pending bookings with comprehensive ownership and status checks. Note: Refund handling currently requires manual admin follow-up.

4. **Contact Privacy Protection:** Hidden driver phone numbers on pre-payment pages (BookingConfirm). Contact details only visible to clients after payment_status='paid' on ActiveBooking page.

### Pending Enhancements:
1. **Automated Refund System:** Implement Paystack refund API integration and add refund_status tracking (refunds table or transaction field) to handle driver rejections of paid bookings automatically.

2. **Auto-Complete After 12 Hours:** Implement scheduled task to auto-complete bookings when one party confirms but the other doesn't respond within 12 hours. Requires:
   - Add first_confirmed_at field to bookings table
   - Hourly cron job to query stalled bookings
   - Auto-set both confirmations and process payout
   - Audit logging and notifications

3. **Pending Bookings Cleanup:** Schedule cleanup_expired_pending_bookings() function (pg_cron or server cron) to automatically remove expired pending_bookings (>1 hour old).

## External Dependencies
- **Supabase:** Database, Authentication, and Realtime functionalities.
- **Paystack:** Payment gateway for processing all financial transactions, including driver verification, client payments, and split payouts.
- **Google Maps API:** Location services, driver tracking, places autocomplete, distance matrix calculations, and geofencing.
- **YouVerify:** Identity verification API for NIN verification with facial biometric matching against Nigerian government databases.
- **OneSignal:** Push notification service for real-time alerts to users.