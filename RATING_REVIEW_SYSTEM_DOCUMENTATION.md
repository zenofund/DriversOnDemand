# Rating and Review System Documentation

## Overview
A comprehensive rating and review system has been implemented to allow clients to rate and provide feedback about drivers after completing a trip. The system includes star ratings (1-5), written reviews, and a visual display of all ratings with statistics.

## Features Implemented

### 1. Rating Submission

#### RatingDialog Component
**Location**: `/client/src/components/RatingDialog.tsx`

**Features**:
- ✅ Interactive 5-star rating system
- ✅ Hover effects on stars
- ✅ Text labels (Excellent, Good, Average, Below Average, Poor)
- ✅ Optional written review (textarea)
- ✅ Character limit and validation
- ✅ Submit/Cancel actions
- ✅ Loading states
- ✅ Error handling with toast notifications

**User Experience**:
1. Client completes a trip
2. "Rate Driver" button appears on completed booking
3. Click opens rating dialog
4. Select 1-5 stars (hover to preview)
5. Optionally write detailed review
6. Submit rating
7. Confirmation message shown
8. Dialog closes automatically

### 2. Rating Display

#### DriverReviews Component
**Location**: `/client/src/components/DriverReviews.tsx`

**Features**:
- ✅ Overall rating summary with large display
- ✅ Star rating visualization
- ✅ Total review count
- ✅ Rating distribution chart (5-star breakdown)
- ✅ Individual review cards with:
  - Client name and profile picture
  - Star rating
  - Review text
  - Date posted
- ✅ Empty state for no reviews
- ✅ Loading states

**Visual Design**:
```
┌─────────────────────────────────────┐
│  Reviews & Ratings                  │
├─────────────────────────────────────┤
│  ┌──────────┬─────────────────────┐ │
│  │   4.8    │ 5★ ████████░░ 15    │ │
│  │  ★★★★★   │ 4★ ███████░░░ 12    │ │
│  │ 23 reviews│ 3★ ██░░░░░░░  3    │ │
│  │          │ 2★ ░░░░░░░░░  1    │ │
│  │          │ 1★ ░░░░░░░░░  0    │ │
│  └──────────┴─────────────────────┘ │
│                                     │
│  [Avatar] John Doe    Jan 15, 2024 │
│  ★★★★★                              │
│  Excellent driver! Very punctual    │
│  and professional.                  │
│  ─────────────────────────────────  │
│  [Avatar] Jane Smith  Jan 14, 2024 │
│  ★★★★☆                              │
│  Good experience overall.           │
└─────────────────────────────────────┘
```

### 3. Driver Reviews Page

**Location**: `/client/src/pages/driver/Reviews.tsx`

**Features**:
- ✅ Dedicated page for drivers to view all their reviews
- ✅ Full dashboard integration
- ✅ Shows average rating and total trips
- ✅ Uses DriverReviews component for display
- ✅ Accessible via sidebar navigation

**Access**: `/driver/reviews`

### 4. Integration Points

#### Client My Bookings Page
**Location**: `/client/src/pages/client/MyBookings.tsx`

**Integration**:
- "Rate Driver" button appears on completed bookings
- Button only shows for completed bookings
- Opens RatingDialog on click
- Prevents duplicate ratings (one per booking)

#### Driver Sidebar Navigation
**Location**: `/client/src/components/DashboardSidebar.tsx`

**Addition**:
- "My Reviews" menu item added
- Icon: BarChart3
- Navigation to `/driver/reviews`

### 5. Database Schema

**Ratings Table** (from `supabase_schema.sql`):

```sql
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(booking_id) -- One rating per booking
);

-- Indexes
CREATE INDEX idx_ratings_driver_id ON ratings(driver_id);
CREATE INDEX idx_ratings_client_id ON ratings(client_id);
CREATE INDEX idx_ratings_booking_id ON ratings(booking_id);
```

**Constraints**:
- Rating must be between 1 and 5 (enforced at DB level)
- One rating per booking (UNIQUE constraint)
- Review text is optional (can be NULL)
- Cascading deletes maintain referential integrity

### 6. API Endpoints

#### Submit Rating
```
POST /api/ratings
Authorization: Bearer {token}
Content-Type: application/json

{
  "booking_id": "uuid",
  "rating": 5,
  "review": "Excellent service!" // optional
}
```

**Validation**:
- Rating: 1-5 (required)
- Review: 0-1000 characters (optional)
- Only clients can submit ratings
- Booking must be completed
- No duplicate ratings allowed
- Client must own the booking

**On Success**:
- Rating created in database
- Driver's average rating recalculated automatically
- Returns created rating object

#### Get Driver Ratings
```
GET /api/ratings/driver/:driverId
```

