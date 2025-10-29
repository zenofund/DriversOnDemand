# Design Guidelines: Drivers On Demand

## Design Approach

**Selected Framework**: Hybrid approach combining Material Design principles with ride-sharing industry patterns from Uber, Lyft, and Grab. This platform requires trustworthy, efficient interfaces for three distinct user types while maintaining visual consistency.

**Core Principles**:
- Trust through clarity: Every interaction reinforces platform reliability
- Efficiency-first: Minimize steps to complete critical actions (booking, accepting rides)
- Real-time feedback: Immediate visual confirmation of status changes
- Role-appropriate information density: Different dashboards serve different needs

---

## Typography System

**Font Families** (via Google Fonts):
- Primary: Inter (400, 500, 600, 700) - exceptional readability for UI elements
- Accent: Manrope (600, 700) - headings and marketing content

**Hierarchy**:
- Hero Headlines: text-5xl to text-7xl, font-bold, tracking-tight
- Section Headers: text-3xl to text-4xl, font-semibold
- Dashboard Titles: text-2xl, font-semibold
- Card Headers: text-lg, font-semibold
- Body Text: text-base, font-normal, leading-relaxed
- Metadata/Labels: text-sm, font-medium, tracking-wide uppercase for status badges
- Fine Print: text-xs for timestamps, legal text

---

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24
- Micro spacing (gaps, padding inside components): 2, 4
- Component spacing (between elements): 6, 8
- Section spacing (between major blocks): 12, 16, 20
- Page margins: 24 on desktop, 6 on mobile

**Grid System**:
- Marketing pages: max-w-7xl container with px-6
- Dashboard layouts: Full-width with max-w-screen-2xl, side navigation pattern
- Content cards: max-w-4xl for forms, max-w-6xl for data tables

---

## Component Library

### Navigation

**Public Site Header**:
- Fixed top navigation: backdrop-blur-lg with border-b
- Logo left, navigation center (desktop) / hamburger right (mobile)
- Dual CTAs: "Sign Up as Driver" (primary) + "Book a Driver" (secondary)
- Trust indicators: "5,000+ Verified Drivers" badge with Heroicons check-badge

**Dashboard Navigation**:
- Persistent sidebar (desktop): w-64, collapsible to w-16 icon-only mode
- Bottom tab bar (mobile): fixed bottom-0 with 4-5 primary actions
- Profile dropdown top-right with role badge and online/offline toggle for drivers

### Hero Section (Marketing Landing)

**Layout**: Split hero with asymmetric 60/40 split
- Left: Headline + subheadline + dual CTAs + trust indicators (ratings, driver count, cities)
- Right: Large hero image showing professional driver with client, or map interface mockup
- Height: min-h-[600px] on desktop, min-h-[500px] mobile
- Background: Subtle gradient treatment, not solid

### Cards & Data Display

**Driver Cards** (Client Search):
- Compact horizontal cards: flex layout with rounded-xl borders
- Left: Driver avatar (rounded-full, w-16 h-16) with online status indicator (absolute positioned green dot)
- Center: Name (font-semibold), rating stars (5/5 with Heroicons star), hourly rate, distance away
- Right: "Request Booking" button (primary)
- Hover state: Subtle shadow lift (shadow-md to shadow-xl transition)

**Booking Status Cards**:
- Timeline-style vertical layout with step indicators
- Current step highlighted with primary accent, completed steps with success indicator
- Real-time status: "Driver 5 min away" with live dot animation
- Map integration: Embedded mini-map showing driver location

**Dashboard Stat Cards**:
- Grid layout: grid-cols-1 md:grid-cols-2 lg:grid-cols-4
- Each card: p-6, rounded-xl, border
- Icon top-left (w-12 h-12, rounded-lg background)
- Large metric number (text-3xl font-bold)
- Label below (text-sm)
- Trend indicator with arrow icon (Heroicons arrow-trending-up)

### Forms

**Booking Form**:
- Two-column layout on desktop (pickup/destination in separate columns)
- Location inputs with map pin icons (Heroicons map-pin)
- Autocomplete dropdown with recent locations
- Date/time picker: Inline calendar modal (not native)
- Cost calculator: Live preview card showing breakdown (base rate + hours + total)

