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
  license_no: z.string().min(5).nullable(),
  verified: z.boolean(),
  verification_payment_ref: z.string().nullable(),
  paystack_subaccount: z.string().nullable(),
  bank_code: z.string().nullable(),
  account_number: z.string().nullable(),
  account_name: z.string().nullable(),
  paystack_recipient_code: z.string().nullable(),
  hourly_rate: z.number().positive(),
  online_status: z.enum([OnlineStatus.ONLINE, OnlineStatus.OFFLINE]),
  current_location: z.object({
    lat: z.number(),
    lng: z.number(),
  }).nullable(),
  rating: z.number().min(0).max(5),
  total_trips: z.number().int().min(0),
  profile_picture_url: z.string().nullable(),
  created_at: z.string(),
});

export const insertDriverSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Valid phone number required"),
  email: z.string().email("Valid email required"),
  license_no: z.string().min(5, "Valid license number required"),
  hourly_rate: z.number().positive("Hourly rate must be positive"),
});

export const updateDriverProfileSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters").optional(),
  phone: z.string().min(10, "Valid phone number required").optional(),
  license_no: z.string().min(5, "Valid license number required").optional(),
  hourly_rate: z.number().positive("Hourly rate must be positive").optional(),
});

export const updateDriverBankSchema = z.object({
  bank_code: z.string().min(3, "Bank code required"),
  account_number: z.string().length(10, "Account number must be exactly 10 digits"),
});

export type Driver = z.infer<typeof driverSchema>;
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type UpdateDriverProfile = z.infer<typeof updateDriverProfileSchema>;
export type UpdateDriverBank = z.infer<typeof updateDriverBankSchema>;

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
  profile_picture_url: z.string().nullable(),
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
  client_confirmed: z.boolean(),
  driver_confirmed: z.boolean(),
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

export const RaterRole = {
  CLIENT: 'client',
  DRIVER: 'driver',
} as const;

export const ratingSchema = z.object({
  id: z.string().uuid(),
  booking_id: z.string().uuid(),
  client_id: z.string().uuid(),
  driver_id: z.string().uuid(),
  rater_role: z.enum([RaterRole.CLIENT, RaterRole.DRIVER]),
  rating: z.number().int().min(1).max(5),
  review: z.string().nullable(),
  created_at: z.string(),
});

export const insertRatingSchema = z.object({
  booking_id: z.string().uuid(),
  rater_role: z.enum([RaterRole.CLIENT, RaterRole.DRIVER]),
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

// ============================================================================
// MESSAGE SCHEMAS
// ============================================================================

export const messageSchema = z.object({
  id: z.string().uuid(),
  booking_id: z.string().uuid(),
  sender_id: z.string().uuid(),
  sender_role: z.enum([UserRole.DRIVER, UserRole.CLIENT]),
  message: z.string(),
  created_at: z.string(),
});

export const insertMessageSchema = z.object({
  booking_id: z.string().uuid(),
  message: z.string().min(1, "Message cannot be empty").max(1000, "Message too long"),
});

export type Message = z.infer<typeof messageSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// ============================================================================
// NOTIFICATION SCHEMAS
// ============================================================================

export const NotificationType = {
  BOOKING_CREATED: 'booking_created',
  BOOKING_ACCEPTED: 'booking_accepted',
  BOOKING_COMPLETED: 'booking_completed',
  BOOKING_CANCELLED: 'booking_cancelled',
  PAYMENT_RECEIVED: 'payment_received',
  MESSAGE_RECEIVED: 'message_received',
  DRIVER_NEARBY: 'driver_nearby',
} as const;

export const notificationPreferencesSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  onesignal_player_id: z.string().nullable(),
  push_enabled: z.boolean(),
  email_enabled: z.boolean(),
  booking_updates: z.boolean(),
  payment_alerts: z.boolean(),
  chat_messages: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const notificationLogSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  notification_type: z.enum([
    NotificationType.BOOKING_CREATED,
    NotificationType.BOOKING_ACCEPTED,
    NotificationType.BOOKING_COMPLETED,
    NotificationType.BOOKING_CANCELLED,
    NotificationType.PAYMENT_RECEIVED,
    NotificationType.MESSAGE_RECEIVED,
    NotificationType.DRIVER_NEARBY,
  ]),
  title: z.string(),
  message: z.string(),
  data: z.record(z.any()).nullable(),
  sent_at: z.string(),
  read_at: z.string().nullable(),
});

export const updateNotificationPreferencesSchema = z.object({
  onesignal_player_id: z.string().optional(),
  push_enabled: z.boolean().optional(),
  email_enabled: z.boolean().optional(),
  booking_updates: z.boolean().optional(),
  payment_alerts: z.boolean().optional(),
  chat_messages: z.boolean().optional(),
});

export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;
export type NotificationLog = z.infer<typeof notificationLogSchema>;
export type UpdateNotificationPreferences = z.infer<typeof updateNotificationPreferencesSchema>;

// ============================================================================
// DISPUTE SCHEMAS
// ============================================================================

export const DisputeType = {
  PAYMENT: 'payment',
  SERVICE_QUALITY: 'service_quality',
  CANCELLATION: 'cancellation',
  OTHER: 'other',
} as const;

export const DisputeStatus = {
  OPEN: 'open',
  INVESTIGATING: 'investigating',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
} as const;