**Returns**:
```json
[
  {
    "id": "uuid",
    "rating": 5,
    "review": "Great driver!",
    "created_at": "2024-01-15T10:00:00Z",
    "client": {
      "full_name": "John Doe",
      "profile_picture_url": "https://..."
    }
  }
]
```

**Features**:
- Returns all ratings for a driver
- Includes client name and profile picture
- Ordered by date (newest first)
- No authentication required (public data)

#### Get Rating for Booking
```
GET /api/ratings/booking/:bookingId
Authorization: Bearer {token}
```

**Purpose**:
- Check if booking has already been rated
- Retrieve existing rating for editing
- Client can only view their own rating

#### Update Rating
```
PUT /api/ratings/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "rating": 4,
  "review": "Updated review text"
}
```

**Features**:
- Clients can update their own ratings
- Driver's average rating recalculated
- Returns updated rating object

### 7. Average Rating Calculation

**Automatic Recalculation**:

When a rating is submitted or updated, the driver's average rating is automatically recalculated:

```typescript
// Get all ratings for the driver
const { data: driverRatings } = await supabase
  .from('ratings')
  .select('rating')
  .eq('driver_id', driverId);

// Calculate average
const avgRating = driverRatings.reduce((sum, r) => sum + r.rating, 0) / driverRatings.length;

// Update driver record
await supabase
  .from('drivers')
  .update({ rating: avgRating })
  .eq('id', driverId);
```

**Display**:
- Driver card shows rating (e.g., "4.8 ⭐")
- Rounded to 1 decimal place
- Default rating is 5.0 (no reviews yet)

### 8. Row-Level Security (RLS)

**Ratings Table Policies**:

```sql
-- Anyone can view ratings (public)
CREATE POLICY "Anyone can view ratings"
  ON ratings FOR SELECT
  USING (TRUE);

-- Only clients can create ratings for their bookings
CREATE POLICY "Clients can create ratings for their bookings"
  ON ratings FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM clients WHERE id = client_id)
  );

-- Clients can update their own ratings
CREATE POLICY "Clients can update their own ratings"
  ON ratings FOR UPDATE
  USING (
    auth.uid() IN (SELECT user_id FROM clients WHERE id = client_id)
  );

-- Admins can view all ratings
CREATE POLICY "Admins can view all ratings"
  ON ratings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );
```

### 9. User Workflows

#### Client Rating Workflow

1. **Complete Trip**
   - Trip status changes to "completed"
   - Both driver and client confirm completion

2. **Access My Bookings**
   - Navigate to My Bookings page
   - Completed bookings display at top

3. **Rate Driver**
   - Click "Rate Driver" button
   - Rating dialog opens

4. **Submit Rating**
   - Select star rating (1-5)
   - Optionally write review
   - Click "Submit Rating"
   - See success message

5. **View Confirmation**
   - Dialog closes
   - Button changes or disappears
   - Rating recorded

#### Driver Viewing Reviews

1. **Navigate to Reviews**
   - Click "My Reviews" in sidebar
   - Reviews page loads

2. **View Statistics**
   - See overall rating (large display)
   - View total review count
   - See rating distribution chart

3. **Read Individual Reviews**
   - Scroll through all reviews
   - See client names and pictures
   - Read detailed feedback
   - View dates of reviews

### 10. Visual Components

#### Star Rating Input
- Interactive stars for rating selection
- Hover preview shows potential rating
- Click to set rating
- Yellow fill for selected stars
- Gray for unselected stars

#### Star Rating Display
- Read-only star visualization
- Yellow filled stars
- Handles partial ratings (rounds to nearest)
- Consistent sizing and spacing

#### Rating Distribution Chart
- Horizontal bar chart
- 5 bars (one for each star rating)
- Yellow progress bars
- Shows count next to each bar
- Percentage-based widths

### 11. Data Validation

**Client-Side Validation**:
- Rating must be selected (1-5)
- Review is optional
- Review max length: 1000 characters
- Form validation before submission

**Server-Side Validation**:
- Rating range: 1-5 (enforced)
- Booking must exist
- Booking must be completed
- Client must own booking
- No duplicate ratings
- User must be authenticated

### 12. Error Handling

**Submission Errors**:
- Already rated: "This booking has already been rated"
- Not completed: "Can only rate completed bookings"
- Not your booking: "You can only rate your own bookings"
- Server error: Generic error message with retry option

**Display Errors**:
- Failed to load: Shows error state
- No reviews: Shows friendly empty state
- Loading state: Skeleton loaders

### 13. Performance Optimizations

**Caching**:
- React Query caches rating data
- Reduces API calls
- Automatic refetch on window focus (optional)

**Efficient Queries**:
- Indexed database lookups
- Only fetches necessary fields
- Pagination ready (can add limit/offset)

**Optimistic Updates** (Future):
- Update UI before server response
- Rollback on error
- Faster perceived performance

### 14. Mobile Responsiveness

