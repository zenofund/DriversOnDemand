import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import crypto from "crypto";

// Supabase client setup
import { createClient } from '@supabase/supabase-js';

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
          // Calculate split: 90% driver, 10% platform
          const platformShare = bookingAmount * 0.10;
          const driverShare = bookingAmount * 0.90;

          // Create transaction record
          // Mark as settled=true because webhook confirms successful payment
          await supabase
            .from('transactions')
            .insert([{
              booking_id: metadata.booking_id,
              driver_id: metadata.driver_id,
              paystack_ref: reference,
              amount: bookingAmount,
              driver_share: driverShare,
              platform_share: platformShare,
              split_code: metadata.split_code,
              transaction_type: 'booking',
              settled: true,
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

      // Prepare payment request
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

      // Add split payment if driver has subaccount
      // The subaccount was created with percentage_charge=10, so Paystack will
      // automatically split: 90% to driver's subaccount, 10% to platform
      if (booking.driver?.paystack_subaccount_code) {
        paymentData.subaccount = booking.driver.paystack_subaccount_code;
      }

      // Initialize Paystack payment
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

  const httpServer = createServer(app);

  return httpServer;
}
