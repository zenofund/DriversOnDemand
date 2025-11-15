# Draba

## Overview
Draba is a production-ready, full-stack platform designed to connect clients with verified professional drivers in real-time. It offers role-based dashboards for drivers, clients, and administrators, featuring real-time updates, secure payment processing, and location-based driver search. The project's core purpose is to provide a seamless, efficient, and reliable booking experience, leveraging modern web technologies for scalability and robust performance. It aims to streamline transportation services through an intuitive platform, ensuring both client satisfaction and driver efficiency.

## User Preferences
I prefer clear, concise explanations and an iterative development approach. Please ask before implementing major changes or making significant architectural decisions. I value detailed explanations when new features or complex logic are introduced. I also want to make sure the agent does not make changes to the existing folder structure unless explicitly asked.

## System Architecture

### UI/UX Decisions
The platform utilizes React with Vite, styled with Tailwind CSS and Shadcn UI, for a fast Single Page Application experience. Typography includes Inter and Manrope, adhering to a defined color scheme. Components are designed for consistency across the application. Full dark mode support is implemented with `ThemeProvider` and `localStorage` persistence. A mobile-first design approach is applied across all pages, featuring responsive padding and a flexible dashboard sidebar.

### Technical Implementations
The frontend uses TypeScript, React Query for server state management, Zustand for client state, Wouter for routing, and Lucide React for icons. The backend is powered by Supabase (PostgreSQL, real-time, authentication), with Express.js serving as the API layer. Paystack is integrated for payment processing, and Google Maps API handles location services, driver tracking, and route optimization. Client NIN Verification is enforced via the YouVerify API to prevent fraud, incorporating selfie matching, rate limiting, and secure NIN storage. An email notification system uses Resend for transactional communications, complete with database logging and webhook handling.

### Feature Specifications
Key features include:
- **Role-Based Dashboards:** Dedicated interfaces for drivers, clients, and administrators.
- **Driver Management:** Profiles, bank accounts, and availability toggles.
- **Client NIN Verification:** Mandatory identity verification via YouVerify API.
- **Real-time Capabilities:** Instant updates on driver status, booking requests, and chat via Supabase Realtime.
- **Secure Payment Processing:** Paystack integration for fees, escrow, and split payouts.
- **Driver Verification:** A process to ensure professional standards.
- **Booking Flow:** Client search, booking, payment, and real-time tracking.
- **Admin Oversight:** User management, analytics, booking, transaction monitoring, manual NIN verification approval, and ACID-compliant dispute resolution with force-complete/cancel capabilities.
- **In-App Chat:** Real-time messaging between drivers and clients with Row-Level Security (RLS).
- **Push Notifications:** OneSignal integration for alerts.
- **Rating and Review System:** Post-trip feedback mechanism.
- **Completion-Based Payouts:** Automated, commission-based payouts upon trip completion confirmation.
- **Landing Page:** Responsive, mobile-first design.

### System Design Choices
- **Database Schema:** Structured tables with JSONB for flexible data storage (e.g., location data).
- **Authentication:** Supabase Auth with robust role-based access control.
- **Row-Level Security (RLS):** Implemented across tables to enforce data privacy and access control.
- **Real-time Optimization:** Supabase Realtime subscriptions replace traditional polling methods.
- **Payment Security:** Webhook signature validation, transaction locks, and idempotency for secure financial operations.
- **Input Validation:** Zod schemas are used for multi-layer frontend and backend input validation.
- **Bank Account Security:** Paystack verification is required for all bank account updates.
- **Email System:** Resend integration includes email logging, retry logic, and Svix signature verification for webhooks, with RLS for admin access to logs.
- **ACID-Compliant Admin Operations:** PostgreSQL RPC functions with outbox pattern ensure atomic booking updates and audit trail creation. Payouts/refunds are processed asynchronously via background worker with idempotency keys and retry logic (max 5 attempts).

## External Dependencies
- **Supabase:** Database, Authentication, Realtime features.
- **Paystack:** Payment gateway for all financial transactions.
- **Google Maps API:** Location services, tracking, and route optimization.
- **YouVerify:** Identity verification API for NIN verification.
- **OneSignal:** Push notification service.
- **Resend:** Email notification service.