**Rating Dialog**:
- Full-screen on small devices
- Touch-friendly star buttons
- Scrollable review list
- Keyboard-friendly inputs

**Reviews Display**:
- Stacks on mobile
- Horizontal scroll for distribution chart
- Profile pictures scale appropriately

### 15. Statistics & Analytics

**Available Metrics**:

```typescript
// Overall stats
const totalReviews = reviews.length;
const averageRating = driver.rating;
const fiveStarCount = reviews.filter(r => r.rating === 5).length;

// Distribution
const distribution = [0, 0, 0, 0, 0];
reviews.forEach(review => {
  distribution[review.rating - 1]++;
});

// Percentage calculation
const fiveStarPercentage = (fiveStarCount / totalReviews) * 100;
```

**Useful Queries**:

```sql
-- Top rated drivers
SELECT d.*, COUNT(r.id) as review_count
FROM drivers d
LEFT JOIN ratings r ON r.driver_id = d.id
WHERE d.rating >= 4.5
GROUP BY d.id
ORDER BY d.rating DESC, review_count DESC
LIMIT 10;

-- Recent reviews
SELECT r.*, d.full_name as driver_name, c.full_name as client_name
FROM ratings r
JOIN drivers d ON r.driver_id = d.id
JOIN clients c ON r.client_id = c.id
ORDER BY r.created_at DESC
LIMIT 20;

-- Drivers without reviews
SELECT * FROM drivers
WHERE id NOT IN (SELECT DISTINCT driver_id FROM ratings)
AND verified = TRUE;
```

### 16. Future Enhancements

**Potential Features**:
1. **Review Responses** - Drivers can reply to reviews
2. **Report Review** - Flag inappropriate reviews
3. **Helpful Votes** - Mark reviews as helpful
4. **Photo Reviews** - Attach images to reviews
5. **Review Reminders** - Notify clients to leave review
6. **Review Incentives** - Reward for leaving detailed reviews
7. **Review Filters** - Filter by rating, date, keyword
8. **Review Trends** - Show rating changes over time
9. **Verified Reviews** - Badge for verified trips
10. **Review Templates** - Quick review options

### 17. Best Practices

**For Drivers**:
- Respond professionally to reviews (when feature added)
- Learn from feedback
- Maintain high rating (4.5+ recommended)
- Address concerns mentioned in reviews

**For Platform**:
- Monitor for fake/spam reviews
- Remove inappropriate content
- Verify reviews are from real bookings
- Provide driver support for low ratings

### 18. Testing

#### Manual Testing Steps

**As Client**:
1. ✅ Complete a booking
2. ✅ Go to My Bookings
3. ✅ Click "Rate Driver" button
4. ✅ Select different star ratings (see labels change)
5. ✅ Write a review
6. ✅ Submit rating
7. ✅ Verify success message
8. ✅ Try to rate same booking again (should fail)

**As Driver**:
1. ✅ Navigate to "My Reviews"
2. ✅ Verify overall rating displays
3. ✅ Check rating distribution chart
4. ✅ Scroll through individual reviews
5. ✅ Verify client profile pictures show
6. ✅ Check dates are correct

**Admin Testing**:
1. ✅ Verify rating updates driver's average
2. ✅ Check database constraints work
3. ✅ Test duplicate rating prevention
4. ✅ Verify RLS policies enforce security

### 19. Troubleshooting

**Rating Button Not Showing**:
- Check booking status (must be "completed")
- Verify user is client (not driver)
- Check if already rated

**Can't Submit Rating**:
- Ensure booking is completed
- Check network connection
- Verify authentication
- Check console for errors

**Reviews Not Loading**:
- Verify driver ID is correct
- Check API endpoint
- Look for console errors
- Verify driver has reviews

### 20. Integration with Other Features

**Driver Listing**:
- Ratings displayed on driver cards
- Sort by rating option
- Filter by minimum rating
- Rating affects visibility

**Notifications** (Future):
- Notify driver of new review
- Remind client to leave review
- Alert on low rating

**Analytics Dashboard**:
- Track average platform rating
- Monitor review completion rate
- Identify top-rated drivers

## Summary

The rating and review system provides:

✅ **Complete Rating Functionality**
- 5-star rating system
- Written review option
- One rating per booking
- Update capability

✅ **Beautiful Display**
- Overall rating summary
- Distribution charts
- Individual review cards
- Profile picture integration

✅ **Security**
- RLS policies
- Validation at all levels
- Duplicate prevention
- Owner verification

✅ **Great UX**
- Interactive star selection
- Clear visual feedback
- Easy access from bookings
- Dedicated reviews page for drivers

✅ **Data Integrity**
- Automatic average calculation
- Database constraints
- Referential integrity
- Audit trail with timestamps

The rating and review system is **production-ready** and provides comprehensive feedback capabilities for the platform!