**Driver Registration**:
- Multi-step form with progress indicator (4 steps: Personal, License, Payment, Verification)
- Each step: Single focused task with max-w-lg centering
- File upload: Drag-drop zone with preview thumbnails for license documents
- Verification payment: Integrated Paystack card with ₦5,000 locked amount display

### Tables (Admin Dashboard)

- Full-width responsive tables with horizontal scroll on mobile
- Sticky header row
- Alternating row backgrounds for readability
- Action column right-aligned with icon buttons (Heroicons ellipsis-vertical)
- Filter bar above table: Search input + status dropdown + date range picker
- Pagination: Bottom-center with page numbers + prev/next

### Modals & Overlays

- Centered modal: max-w-2xl with backdrop blur
- Header with title + close button (Heroicons x-mark)
- Scrollable content area with max-h-[70vh]
- Footer with action buttons right-aligned
- Confirmation modals: Include icon (warning, success) and clear primary action

### Status Indicators

**Real-time Elements**:
- Online/Offline toggle: Switch component with immediate visual feedback
- Live location dot: Pulsing animation (animate-pulse) on maps
- Booking status badges: Rounded-full px-3 py-1 with status text
  - Pending: Neutral treatment
  - Active: Success indicator
  - Completed: Muted
  - Cancelled: Error treatment

---

## Marketing Landing Page Structure

1. **Hero Section**: Split layout with CTA focus and hero image
2. **How It Works**: 3-column grid explaining process for drivers and clients separately
3. **Driver Benefits**: Icon-led feature cards in 2-column layout with supporting images
4. **Client Advantages**: Testimonial-style section with photo + quote cards (grid-cols-1 md:grid-cols-2)
5. **Trust Section**: Stats showcase (grid-cols-4) with large numbers and icons
6. **Pricing Transparency**: Side-by-side comparison (Driver earnings vs Client costs)
7. **CTA Section**: Full-width with dual buttons (Sign up as Driver / Book a Ride)
8. **Footer**: Multi-column with quick links, contact info, social links, trust badges

---

## Dashboard Layouts

### Driver Dashboard

**Sidebar Navigation**: Today's Earnings, Active Bookings, History, Profile, Settings
**Main Content**:
- Top stats row: grid-cols-3 (Today's Trips, Total Earnings, Rating)
- Active booking card (if any): Full-width attention-grabbing with accept/decline buttons
- Availability toggle: Prominent top-right with "GO ONLINE" large button
- Upcoming bookings: List view with timeline

### Client Dashboard

**Map-Centric Layout**:
- Full-height map occupying 60% of viewport
- Overlay booking panel: Absolute positioned top-left (mobile: bottom sheet)
- Recent bookings sidebar: Right column (desktop) or swipeable sheet (mobile)

### Admin Dashboard

**Dense Information Layout**:
- Top KPI cards: grid-cols-4 with key metrics
- Main content: Tabbed interface (Drivers, Clients, Bookings, Transactions)
- Each tab: Filterable table with bulk actions
- Analytics section: Chart library integration (bar charts for revenue, line graphs for trends)

---

## Images

**Hero Image**: Professional driver in branded attire standing beside modern vehicle, friendly expression, urban setting background. Image should convey trust and professionalism.

**How It Works Section**: Step-by-step illustrations or photos showing phone app usage, driver-client interaction, payment flow.

**Driver Benefits Section**: Images showing drivers earning, flexible schedules, dashboard interfaces.

**Testimonials**: Authentic driver and client headshots with star ratings.

---

## Icons

**Library**: Heroicons (via CDN) exclusively for consistency

**Key Icons**:
- map-pin: Locations
- user-circle: Profile
- currency-dollar: Payments
- clock: Time/duration
- star: Ratings
- check-badge: Verification
- bell: Notifications
- chart-bar: Analytics

---

## Responsive Behavior

- Mobile-first approach: Stack columns, expand cards to full-width
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Navigation transforms: Sidebar → bottom tabs on mobile
- Maps: Full-screen takeover on mobile booking flow
- Tables: Horizontal scroll with sticky first column