export const DisputePriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export const disputeSchema = z.object({
  id: z.string().uuid(),
  booking_id: z.string().uuid(),
  reported_by_user_id: z.string().uuid(),
  reported_by_role: z.enum([UserRole.DRIVER, UserRole.CLIENT]),
  dispute_type: z.enum([
    DisputeType.PAYMENT,
    DisputeType.SERVICE_QUALITY,
    DisputeType.CANCELLATION,
    DisputeType.OTHER,
  ]),
  description: z.string(),
  status: z.enum([
    DisputeStatus.OPEN,
    DisputeStatus.INVESTIGATING,
    DisputeStatus.RESOLVED,
    DisputeStatus.CLOSED,
  ]),
  priority: z.enum([
    DisputePriority.LOW,
    DisputePriority.MEDIUM,
    DisputePriority.HIGH,
    DisputePriority.URGENT,
  ]),
  admin_notes: z.string().nullable(),
  resolution: z.string().nullable(),
  resolved_by: z.string().uuid().nullable(),
  resolved_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const createDisputeSchema = z.object({
  booking_id: z.string().uuid(),
  dispute_type: z.enum([
    DisputeType.PAYMENT,
    DisputeType.SERVICE_QUALITY,
    DisputeType.CANCELLATION,
    DisputeType.OTHER,
  ]),
  description: z.string().min(10, "Description must be at least 10 characters"),
});

export const updateDisputeSchema = z.object({
  status: z.enum([
    DisputeStatus.OPEN,
    DisputeStatus.INVESTIGATING,
    DisputeStatus.RESOLVED,
    DisputeStatus.CLOSED,
  ]).optional(),
  priority: z.enum([
    DisputePriority.LOW,
    DisputePriority.MEDIUM,
    DisputePriority.HIGH,
    DisputePriority.URGENT,
  ]).optional(),
  admin_notes: z.string().optional(),
  resolution: z.string().optional(),
});

export type Dispute = z.infer<typeof disputeSchema>;
export type CreateDispute = z.infer<typeof createDisputeSchema>;
export type UpdateDispute = z.infer<typeof updateDisputeSchema>;

export type DisputeWithDetails = Dispute & {
  booking?: Booking;
  reported_by?: Driver | Client;
  resolved_by_user?: AdminUser;
};

// ============================================================================
// EMAIL SCHEMAS
// ============================================================================

export const EmailStatus = {
  QUEUED: 'queued',
  SENT: 'sent',
  DELIVERED: 'delivered',
  BOUNCED: 'bounced',
  COMPLAINED: 'complained',
  FAILED: 'failed',
} as const;

export const EmailType = {
  NIN_VERIFICATION_APPROVED: 'nin_verification_approved',
  NIN_VERIFICATION_REJECTED: 'nin_verification_rejected',
  NIN_VERIFICATION_LOCKED: 'nin_verification_locked',
  BOOKING_CONFIRMATION: 'booking_confirmation',
  BOOKING_DRIVER_ASSIGNED: 'booking_driver_assigned',
  BOOKING_TRIP_STARTED: 'booking_trip_started',
  BOOKING_TRIP_COMPLETED: 'booking_trip_completed',
  PAYMENT_RECEIPT: 'payment_receipt',
  PAYMENT_PAYOUT: 'payment_payout',
  ADMIN_ALERT: 'admin_alert',
} as const;

export const emailLogSchema = z.object({
  id: z.string().uuid(),
  resend_email_id: z.string().nullable(),
  to_email: z.string().email(),
  to_name: z.string().nullable(),
  email_type: z.enum([
    EmailType.NIN_VERIFICATION_APPROVED,
    EmailType.NIN_VERIFICATION_REJECTED,
    EmailType.NIN_VERIFICATION_LOCKED,
    EmailType.BOOKING_CONFIRMATION,
    EmailType.BOOKING_DRIVER_ASSIGNED,
    EmailType.BOOKING_TRIP_STARTED,
    EmailType.BOOKING_TRIP_COMPLETED,
    EmailType.PAYMENT_RECEIPT,
    EmailType.PAYMENT_PAYOUT,
    EmailType.ADMIN_ALERT,
  ]),
  subject: z.string(),
  template_data: z.record(z.any()).nullable(),
  status: z.enum([
    EmailStatus.QUEUED,
    EmailStatus.SENT,
    EmailStatus.DELIVERED,
    EmailStatus.BOUNCED,
    EmailStatus.COMPLAINED,
    EmailStatus.FAILED,
  ]),
  sent_at: z.string().nullable(),
  delivered_at: z.string().nullable(),
  opened_at: z.string().nullable(),
  clicked_at: z.string().nullable(),
  bounced_at: z.string().nullable(),
  complained_at: z.string().nullable(),
  error_message: z.string().nullable(),
  retry_count: z.number().int(),
  user_id: z.string().uuid().nullable(),
  booking_id: z.string().uuid().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const emailEventSchema = z.object({
  id: z.string().uuid(),
  email_log_id: z.string().uuid().nullable(),
  resend_email_id: z.string(),
  event_type: z.string(),
  event_data: z.record(z.any()).nullable(),
  occurred_at: z.string(),
  received_at: z.string(),
  created_at: z.string(),
});

export type EmailLog = z.infer<typeof emailLogSchema>;
export type EmailEvent = z.infer<typeof emailEventSchema>;
