# Draba

## Overview
Draba is a production-ready, full-stack platform connecting clients with verified professional drivers in real-time. It features role-based dashboards for drivers, clients, and administrators, offering real-time updates, secure payment processing, and location-based driver search. The project aims to provide a seamless and efficient booking experience, leveraging modern web technologies for scalability and reliability.

## Recent Changes

### November 13, 2025
- **OneSignal Push Notifications Integration**: Implemented complete push notification system
  - Backend: Player ID registration, notification preferences API, notification logs retrieval
  - Notification triggers: booking events, payment alerts, and chat messages
  - Frontend: OneSignal SDK initialization, automatic player ID registration/cleanup
  - Settings UI: Toggle switches for notification preferences in both client and driver Settings pages
- **Notification Preferences UI Bug Fix**: Fixed toggle switches not reflecting saved preferences
  - Root cause: Duplicate API endpoints with mismatched field names (old: `push_enabled`, `booking_updates` vs new: `booking_notifications`, `payment_notifications`)
  - Solution: Removed duplicate legacy endpoints, keeping only correct ones that match frontend expectations
  - Impact: Notification preferences now correctly sync between UI and backend
- **Driver Metrics Critical Bug Fixes**: Fixed two major bugs preventing accurate driver stats in discovery view
  - **total_trips Counter**: Now properly increments when bookings are completed (was always showing 0)
  - **Rating Calculation**: Fixed to only include client→driver ratings (was incorrectly mixing driver→client ratings from 2-way rating system)
  - Impact: Driver discovery now shows accurate trip counts and ratings
- **Pending Earnings Data Structure Fix**: Updated Earnings page frontend to correctly consume backend API response structure, fixing ₦0 display bug
- **Driver History Page Crash Fix**: Added null safety for total_fare field preventing "Cannot read properties of undefined" error
- **Missing Import Fix**: Added CheckCircle icon import to DriverDashboard preventing LSP errors
- **Database Migration 010 (⚠️ PENDING MANUAL APPLICATION)**: Created migration to add `driver_confirmed_at` and `client_confirmed_at` TIMESTAMPTZ columns to bookings table with partial indexes for performance optimization
- **Client Approval/Decline UI Implementation**: Added "Approve Request" (green) and "Decline Request" (red) buttons to client MyBookings page, visible when driver confirms completion but client hasn't
- **Dispute Dialog Integration**: Decline button opens modal requiring minimum 10-character reason, which creates service_quality dispute via `/api/disputes` endpoint
- **Approval Payment Flow**: Approve button triggers `/api/bookings/:id/client-confirm` endpoint to set client_confirmed_at timestamp and process payment
- **Chat Button Fix**: Verified chat button is properly visible for accepted/ongoing bookings, routing to `/client/chat/:bookingId`
- **Button Visibility Logic**: Approve/Decline buttons show when `driver_confirmed && !client_confirmed`, implementing driver-first completion workflow
- **Review Button Gating**: "Review Driver" button appears only after both parties confirm completion (`client_confirmed && driver_confirmed`)
- **Rating System Fix**: Fixed POST /api/ratings 500 errors by updating booking_status to 'completed' when both parties confirm, enabling rating submission
- **Rater Role Field Implementation**: Added rater_role='client' to ratings insertion, resolving NOT NULL constraint violation from migration 009's 2-way rating schema
- **Duplicate Rating Check Update**: Modified existing rating check to include rater_role field, allowing both client and driver to rate the same booking independently
- **Confirmation Timestamp Tracking**: Both driver-confirm and client-confirm endpoints now populate driver_confirmed_at and client_confirmed_at timestamp columns for audit trail
- **Enhanced Error Logging**: Added console.error logging to ratings endpoint for better debugging of future issues
- **Booking Status Automation**: When either party is the second to confirm, booking_status automatically changes from 'ongoing' to 'completed', triggering payment processing
- **Toast Notification System Upgrade**: Redesigned minimal toast notifications with 3-second auto-dismiss, backdrop blur, success/error variants, and modern styling
- **Profile Picture Upload Fix (⚠️ REQUIRES STORAGE SETUP)**: Created migration 011 to set up Supabase Storage bucket for profile pictures with proper RLS policies. User must run this migration in Supabase SQL Editor - see SETUP_PROFILE_PICTURES.md for 2-minute setup guide
- **Enhanced Upload Error Messages**: Profile picture upload now shows detailed error messages instead of generic "Failed to upload image"
- **Dashboard Responsiveness**: Refactored all 18 dashboard pages to use Shadcn sidebar primitives with mobile-first design - sidebar hidden on mobile (<1024px) with hamburger toggle, persistent on desktop (≥1024px)
- **Ratings System Fix**: Added `rater_role: 'client'` field to POST /api/ratings endpoint to comply with database schema updates from migration 009
- **Missing Package Fix**: Installed svix package dependency for email webhook signature verification

