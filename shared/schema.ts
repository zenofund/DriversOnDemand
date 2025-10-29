import { z } from "zod";

// ============================================================================
// ENUMS
// ============================================================================

export const UserRole = {
  DRIVER: "driver",
  CLIENT: "client",
  ADMIN: "admin",
} as const;

export const OnlineStatus = {
  ONLINE: "online",
  OFFLINE: "offline",
} as const;

export const PaymentStatus = {
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
} as const;

export const BookingStatus = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  ONGOING: "ongoing",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export const AdminRole = {
  SUPER_ADMIN: "super_admin",
  MODERATOR: "moderator",
} as const;

// ============================================================================
// DRIVER SCHEMAS
// ============================================================================

export const driverSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  full_name: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email(),
  license_no: z.string().min(5),
  verified: z.boolean(),
  verification_payment_ref: z.string().nullable(),
  paystack_subaccount: z.string().nullable(),
  hourly_rate: z.number().positive(),
  online_status: z.enum([OnlineStatus.ONLINE, OnlineStatus.OFFLINE]),
  current_location: z.object({
    lat: z.number(),
    lng: z.number(),
  }).nullable(),
  rating: z.number().min(0).max(5),
  total_trips: z.number().int().min(0),
  created_at: z.string(),
});

export const insertDriverSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Valid phone number required"),
  email: z.string().email("Valid email required"),
  license_no: z.string().min(5, "Valid license number required"),
  hourly_rate: z.number().positive("Hourly rate must be positive"),
});

export type Driver = z.infer<typeof driverSchema>;
export type InsertDriver = z.infer<typeof insertDriverSchema>;

// ============================================================================
// CLIENT SCHEMAS
// ============================================================================

export const clientSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  full_name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  verified: z.boolean(),
  created_at: z.string(),
});

export const insertClientSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(10, "Valid phone number required"),
});

export type Client = z.infer<typeof clientSchema>;
export type InsertClient = z.infer<typeof insertClientSchema>;

// ============================================================================
// BOOKING SCHEMAS
// ============================================================================

export const bookingSchema = z.object({
  id: z.string().uuid(),
  client_id: z.string().uuid(),
  driver_id: z.string().uuid(),
  start_location: z.string(),
  destination: z.string(),
  start_coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  destination_coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  distance_km: z.number(),
  duration_hr: z.number(),
  total_cost: z.number(),
  payment_status: z.enum([
    PaymentStatus.PENDING,
    PaymentStatus.PAID,
    PaymentStatus.FAILED,
    PaymentStatus.REFUNDED,
  ]),
  booking_status: z.enum([
    BookingStatus.PENDING,
    BookingStatus.ACCEPTED,
    BookingStatus.ONGOING,
    BookingStatus.COMPLETED,
    BookingStatus.CANCELLED,
  ]),
  created_at: z.string(),
  updated_at: z.string(),
});

export const createBookingSchema = z.object({
  driver_id: z.string().uuid(),
  start_location: z.string().min(3, "Pickup location required"),
  destination: z.string().min(3, "Destination required"),
  start_coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  destination_coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  distance_km: z.number().positive(),
  duration_hr: z.number().positive(),
  total_cost: z.number().positive(),
});

export type Booking = z.infer<typeof bookingSchema>;
export type CreateBooking = z.infer<typeof createBookingSchema>;

// ============================================================================
// TRANSACTION SCHEMAS
// ============================================================================

export const transactionSchema = z.object({
  id: z.string().uuid(),
  booking_id: z.string().uuid().nullable(),
  driver_id: z.string().uuid().nullable(),
  paystack_ref: z.string(),
  amount: z.number(),
  split_code: z.string().nullable(),
  settled: z.boolean(),
  transaction_type: z.enum(["booking", "verification"]),
  created_at: z.string(),
});

export type Transaction = z.infer<typeof transactionSchema>;

// ============================================================================
// ADMIN SCHEMAS
// ============================================================================

export const adminUserSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum([AdminRole.SUPER_ADMIN, AdminRole.MODERATOR]),
  is_active: z.boolean(),
  last_login: z.string().nullable(),
  created_at: z.string(),
});

export type AdminUser = z.infer<typeof adminUserSchema>;

// ============================================================================
// AUTH SCHEMAS
// ============================================================================

export const signUpSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum([UserRole.DRIVER, UserRole.CLIENT, UserRole.ADMIN]),
});

export const signInSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password required"),
});

export type SignUp = z.infer<typeof signUpSchema>;
export type SignIn = z.infer<typeof signInSchema>;

// ============================================================================
// COMBINED TYPES FOR FRONTEND
// ============================================================================

export type BookingWithDetails = Booking & {
  driver: Driver;
  client: Client;
};

export type DriverWithStats = Driver & {
  active_bookings: number;
  today_earnings: number;
  today_trips: number;
};

export type DashboardStats = {
  active_drivers: number;
  total_clients: number;
  total_revenue: number;
  commission_earned: number;
  trips_today: number;
  trips_this_month: number;
};

// ============================================================================
// RATING SCHEMAS
// ============================================================================

export const ratingSchema = z.object({
  id: z.string().uuid(),
  booking_id: z.string().uuid(),
  client_id: z.string().uuid(),
  driver_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  review: z.string().nullable(),
  created_at: z.string(),
});

export const insertRatingSchema = z.object({
  booking_id: z.string().uuid(),
  rating: z.number().int().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
  review: z.string().optional(),
});

export type Rating = z.infer<typeof ratingSchema>;
export type InsertRating = z.infer<typeof insertRatingSchema>;

export type RatingWithDetails = Rating & {
  client?: {
    full_name: string;
  };
};
