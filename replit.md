# Drivers On Demand

## Overview
Drivers On Demand is a production-ready, full-stack platform designed to connect clients with verified professional drivers in real-time. It features role-based dashboards for drivers, clients, and administrators, offering real-time updates, secure payment processing, and location-based driver search. The project aims to provide a seamless and efficient booking experience, leveraging modern web technologies to ensure scalability and reliability.

## User Preferences
I prefer clear, concise explanations and an iterative development approach. Please ask before implementing major changes or making significant architectural decisions. I value detailed explanations when new features or complex logic are introduced. I also want to make sure the agent does not make changes to the existing folder structure unless explicitly asked.

## System Architecture

### UI/UX Decisions
The platform utilizes React with Vite for a fast Single Page Application experience. Styling is handled by Tailwind CSS for a utility-first approach, complemented by Shadcn UI for accessible and aesthetically pleasing components. Inter and Manrope are used for typography, with a clear hierarchy. Color schemes include primary blue for CTAs, green for success, red for destructive actions, and gray for muted states. Components are designed with consistency, using cards, various button sizes, rounded badges, and stat cards with trend indicators. Spacing is systematically applied across micro, component, section, and page levels.

### Technical Implementations
The frontend uses TypeScript for type safety, React Query for server state management with optimized caching, Zustand for global client state, Wouter for routing, and Lucide React for icons. The backend is powered by Supabase, providing a PostgreSQL database with real-time subscriptions and built-in authentication. Express.js serves as the API server, integrating with the Paystack API for payment processing, including split payments. Google Maps API is used for location services, driver tracking, and route optimization, including distance matrix calculations and geofencing.

### Feature Specifications
The platform includes comprehensive features such as:
- **Role-Based Dashboards:** Separate interfaces for drivers, clients, and administrators, each tailored to their specific needs.
- **Driver Settings:** Comprehensive settings page allowing drivers to manage profile information (name, phone, license, hourly rate), bank account details for payouts, and password changes.
- **Real-time Capabilities:** Leveraging Supabase Realtime for instant updates on driver status, booking requests, and in-app chat messages.
- **Secure Payment Processing:** Integration with Paystack for driver verification fees, upfront client payments (held in escrow), and automatic split payouts to drivers upon trip completion.
- **Driver Verification:** A process involving a one-time payment and profile completion to ensure professional standards.
- **Booking Flow:** Clients search for nearby drivers, confirm bookings, make upfront payments, and track trip progress with real-time updates. Drivers receive and manage booking requests.
- **Admin Oversight:** Administrators can manage users, monitor platform analytics (drivers, clients, revenue, trips), oversee bookings, and track transactions.
- **In-App Chat:** Real-time messaging between drivers and clients, secured with Row-Level Security (RLS).
- **Push Notifications:** OneSignal integration for event-driven alerts.
- **Rating and Review System:** Allows clients to rate and review drivers post-trip.
- **Completion-Based Payouts:** Automatic, commission-based payouts to drivers only after both driver and client confirm trip completion, with race condition prevention and comprehensive logging.

### System Design Choices
- **Database Schema:** Structured with tables for Drivers, Clients, Bookings, Transactions, and Admin Users, with appropriate relationships and JSONB for location data.
- **Authentication:** Supabase Auth for user management, with roles stored in user metadata for access control.
- **Row-Level Security (RLS):** Implemented across all tables to restrict data access based on user roles, ensuring data privacy and security.
- **Real-time Optimization:** Replaced polling with Supabase Realtime subscriptions for instant updates, minimizing redundant fetches with React Query caching, and proper cleanup of subscriptions.
- **Payment Security:** Webhook signature validation, transaction locks, and comprehensive payment status tracking are implemented to ensure secure and reliable financial operations.
- **Idempotency:** Deterministic transfer references for Paystack ensure duplicate transactions are rejected.
- **Input Validation:** Multi-layer validation using Zod schemas on both frontend and backend, with field whitelisting on profile updates to prevent unauthorized field modifications.
- **Bank Account Security:** Bank account updates require Paystack verification (PATCH /api/drivers/bank-account) - drivers cannot inject bank details through the profile endpoint, ensuring all payout accounts are verified before accepting payments.

## External Dependencies
- **Supabase:** Database, Authentication, and Realtime functionalities.
- **Paystack:** Payment gateway for processing all financial transactions, including driver verification, client payments, and split payouts.
- **Google Maps API:** Location services, driver tracking, places autocomplete, distance matrix calculations, and geofencing.
- **OneSignal:** Push notification service for real-time alerts to users.