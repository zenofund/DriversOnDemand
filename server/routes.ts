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

      // Mock stats for now
      const stats = {
        today_trips: 3,
        today_earnings: 25000,
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

      // Mock stats for now
      const stats = {
        active_drivers: 45,
        total_clients: 230,
        total_revenue: 2500000,
        commission_earned: 250000,
        trips_today: 15,
        trips_this_month: 450,
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

          // Create transaction record
          await supabase
            .from('transactions')
            .insert([{
              driver_id: metadata.driver_id,
              paystack_ref: reference,
              amount: amount / 100,
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

          // Create transaction record
          await supabase
            .from('transactions')
            .insert([{
              booking_id: metadata.booking_id,
              driver_id: metadata.driver_id,
              paystack_ref: reference,
              amount: amount / 100,
              split_code: metadata.split_code,
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