### November 12, 2025
- **Booking Completion UX Enhancement**: Added "Complete Request" buttons for both drivers and clients on accepted/ongoing trips, allowing early trip completion
- **Review Button Implementation**: Added "Review Driver" button on client's My Bookings page, visible only after both parties confirm trip completion
- **Button Placement Optimization**: Reorganized Chat and Complete Request buttons to appear together for better UX consistency
- **Payment Verification Bug Fixes**: Corrected apiRequest signature usage, implemented frontend ref-based locks to prevent duplicate payment processing
- **Backend Idempotency**: Enhanced duplicate payment handling with early transaction checks and graceful cleanup
- **Real-time Sync Fix**: Migration 009 adds SELECT RLS policies on bookings table, enabling clients/drivers to see each other's completion confirmations in real-time via Supabase Realtime
- **2-Way Ratings Support**: Migration 009 adds rater_role enum to ratings table, allowing both clients and drivers to rate each other
- **Client Approval/Decline Workflow**: When driver confirms completion, client sees "Approve Request" (triggers payment) or "Decline Request" (creates dispute and blocks payment)
- **Dispute System Integration**: Clients can decline completion with a required reason (min 10 chars), creating a service quality dispute that prevents payment finalization
- **12-Hour Auto-Complete Worker**: Background job runs every 15 minutes, automatically confirms client-side completion for bookings where driver confirmed >12 hours ago (skips disputed bookings), then triggers payment processing
- **Payment Blocking During Disputes**: Backend `/api/bookings/:id/client-confirm` endpoint checks for open disputes and blocks payment processing until dispute is resolved
- **Driver Navigation Maps**: Embedded Google Maps on Active Bookings page showing driver location (blue), pickup (green), destination (red) with route visualization
- **Context-Aware Route Display**: RouteMap component switches between driver→pickup (accepted status) and driver→destination (ongoing status) automatically
- **Navigation Buttons**: One-tap Google Maps deep linking for turn-by-turn navigation to pickup or destination based on booking status
- **Real-time ETA Calculation**: Live distance and traffic-aware ETA updates every minute, showing km distance and time remaining to next waypoint
- **Google Maps API Fix**: Resolved "google.maps.importLibrary is not installed" error by migrating from Loader class to modern setOptions + importLibrary pattern, with proper cancellation handling and cleanup in React components

## User Preferences
I prefer clear, concise explanations and an iterative development approach. Please ask before implementing major changes or making significant architectural decisions. I value detailed explanations when new features or complex logic are introduced. I also want to make sure the agent does not make changes to the existing folder structure unless explicitly asked.

## System Architecture

### UI/UX Decisions
The platform uses React with Vite for a fast Single Page Application experience, styled with Tailwind CSS and Shadcn UI. Typography uses Inter and Manrope, with a defined color scheme. Components are designed for consistency, including cards, buttons, badges, and stat cards. Full dark mode support is implemented with `ThemeProvider` and `localStorage` persistence, ensuring no flash on load. A mobile-first design approach is applied across all pages, with responsive padding and a flexible dashboard sidebar.

### Technical Implementations
The frontend uses TypeScript, React Query for server state, Zustand for client state, Wouter for routing, and Lucide React for icons. The backend is powered by Supabase (PostgreSQL, real-time, auth), with Express.js as the API server. Paystack handles payment processing, and Google Maps API provides location services, driver tracking, and route optimization. A critical new security feature includes mandatory Client NIN Verification via YouVerify API, preventing fraud with selfie matching, rate limiting, and hashed storage of NINs. An email notification system using Resend is implemented for transactional communications, with database logging and webhook handling.

### Feature Specifications
Key features include:
- **Role-Based Dashboards:** Tailored interfaces for drivers, clients, and administrators.
- **Driver Management:** Profile, bank account, and availability toggle.
- **Client NIN Verification:** Mandatory identity verification via YouVerify API before booking, with selfie matching, rate limiting, and account locking.
- **Real-time Capabilities:** Instant updates on driver status, booking requests, and chat via Supabase Realtime.
- **Secure Payment Processing:** Paystack integration for fees, escrow, and split payouts.
- **Driver Verification:** Process for professional standards.
- **Booking Flow:** Client search, booking, payment, and real-time tracking.
- **Admin Oversight:** User management, analytics, booking, transaction monitoring, and manual NIN verification approval.
- **In-App Chat:** Real-time messaging between drivers and clients with RLS.
- **Push Notifications:** OneSignal integration.
- **Rating and Review System:** Post-trip feedback.
- **Completion-Based Payouts:** Automatic, commission-based payouts upon trip completion confirmation.
- **Landing Page:** Mobile-first responsive design.

### System Design Choices
- **Database Schema:** Structured tables for core entities with JSONB for location data.
- **Authentication:** Supabase Auth with role-based access control.
- **Row-Level Security (RLS):** Implemented across tables for data privacy.
- **Real-time Optimization:** Supabase Realtime subscriptions replace polling.
- **Payment Security:** Webhook signature validation, transaction locks, and idempotency.
- **Input Validation:** Zod schemas for multi-layer frontend and backend validation.
- **Bank Account Security:** Paystack verification required for bank account updates.
- **Email System:** Resend integration with email logging, retry logic, Svix signature verification for webhooks, and RLS for admin access to logs.

## External Dependencies
- **Supabase:** Database, Authentication, Realtime.
- **Paystack:** Payment gateway for all financial transactions.
- **Google Maps API:** Location services, tracking, and route optimization.
- **YouVerify:** Identity verification API for NIN verification.
- **OneSignal:** Push notification service.
- **Resend:** Email notification service.