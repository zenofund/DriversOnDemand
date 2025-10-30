import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import crypto from "crypto";

// Supabase client setup
import { createClient } from '@supabase/supabase-js';

// Schemas
import { updateDriverProfileSchema, updateDriverBankSchema } from '../shared/schema';

// Payout service
import { getDriverPendingSettlements, processDriverPayout, getDriverPayoutHistory, processAutomatedPayouts } from './services/payoutService';

// Route service
import { getRealDistanceAndDuration, isWithinGeofence, getOptimizedRoute, calculateETA } from './services/routeService';

// Bank account service
import { verifyBankAccount, updateDriverBankDetails, getNigerianBanks } from './services/bankAccountService';

// Completion payout service
import { processCompletionPayout } from './services/completionPayoutService';

// Server should use service role key for full database access
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  throw new Error('Supabase configuration missing');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Paystack setup
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;
const PAYSTACK_PUBLIC = process.env.VITE_PAYSTACK_PUBLIC_KEY!;

export async function registerRoutes(app: Express): Promise<Server> {
  
  // ============================================================================
  // DRIVER ENDPOINTS
  // ============================================================================

  // Get current driver profile
  app.get("/api/drivers/me", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        return res.status(404).json({ error: "Driver not found" });
      }

      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get driver stats
  app.get("/api/drivers/stats", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Get driver
      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!driver) {
        return res.status(404).json({ error: "Driver not found" });
      }

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get today's completed bookings count
      const { data: todayBookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('driver_id', driver.id)
        .eq('booking_status', 'completed')
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());

      // Get today's earnings from transactions
      const { data: todayTransactions, error: txError } = await supabase
        .from('transactions')
        .select('driver_share')
        .eq('driver_id', driver.id)
        .eq('settled', true)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());

      if (txError) {
        console.error('Error fetching transactions:', txError);
      }

      const today_trips = todayBookings?.length || 0;
      const today_earnings = todayTransactions?.reduce((sum, t) => sum + (t.driver_share || 0), 0) || 0;

      const stats = {
        today_trips,
        today_earnings,
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Toggle driver online status
  app.post("/api/drivers/toggle-online", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { online } = req.body;

      const { data, error } = await supabase
        .from('drivers')
        .update({ online_status: online ? 'online' : 'offline' })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: "Failed to update status" });
      }

      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Update driver profile
  app.patch("/api/drivers/profile", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Validate request body with schema
      const validation = updateDriverProfileSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: validation.error.errors 
        });
      }

      // Only allow specific fields to be updated
      const allowedUpdates: any = {};
      const validated = validation.data;

      if (validated.full_name !== undefined) allowedUpdates.full_name = validated.full_name;
      if (validated.phone !== undefined) allowedUpdates.phone = validated.phone;
      if (validated.license_no !== undefined) allowedUpdates.license_no = validated.license_no;
      if (validated.hourly_rate !== undefined) allowedUpdates.hourly_rate = validated.hourly_rate;

      if (Object.keys(allowedUpdates).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }

      const { data, error } = await supabase
        .from('drivers')
        .update(allowedUpdates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: "Failed to update profile" });
      }

      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Update driver bank account
  app.patch("/api/drivers/bank-account", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Validate request body with schema
      const validation = updateDriverBankSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: validation.error.errors 
        });
      }

      const { bank_code, account_number } = validation.data;

      // Get driver
      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!driver) {
        return res.status(404).json({ error: "Driver not found" });
      }

      // Update bank account using service (includes Paystack verification)
      const result = await updateDriverBankDetails(driver.id, bank_code, account_number);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({ 
        success: true, 
        account_name: result.account_name,
        message: "Bank account verified and updated successfully" 
      });
    } catch (error) {
      console.error('Error updating bank account:', error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Search nearby drivers
  app.get("/api/drivers/nearby", async (req, res) => {
    try {
      // Get online drivers
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('online_status', 'online')
        .eq('verified', true)
        .limit(10);

      if (error) {
        return res.status(500).json({ error: "Failed to fetch drivers" });
      }

      res.json(data || []);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // ============================================================================
  // BOOKING ENDPOINTS
  // ============================================================================

  // Get all bookings for a client
  app.get("/api/bookings/client", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Get client profile
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!client) {
        return res.status(403).json({ error: "Only clients can access this endpoint" });
      }

      // Get all bookings for this client with driver details
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          *,
          driver:drivers(full_name, phone, rating)
        `)
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching client bookings:', error);
        return res.status(500).json({ error: "Failed to fetch bookings" });
      }

      res.json(bookings || []);
    } catch (error) {
      console.error('Server error:', error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get active bookings for driver
  app.get("/api/bookings/active", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Get driver id
      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!driver) {
        return res.json([]);
      }

      // Get bookings
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          client:clients(*)
        `)
        .eq('driver_id', driver.id)
        .in('booking_status', ['pending', 'accepted', 'ongoing'])
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(500).json({ error: "Failed to fetch bookings" });
      }

      res.json(data || []);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get booking history (completed/cancelled)
  app.get("/api/bookings/history", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Get driver id
      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!driver) {
        return res.json([]);
      }

      // Get completed or cancelled bookings
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          client:clients(*)
        `)
        .eq('driver_id', driver.id)
        .in('booking_status', ['completed', 'cancelled'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        return res.status(500).json({ error: "Failed to fetch booking history" });
      }

      res.json(data || []);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Accept booking
  app.post("/api/bookings/:id/accept", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { id } = req.params;

      const { data, error } = await supabase
        .from('bookings')
        .update({ 
          booking_status: 'accepted',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: "Failed to accept booking" });
      }

      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Create booking
  app.post("/api/bookings", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Get client id
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!client) {
        return res.status(400).json({ error: "Client not found" });
      }

      const bookingData = {
        ...req.body,
        client_id: client.id,
        payment_status: 'pending',
        booking_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('bookings')
        .insert([bookingData])
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: "Failed to create booking" });
      }

      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // ============================================================================
  // ADMIN ENDPOINTS
  // ============================================================================

  // Get admin dashboard stats
  app.get("/api/admin/stats", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Verify admin user
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Check if user is admin
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!adminUser) {
        return res.status(403).json({ error: "Forbidden - Admin access required" });
      }

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get month start date
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      // Count active (online) drivers
      const { data: driversData } = await supabase
        .from('drivers')
        .select('id')
        .eq('online_status', 'online');

      // Count total clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id');

      // Get total revenue and commission from settled transactions
      const { data: allTransactions, error: txError } = await supabase
        .from('transactions')
        .select('amount, platform_share')
        .eq('settled', true);

      if (txError) {
        console.error('Error fetching transactions:', txError);
      }

      // Get today's trips
      const { data: todayTrips } = await supabase
        .from('bookings')
        .select('id')
        .eq('booking_status', 'completed')
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());

      // Get this month's trips
      const { data: monthTrips } = await supabase
        .from('bookings')
        .select('id')
        .eq('booking_status', 'completed')
        .gte('created_at', monthStart.toISOString());

      const total_revenue = allTransactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
      const commission_earned = allTransactions?.reduce((sum, t) => sum + (t.platform_share || 0), 0) || 0;

      const stats = {
        active_drivers: driversData?.length || 0,
        total_clients: clientsData?.length || 0,
        total_revenue,
        commission_earned,
        trips_today: todayTrips?.length || 0,
        trips_this_month: monthTrips?.length || 0,
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get recent bookings for admin
  app.get("/api/admin/recent-bookings", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        return res.status(500).json({ error: "Failed to fetch bookings" });
      }

      res.json(data || []);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // ============================================================================
  // PAYSTACK WEBHOOK
  // ============================================================================

  app.post("/api/webhooks/paystack", async (req, res) => {
    try {
      const hash = crypto
        .createHmac('sha512', PAYSTACK_SECRET)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (hash !== req.headers['x-paystack-signature']) {
        return res.status(400).json({ error: "Invalid signature" });
      }

      const event = req.body;

      if (event.event === 'charge.success') {
        const { reference, amount, metadata } = event.data;

        // Handle verification payment
        if (metadata?.type === 'verification') {
          await supabase
            .from('drivers')
            .update({
              verified: true,
              verification_payment_ref: reference,
            })
            .eq('id', metadata.driver_id);

          const verificationAmount = amount / 100;
          
          // Create transaction record (verification fee goes 100% to platform)
          await supabase
            .from('transactions')
            .insert([{
              driver_id: metadata.driver_id,
              paystack_ref: reference,
              amount: verificationAmount,
              driver_share: 0,
              platform_share: verificationAmount,
              transaction_type: 'verification',
              settled: true,
              created_at: new Date().toISOString(),
            }]);
        }

        // Handle booking payment
        if (metadata?.type === 'booking') {
          await supabase
            .from('bookings')
            .update({
              payment_status: 'paid',
              updated_at: new Date().toISOString(),
            })
            .eq('id', metadata.booking_id);

          const bookingAmount = amount / 100;
          
          // Create transaction record
          // Mark as settled=false - will be settled when driver completes and confirms
          await supabase
            .from('transactions')
            .insert([{
              booking_id: metadata.booking_id,
              driver_id: metadata.driver_id,
              paystack_ref: reference,
              amount: bookingAmount,
              driver_share: 0, // Will be calculated on completion
              platform_share: 0, // Will be calculated on completion
              transaction_type: 'booking',
              settled: false,
              created_at: new Date().toISOString(),
            }]);
        }
      }

      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // ============================================================================
  // PAYSTACK PAYMENT INITIALIZATION
  // ============================================================================

  // Initialize driver verification payment
  app.post("/api/payments/verify-driver", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Get driver
      const { data: driver } = await supabase
        .from('drivers')
        .select('id, email, full_name')
        .eq('user_id', user.id)
        .single();

      if (!driver) {
        return res.status(404).json({ error: "Driver not found" });
      }

      // Initialize Paystack payment
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: driver.email,
          amount: 500000, // ₦5,000 in kobo
          metadata: {
            type: 'verification',
            driver_id: driver.id,
            driver_name: driver.full_name,
          },
          callback_url: `${process.env.VITE_SUPABASE_URL || ''}/driver/dashboard`,
        }),
      });

      const data = await response.json();

      if (!data.status) {
        return res.status(500).json({ error: "Failed to initialize payment" });
      }

      res.json({
        authorization_url: data.data.authorization_url,
        reference: data.data.reference,
      });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Initialize booking payment
  app.post("/api/payments/initialize-booking", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { bookingId } = req.body;

      // Get booking details with driver info
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          driver:drivers(id, email, paystack_subaccount_code),
          client:clients(id, email, user_id)
        `)
        .eq('id', bookingId)
        .single();

      if (bookingError || !booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      // Verify booking ownership - must belong to authenticated user
      if (booking.client?.user_id !== user.id) {
        return res.status(403).json({ error: "Unauthorized - not your booking" });
      }

      // Use total_cost from booking record (server-side authority)
      const bookingAmount = booking.total_cost;

      if (!bookingAmount || bookingAmount <= 0) {
        return res.status(400).json({ error: "Invalid booking amount" });
      }

      // Prepare payment request - simple charge, no split yet
      // Money stays in platform balance until completion is confirmed
      const paymentData: any = {
        email: booking.client?.email,
        amount: Math.round(bookingAmount * 100), // Convert to kobo
        metadata: {
          type: 'booking',
          booking_id: bookingId,
          driver_id: booking.driver_id,
        },
        callback_url: `${process.env.VITE_SUPABASE_URL || ''}/client/bookings`,
      };

      // Initialize Paystack payment (no split - hold funds in platform balance)
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      const data = await response.json();

      if (!data.status) {
        return res.status(500).json({ error: "Failed to initialize payment" });
      }

      res.json({
        authorization_url: data.data.authorization_url,
        reference: data.data.reference,
      });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Create Paystack subaccount for driver
  app.post("/api/payments/create-subaccount", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { bankCode, accountNumber } = req.body;

      // Get driver
      const { data: driver } = await supabase
        .from('drivers')
        .select('id, email, full_name, verified')
        .eq('user_id', user.id)
        .single();

      if (!driver) {
        return res.status(404).json({ error: "Driver not found" });
      }

      if (!driver.verified) {
        return res.status(403).json({ error: "Driver must be verified first" });
      }

      // Create Paystack subaccount
      const response = await fetch('https://api.paystack.co/subaccount', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_name: driver.full_name,
          settlement_bank: bankCode,
          account_number: accountNumber,
          percentage_charge: 10, // Platform takes 10%
        }),
      });

      const data = await response.json();

      if (!data.status) {
        return res.status(500).json({ error: data.message || "Failed to create subaccount" });
      }

      // Save subaccount code to driver profile
      await supabase
        .from('drivers')
        .update({
          paystack_subaccount_code: data.data.subaccount_code,
        })
        .eq('id', driver.id);

      res.json({
        subaccount_code: data.data.subaccount_code,
        message: "Subaccount created successfully",
      });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/payments/initialize", async (req, res) => {
    try {
      const { email, amount, metadata } = req.body;

      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          amount: amount * 100, // Convert to kobo
          metadata,
          callback_url: `${req.protocol}://${req.get('host')}/payment/callback`,
        }),
      });

      const data = await response.json();

      if (!data.status) {
        return res.status(400).json({ error: "Payment initialization failed" });
      }

      res.json(data.data);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // ============================================================================
  // RATINGS ENDPOINTS
  // ============================================================================

  // Get ratings for a driver
  app.get("/api/ratings/driver/:driverId", async (req, res) => {
    try {
      const { driverId } = req.params;

      const { data: ratings, error } = await supabase
        .from('ratings')
        .select(`
          *,
          client:clients(full_name)
        `)
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.json(ratings || []);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Submit a new rating
  app.post("/api/ratings", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { booking_id, rating, review } = req.body;

      // Get client ID
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!client) {
        return res.status(403).json({ error: "Only clients can submit ratings" });
      }

      // Get booking to verify ownership and status
      const { data: booking } = await supabase
        .from('bookings')
        .select('client_id, driver_id, booking_status')
        .eq('id', booking_id)
        .single();

      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      if (booking.client_id !== client.id) {
        return res.status(403).json({ error: "You can only rate your own bookings" });
      }

      if (booking.booking_status !== 'completed') {
        return res.status(400).json({ error: "Can only rate completed bookings" });
      }

      // Check if rating already exists
      const { data: existingRating } = await supabase
        .from('ratings')
        .select('id')
        .eq('booking_id', booking_id)
        .single();

      if (existingRating) {
        return res.status(400).json({ error: "This booking has already been rated" });
      }

      // Insert rating
      const { data: newRating, error } = await supabase
        .from('ratings')
        .insert([{
          booking_id,
          client_id: client.id,
          driver_id: booking.driver_id,
          rating,
          review: review || null,
        }])
        .select()
        .single();

      if (error) throw error;

      // Update driver's average rating
      const { data: driverRatings } = await supabase
        .from('ratings')
        .select('rating')
        .eq('driver_id', booking.driver_id);

      if (driverRatings && driverRatings.length > 0) {
        const avgRating = driverRatings.reduce((sum, r) => sum + r.rating, 0) / driverRatings.length;
        
        await supabase
          .from('drivers')
          .update({ rating: avgRating })
          .eq('id', booking.driver_id);
      }

      res.json(newRating);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get existing rating for a booking
  app.get("/api/ratings/booking/:bookingId", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { bookingId } = req.params;

      // Get client ID
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!client) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Get rating for this booking
      const { data: rating, error } = await supabase
        .from('ratings')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('client_id', client.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        throw error;
      }

      res.json(rating || null);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Update a rating
  app.put("/api/ratings/:id", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { id } = req.params;
      const { rating, review } = req.body;

      // Get client ID
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!client) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Verify ownership
      const { data: existingRating } = await supabase
        .from('ratings')
        .select('client_id, driver_id')
        .eq('id', id)
        .single();

      if (!existingRating) {
        return res.status(404).json({ error: "Rating not found" });
      }

      if (existingRating.client_id !== client.id) {
        return res.status(403).json({ error: "You can only update your own ratings" });
      }

      // Update rating
      const { data: updatedRating, error } = await supabase
        .from('ratings')
        .update({ rating, review: review || null })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Recalculate driver's average rating
      const { data: driverRatings } = await supabase
        .from('ratings')
        .select('rating')
        .eq('driver_id', existingRating.driver_id);

      if (driverRatings && driverRatings.length > 0) {
        const avgRating = driverRatings.reduce((sum, r) => sum + r.rating, 0) / driverRatings.length;
        
        await supabase
          .from('drivers')
          .update({ rating: avgRating })
          .eq('id', existingRating.driver_id);
      }

      res.json(updatedRating);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // ============================================================================
  // NOTIFICATIONS ENDPOINTS
  // ============================================================================

  // Get user's notification preferences
  app.get("/api/notifications/preferences", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      let { data: prefs } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Create default preferences if none exist
      if (!prefs) {
        const { data: newPrefs } = await supabase
          .from('notification_preferences')
          .insert([{ user_id: user.id }])
          .select()
          .single();
        prefs = newPrefs;
      }

      res.json(prefs);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Update notification preferences
  app.put("/api/notifications/preferences", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const updates = req.body;

      const { data, error } = await supabase
        .from('notification_preferences')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get user's notification logs
  app.get("/api/notifications/logs", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { data: logs, error } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      res.json(logs || []);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Mark notification as read
  app.put("/api/notifications/:id/read", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { id } = req.params;

      const { data, error } = await supabase
        .from('notification_logs')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // ============================================================================
  // BANK ACCOUNT MANAGEMENT ENDPOINTS
  // ============================================================================

  // Get list of Nigerian banks
  app.get("/api/banks", async (req, res) => {
    try {
      const banks = await getNigerianBanks();
      res.json(banks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch banks" });
    }
  });

  // Update driver bank details
  app.post("/api/drivers/bank-account", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!driver) {
        return res.status(403).json({ error: "Only drivers can set bank accounts" });
      }

      const { bank_code, account_number } = req.body;

      if (!bank_code || !account_number) {
        return res.status(400).json({ error: "Bank code and account number required" });
      }

      const result = await updateDriverBankDetails(
        driver.id,
        bank_code,
        account_number
      );

      if (result.success) {
        res.json({
          success: true,
          account_name: result.account_name,
        });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // ============================================================================
  // COMPLETION CONFIRMATION ENDPOINTS
  // ============================================================================

  // Driver confirms completion
  app.post("/api/bookings/:id/driver-confirm", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!driver) {
        return res.status(403).json({ error: "Only drivers can confirm" });
      }

      const { id: bookingId } = req.params;

      // Verify booking belongs to driver
      const { data: booking } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .eq('driver_id', driver.id)
        .single();

      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      // Update driver confirmation
      await supabase
        .from('bookings')
        .update({
          driver_confirmed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      // Check if both confirmed
      if (booking.client_confirmed) {
        // Process payout
        const result = await processCompletionPayout(bookingId);
        if (result.success) {
          res.json({
            success: true,
            message: 'Completion confirmed. Payment processed.',
          });
        } else {
          res.json({
            success: true,
            message: 'Completion confirmed. Payment processing pending.',
            payout_error: result.error,
          });
        }
      } else {
        res.json({
          success: true,
          message: 'Waiting for client confirmation',
        });
      }
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Client confirms completion
  app.post("/api/bookings/:id/client-confirm", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!client) {
        return res.status(403).json({ error: "Only clients can confirm" });
      }

      const { id: bookingId } = req.params;

      // Verify booking belongs to client
      const { data: booking } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .eq('client_id', client.id)
        .single();

      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      // Update client confirmation
      await supabase
        .from('bookings')
        .update({
          client_confirmed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      // Check if both confirmed
      if (booking.driver_confirmed) {
        // Process payout
        const result = await processCompletionPayout(bookingId);
        if (result.success) {
          res.json({
            success: true,
            message: 'Completion confirmed. Payment processed.',
          });
        } else {
          res.json({
            success: true,
            message: 'Completion confirmed. Payment processing pending.',
            payout_error: result.error,
          });
        }
      } else {
        res.json({
          success: true,
          message: 'Waiting for driver confirmation',
        });
      }
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // ============================================================================
  // PLATFORM SETTINGS ENDPOINTS (Admin)
  // ============================================================================

  // Get platform settings
  app.get("/api/admin/settings", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Verify admin access
      const { data: admin } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!admin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { data: settings } = await supabase
        .from('platform_settings')
        .select('*')
        .order('setting_key');

      res.json(settings || []);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Update commission percentage (super admin only)
  app.put("/api/admin/settings/commission", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Verify super admin access
      const { data: admin } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .eq('role', 'super_admin')
        .eq('is_active', true)
        .single();

      if (!admin) {
        return res.status(403).json({ error: "Super admin access required" });
      }

      const { commission_percentage } = req.body;

      if (commission_percentage === undefined || commission_percentage < 0 || commission_percentage > 100) {
        return res.status(400).json({ error: "Commission must be between 0 and 100" });
      }

      const { error } = await supabase
        .from('platform_settings')
        .update({
          setting_value: commission_percentage.toString(),
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('setting_key', 'commission_percentage');

      if (error) {
        return res.status(500).json({ error: "Failed to update commission" });
      }

      res.json({
        success: true,
        commission_percentage,
      });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // ============================================================================
  // PAYOUT ENDPOINTS (LEGACY - TO BE REMOVED)
  // ============================================================================

  // Get driver's pending settlements
  app.get("/api/payouts/pending", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!driver) {
        return res.status(403).json({ error: "Only drivers can access payouts" });
      }

      const settlements = await getDriverPendingSettlements(driver.id);
      res.json(settlements);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get driver's payout history
  app.get("/api/payouts/history", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!driver) {
        return res.status(403).json({ error: "Only drivers can access payouts" });
      }

      const payouts = await getDriverPayoutHistory(driver.id);
      res.json(payouts);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Request a payout (driver)
  app.post("/api/payouts/request", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { data: driver } = await supabase
        .from('drivers')
        .select('id, bank_code, account_number, full_name')
        .eq('user_id', user.id)
        .single();

      if (!driver) {
        return res.status(403).json({ error: "Only drivers can request payouts" });
      }

      const { bank_code, account_number, account_name } = req.body;

      if (!bank_code || !account_number || !account_name) {
        return res.status(400).json({ error: "Bank details required" });
      }

      const result = await processDriverPayout(
        driver.id,
        bank_code,
        account_number,
        account_name
      );

      if (result.success) {
        res.json({ success: true, payout_id: result.payout_id });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Calculate real distance and duration for a route
  app.post("/api/routes/calculate", async (req, res) => {
    try {
      const { origin, destination } = req.body;

      if (!origin || !destination) {
        return res.status(400).json({ error: "Origin and destination required" });
      }

      const result = await getRealDistanceAndDuration(origin, destination);

      if (!result) {
        return res.status(500).json({ error: "Failed to calculate route" });
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Check if driver is within geofence
  app.post("/api/routes/check-geofence", async (req, res) => {
    try {
      const { driver_location, target_location, radius_km } = req.body;

      if (!driver_location || !target_location) {
        return res.status(400).json({ error: "Locations required" });
      }

      const isWithin = isWithinGeofence(
        driver_location,
        target_location,
        radius_km || 0.5
      );

      res.json({ is_within_geofence: isWithin });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get optimized route
  app.post("/api/routes/optimize", async (req, res) => {
    try {
      const { origin, destination, waypoints } = req.body;

      if (!origin || !destination) {
        return res.status(400).json({ error: "Origin and destination required" });
      }

      const route = await getOptimizedRoute(origin, destination, waypoints);

      if (!route) {
        return res.status(500).json({ error: "Failed to get optimized route" });
      }

      res.json(route);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin: Run automated payouts
  app.post("/api/admin/payouts/process-all", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Verify admin access
      const { data: admin } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!admin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const result = await processAutomatedPayouts();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // ============================================================================
  // MESSAGES ENDPOINTS
  // ============================================================================

  // Get messages for a booking
  app.get("/api/messages/:bookingId", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { bookingId } = req.params;

      // Verify user is participant in this booking
      const { data: booking } = await supabase
        .from('bookings')
        .select('client_id, driver_id')
        .eq('id', bookingId)
        .single();

      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      // Check if user is either the client or driver
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const isParticipant = 
        (client && booking.client_id === client.id) ||
        (driver && booking.driver_id === driver.id);

      if (!isParticipant) {
        return res.status(403).json({ error: "Not authorized to view these messages" });
      }

      // Get messages
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      res.json(messages || []);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Send a message
  app.post("/api/messages", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { booking_id, message } = req.body;

      // Verify user is participant in this booking
      const { data: booking } = await supabase
        .from('bookings')
        .select('client_id, driver_id')
        .eq('id', booking_id)
        .single();

      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      // Determine user role and verify participation
      let senderRole: 'driver' | 'client' | null = null;

      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (client && booking.client_id === client.id) {
        senderRole = 'client';
      } else if (driver && booking.driver_id === driver.id) {
        senderRole = 'driver';
      }

      if (!senderRole) {
        return res.status(403).json({ error: "Not authorized to send messages in this booking" });
      }

      // Insert message
      const { data: newMessage, error } = await supabase
        .from('messages')
        .insert([{
          booking_id,
          sender_id: user.id,
          sender_role: senderRole,
          message,
        }])
        .select()
        .single();

      if (error) throw error;

      res.json(newMessage);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
