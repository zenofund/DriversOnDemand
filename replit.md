# Draba

## Overview
Draba is a production-ready, full-stack platform connecting clients with verified professional drivers in real-time. It features role-based dashboards for drivers, clients, and administrators, offering real-time updates, secure payment processing, and location-based driver search. The project aims to provide a seamless and efficient booking experience, leveraging modern web technologies for scalability and reliability.

## Recent Changes (November 12, 2025)
- **Booking Completion UX Enhancement**: Added "Complete Request" buttons for both drivers and clients on accepted/ongoing trips, allowing early trip completion
- **Review Button Implementation**: Added "Review Driver" button on client's My Bookings page, visible only after both parties confirm trip completion
- **Button Placement Optimization**: Reorganized Chat and Complete Request buttons to appear together for better UX consistency
- **Payment Verification Bug Fixes**: Corrected apiRequest signature usage, implemented frontend ref-based locks to prevent duplicate payment processing
- **Backend Idempotency**: Enhanced duplicate payment handling with early transaction checks and graceful cleanup

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