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

// Payment finalization service
import { finalizeBookingFromPayment } from './services/paymentFinalizationService';

// NIN verification service
import { ninVerificationService } from './services/ninVerificationService';

// Email service
import { sendEmail, emailTemplates } from './services/emailService';
import { EmailType } from '../shared/schema';

// Paystack verification service
import { verifyDriverVerificationPayment } from './services/paystackService';

// Svix for webhook verification
import { Webhook } from 'svix';

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
      if (typeof online !== 'boolean') {
        return res.status(400).json({ error: "Invalid request: 'online' must be a boolean" });
      }

      const onlineStatus = online ? 'online' : 'offline';

      const { data, error } = await supabase
        .from('drivers')
        .update({ online_status: onlineStatus })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating online status:', error);
        return res.status(500).json({ error: "Failed to update online status" });
      }

      res.json({ 
        success: true, 
        online_status: data.online_status,
        message: `Driver is now ${onlineStatus}` 
      });
    } catch (error) {
      console.error('Error in toggle-online endpoint:', error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Update driver location
  app.patch("/api/drivers/location", async (req, res) => {
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

      const { lat, lng } = req.body;
      
      // Validate coordinates
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        return res.status(400).json({ error: "Invalid coordinates: lat and lng must be numbers" });
      }

      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({ error: "Invalid coordinates: out of range" });
      }

      const { data, error } = await supabase
        .from('drivers')
        .update({ current_location: { lat, lng } })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating location:', error);
        return res.status(500).json({ error: "Failed to update location" });
      }

      res.json({ 
        success: true, 
        current_location: data.current_location,
        message: "Location updated successfully" 
      });
    } catch (error) {
      console.error('Error in location update endpoint:', error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Search nearby drivers
  app.get("/api/drivers/nearby", async (req, res) => {
    try {
      const { lat, lng } = req.query;

      // Validate coordinates
      if (!lat || !lng) {
        return res.status(400).json({ error: "Latitude and longitude are required" });
      }

      const clientLat = parseFloat(lat as string);
      const clientLng = parseFloat(lng as string);

      if (isNaN(clientLat) || isNaN(clientLng)) {
        return res.status(400).json({ error: "Invalid coordinates" });
      }

      // Get online and verified drivers
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('online_status', 'online')
        .eq('verified', true);

      if (error) {
        return res.status(500).json({ error: "Failed to fetch drivers" });
      }

      // Filter drivers within 20km using Haversine formula
      const MAX_DISTANCE_KM = 20;
      const nearbyDrivers = (data || []).filter(driver => {
        if (!driver.current_location || 
            driver.current_location.lat == null || 
            driver.current_location.lng == null) {
          return false; // Skip drivers without location
        }

        const driverLat = driver.current_location.lat;
        const driverLng = driver.current_location.lng;

        // Haversine formula to calculate distance
        const R = 6371; // Earth's radius in km
        const dLat = (driverLat - clientLat) * Math.PI / 180;
        const dLng = (driverLng - clientLng) * Math.PI / 180;
        const a = 
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(clientLat * Math.PI / 180) * Math.cos(driverLat * Math.PI / 180) *
          Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        // Add distance to driver object for sorting
        driver.distance_km = Math.round(distance * 10) / 10; // Round to 1 decimal

        return distance <= MAX_DISTANCE_KM;
      });

      // Sort by distance (closest first) and limit to 10
      const sortedDrivers = nearbyDrivers
        .sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0))
        .slice(0, 10);

      res.json(sortedDrivers);
    } catch (error) {
      console.error('Error in nearby drivers endpoint:', error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // ============================================================================
  // CLIENT ENDPOINTS
  // ============================================================================

  // Get current client profile
  app.get("/api/clients/me", async (req, res) => {
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
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        return res.status(404).json({ error: "Client not found" });
      }

      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Update client profile
  app.patch("/api/clients/profile", async (req, res) => {
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

      const allowedUpdates: any = {};
      const { full_name, phone, profile_picture_url } = req.body;

      if (full_name !== undefined) allowedUpdates.full_name = full_name;
      if (phone !== undefined) allowedUpdates.phone = phone;
      if (profile_picture_url !== undefined) allowedUpdates.profile_picture_url = profile_picture_url;

      if (Object.keys(allowedUpdates).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }

      const { data, error } = await supabase
        .from('clients')
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

  // Get NIN verification status
  app.get("/api/clients/verification-status", async (req, res) => {
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
        return res.status(404).json({ error: "Client not found" });
      }

      const status = await ninVerificationService.getVerificationStatus(client.id);
      res.json(status);
    } catch (error) {
      console.error('Error getting verification status:', error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Verify NIN
  app.post("/api/clients/verify-nin", async (req, res) => {
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
        return res.status(404).json({ error: "Client not found" });
      }

      const { nin, selfie } = req.body;

      if (!nin || typeof nin !== 'string') {
        return res.status(400).json({ error: "NIN is required" });
      }

      if (!/^\d{11}$/.test(nin)) {
        return res.status(400).json({ error: "NIN must be exactly 11 digits" });
      }

      const result = await ninVerificationService.verifyNIN({
        nin,
        selfieBase64: selfie,
        clientId: client.id,
      });

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error verifying NIN:', error);
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

      // Get driver id
      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!driver) {
        return res.status(403).json({ error: "Only drivers can accept bookings" });
      }

      // Verify driver owns this booking and it's in pending status
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('id, booking_status, driver_id')
        .eq('id', id)
        .single();

      if (fetchError || !booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      if (booking.driver_id !== driver.id) {
        return res.status(403).json({ error: "You can only accept your own bookings" });
      }

      if (booking.booking_status !== 'pending') {
        return res.status(400).json({ error: "Booking is not in pending status" });
      }

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
      console.error('Error accepting booking:', error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Reject booking
  app.post("/api/bookings/:id/reject", async (req, res) => {
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

      // Get driver id
      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!driver) {
        return res.status(403).json({ error: "Only drivers can reject bookings" });
      }

      // Verify driver owns this booking and it's in pending status
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('id, booking_status, driver_id, payment_status, client_id')
        .eq('id', id)
        .single();

      if (fetchError || !booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      if (booking.driver_id !== driver.id) {
        return res.status(403).json({ error: "You can only reject your own bookings" });
      }

      if (booking.booking_status !== 'pending') {
        return res.status(400).json({ error: "Only pending bookings can be rejected" });
      }

      // Update booking status to cancelled
      const { data, error } = await supabase
        .from('bookings')
        .update({ 
          booking_status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error rejecting booking:', error);
        return res.status(500).json({ error: "Failed to reject booking" });
      }

      // Handle payment refund if booking was paid
      if (booking.payment_status === 'paid') {
        // Mark transaction for refund by admin
        // In future: implement Paystack refund API automation
        console.log(`REFUND REQUIRED: Booking ${id} rejected by driver ${driver.id}. Client ${booking.client_id} needs refund.`);
        
        // Update transaction to flag it needs refund
        const { error: txError } = await supabase
          .from('transactions')
          .update({ 
            settled: false,
            // Note: In future, add refund_status='pending' field to transactions table
          })
          .eq('booking_id', id);

        if (txError) {
          console.error('Failed to update transaction for refund:', txError);
          // Don't fail the rejection - admin can manually handle refund
        }
      }

      console.log(`Booking ${id} rejected by driver ${driver.id}. Payment status: ${booking.payment_status}`);

      const responseMessage = booking.payment_status === 'paid' 
        ? "Booking rejected. Refund will be processed by admin within 24 hours."
        : "Booking rejected successfully";

      res.json({ 
        success: true, 
        booking: data,
        message: responseMessage
      });
    } catch (error) {
      console.error('Error in reject booking endpoint:', error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get single booking
  app.get("/api/bookings/:id", async (req, res) => {
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

      const { data: booking, error } = await supabase
        .from('bookings')
        .select(`
          *,
          driver:drivers(id, full_name, phone, profile_picture_url),
          client:clients(id, full_name, phone, profile_picture_url)
        `)
        .eq('id', id)
        .single();

      if (error) {
        return res.status(404).json({ error: "Booking not found" });
      }

      // Verify user is participant
      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const isParticipant = 
        (client && booking.client_id === client.id) ||
        (driver && booking.driver_id === driver.id);

      if (!isParticipant) {
        return res.status(403).json({ error: "Not authorized to view this booking" });
      }

      res.json(booking);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Create pending booking
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

      // Create pending booking instead of actual booking
      // This prevents bookings from being created before payment succeeds
      const pendingBookingData = {
        ...req.body,
        client_id: client.id,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour expiry
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('pending_bookings')
        .insert([pendingBookingData])
        .select()
        .single();

      if (error) {
        console.error('Failed to create pending booking:', error);
        return res.status(500).json({ error: "Failed to create pending booking" });
      }

      console.log('Pending booking created:', data.id);
      res.json(data);
    } catch (error) {
      console.error('Server error in create pending booking:', error);
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

  // Get all drivers (admin)
  app.get("/api/admin/drivers", async (req, res) => {
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
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!admin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { data: drivers, error } = await supabase
        .from('drivers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(500).json({ error: "Failed to fetch drivers" });
      }

      res.json(drivers || []);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get all clients (admin)
  app.get("/api/admin/clients", async (req, res) => {
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
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!admin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { data: clients, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(500).json({ error: "Failed to fetch clients" });
      }

      res.json(clients || []);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Update driver status (admin)
  app.patch("/api/admin/drivers/:id", async (req, res) => {
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
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!admin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { id } = req.params;
      const updates = req.body;

      const { data, error } = await supabase
        .from('drivers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: "Failed to update driver" });
      }

      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get all bookings (admin)
  app.get("/api/admin/bookings", async (req, res) => {
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
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!admin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          *,
          driver:drivers(id, full_name, email, phone),
          client:clients(id, full_name, email, phone)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(500).json({ error: "Failed to fetch bookings" });
      }

      res.json(bookings || []);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get all transactions (admin)
  app.get("/api/admin/transactions", async (req, res) => {
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
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!admin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select(`
          *,
          driver:drivers(id, full_name, email),
          booking:bookings(id, start_location, destination)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(500).json({ error: "Failed to fetch transactions" });
      }

      res.json(transactions || []);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get all disputes (admin)
  app.get("/api/admin/disputes", async (req, res) => {
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
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!admin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { data: disputes, error } = await supabase
        .from('disputes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(500).json({ error: "Failed to fetch disputes" });
      }

      res.json(disputes || []);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Update dispute (admin)
  app.patch("/api/admin/disputes/:id", async (req, res) => {
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
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!admin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { id } = req.params;
      const updates = {
        ...req.body,
        updated_at: new Date().toISOString(),
      };

      // If marking as resolved, add resolved info
      if (updates.status === 'resolved' || updates.status === 'closed') {
        updates.resolved_by = user.id;
        updates.resolved_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('disputes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: "Failed to update dispute" });
      }

      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Create dispute (users)
  app.post("/api/disputes", async (req, res) => {
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

      const { booking_id, dispute_type, description } = req.body;

      // Determine user role
      let userRole: 'driver' | 'client' | null = null;

      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (driver) {
        userRole = 'driver';
      } else if (client) {
        userRole = 'client';
      }

      if (!userRole) {
        return res.status(403).json({ error: "Only drivers or clients can create disputes" });
      }

      // Verify booking exists and user is participant
      const { data: booking } = await supabase
        .from('bookings')
        .select('client_id, driver_id')
        .eq('id', booking_id)
        .single();

      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      const isParticipant = 
        (client && booking.client_id === client.id) ||
        (driver && booking.driver_id === driver.id);

      if (!isParticipant) {
        return res.status(403).json({ error: "You can only create disputes for your own bookings" });
      }

      // Create dispute
      const { data: newDispute, error } = await supabase
        .from('disputes')
        .insert([{
          booking_id,
          reported_by_user_id: user.id,
          reported_by_role: userRole,
          dispute_type,
          description,
          status: 'open',
          priority: 'medium',
        }])
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: "Failed to create dispute" });
      }

      res.json(newDispute);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get user's disputes
  app.get("/api/disputes", async (req, res) => {
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

      const { data: disputes, error } = await supabase
        .from('disputes')
        .select('*')
        .eq('reported_by_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(500).json({ error: "Failed to fetch disputes" });
      }

      res.json(disputes || []);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // ============================================================================
  // PAYSTACK WEBHOOK
  // ============================================================================

  app.post("/api/webhooks/paystack", async (req, res) => {
    try {
      // Use rawBody for signature verification (not JSON.stringify)
      const payload = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body);
      
      const hash = crypto
        .createHmac('sha512', PAYSTACK_SECRET)
        .update(payload)
        .digest('hex');

      if (hash !== req.headers['x-paystack-signature']) {
        console.error('Paystack webhook: Invalid signature');
        return res.status(400).json({ error: "Invalid signature" });
      }

      const event = req.body;
      console.log('Paystack webhook event:', event.event, 'metadata:', event.data?.metadata);

      if (event.event === 'charge.success') {
        const { reference, amount, metadata } = event.data;

        // Handle verification payment using shared verification service
        if (metadata?.type === 'verification') {
          console.log('Webhook: Processing verification payment for driver:', metadata.driver_id);
          
          const result = await verifyDriverVerificationPayment(reference, metadata.driver_id);
          
          if (result.success) {
            console.log('Webhook: Driver verified successfully via service');
          } else {
            console.error('Webhook: Verification failed:', result.error);
          }
        }

        // Handle booking payment using shared finalization service
        if (metadata?.type === 'booking') {
          const bookingAmount = amount / 100;
          const result = await finalizeBookingFromPayment(reference, metadata, bookingAmount);
          
          if (result.success) {
            console.log('Webhook: Booking finalized successfully:', result.booking_id);
          } else if (result.already_processed) {
            console.log('Webhook: Payment already processed, skipping');
          } else {
            console.error('Webhook: Failed to finalize booking:', result.error);
          }
        }
      }

      res.sendStatus(200);
    } catch (error) {
      console.error('Paystack webhook error:', error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // ============================================================================
  // RESEND EMAIL WEBHOOK (with Svix signature verification)
  // ============================================================================

  app.post("/api/webhooks/resend", async (req, res) => {
    try {
      const RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET;
      
      if (!RESEND_WEBHOOK_SECRET) {
        console.error('RESEND_WEBHOOK_SECRET not configured');
        return res.status(500).json({ error: "Webhook secret not configured" });
      }

      // Get Svix headers for signature verification
      const svixId = req.headers['svix-id'] as string;
      const svixTimestamp = req.headers['svix-timestamp'] as string;
      const svixSignature = req.headers['svix-signature'] as string;

      if (!svixId || !svixTimestamp || !svixSignature) {
        console.error('Missing Svix headers');
        return res.status(400).json({ error: "Missing signature headers" });
      }

      // Check for replay attack using svix-id (idempotency)
      // Use ->> operator to extract JSON field as text (not ->)
      const { data: existingEvent } = await supabase
        .from('email_events')
        .select('id')
        .eq('event_data->>svix_id', svixId)
        .maybeSingle(); // Use maybeSingle to avoid error when not found

      if (existingEvent) {
        console.log('Duplicate webhook event detected (svix-id already processed):', svixId);
        return res.sendStatus(200); // Acknowledge but don't process
      }

      // Verify webhook signature using Svix
      const wh = new Webhook(RESEND_WEBHOOK_SECRET);
      
      let payload: string;
      if (req.rawBody && Buffer.isBuffer(req.rawBody)) {
        payload = req.rawBody.toString('utf-8');
      } else {
        payload = JSON.stringify(req.body);
      }

      let verifiedPayload: any;
      try {
        verifiedPayload = wh.verify(payload, {
          'svix-id': svixId,
          'svix-timestamp': svixTimestamp,
          'svix-signature': svixSignature,
        }) as any;
      } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(401).json({ error: "Invalid signature" });
      }

      // Extract event data from verified payload
      const { type, data } = verifiedPayload;
      const emailId = data.email_id;

      console.log('Resend webhook event (verified):', type, 'email_id:', emailId, 'svix-id:', svixId);

      // Find the email log by Resend email ID
      const { data: emailLog, error: findError } = await supabase
        .from('email_logs')
        .select('id')
        .eq('resend_email_id', emailId)
        .single();

      if (findError || !emailLog) {
        console.error('Email log not found for Resend ID:', emailId);
        // Still return 200 to avoid Resend retries
        return res.sendStatus(200);
      }

      // Log the webhook event with svix-id for replay protection
      const eventData = {
        ...data,
        svix_id: svixId,
        svix_timestamp: svixTimestamp
      };

      await supabase
        .from('email_events')
        .insert({
          email_log_id: emailLog.id,
          resend_email_id: emailId,
          event_type: type,
          event_data: eventData,
          occurred_at: data.created_at || new Date().toISOString(),
        });

      // Update email log based on event type
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      switch (type) {
        case 'email.sent':
          updateData.status = 'sent';
          updateData.sent_at = data.created_at || new Date().toISOString();
          break;

        case 'email.delivered':
          updateData.status = 'delivered';
          updateData.delivered_at = data.created_at || new Date().toISOString();
          break;

        case 'email.delivery_delayed':
          // Keep current status, just log the event
          console.log('Email delivery delayed:', emailId);
          break;

        case 'email.complained':
          updateData.status = 'complained';
          updateData.complained_at = data.created_at || new Date().toISOString();
          break;

        case 'email.bounced':
          updateData.status = 'bounced';
          updateData.bounced_at = data.created_at || new Date().toISOString();
          if (data.bounce_classification) {
            updateData.error_message = `Bounced: ${data.bounce_classification}`;
          }
          break;

        case 'email.opened':
          updateData.opened_at = data.created_at || new Date().toISOString();
          break;

        case 'email.clicked':
          updateData.clicked_at = data.created_at || new Date().toISOString();
          break;

        default:
          console.log('Unhandled Resend event type:', type);
      }

      // Update email log if we have status changes
      if (Object.keys(updateData).length > 1) { // More than just updated_at
        await supabase
          .from('email_logs')
          .update(updateData)
          .eq('id', emailLog.id);
      }

      res.sendStatus(200);
    } catch (error) {
      console.error('Resend webhook error:', error);
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

      // Construct the callback URL from the request
      const callbackUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

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
          callback_url: `${callbackUrl}/driver/dashboard`,
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

  // Confirm driver verification payment (manual/auto verification)
  app.post("/api/drivers/verification/confirm", async (req, res) => {
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
        .select('id, verified, verification_payment_ref')
        .eq('user_id', user.id)
        .single();

      if (!driver) {
        return res.status(404).json({ error: "Driver not found" });
      }

      const { reference } = req.body;

      if (!reference || typeof reference !== 'string') {
        return res.status(400).json({ error: "Payment reference is required" });
      }

      // Call Paystack verification service
      const result = await verifyDriverVerificationPayment(reference, driver.id);

      if (!result.success) {
        console.error('Verification failed:', result.error);
        return res.status(400).json({ 
          error: result.error || 'Verification failed',
          verified: false
        });
      }

      // Refetch driver to get updated data
      const { data: updatedDriver } = await supabase
        .from('drivers')
        .select('id, verified, verification_payment_ref')
        .eq('id', driver.id)
        .single();

      res.json({
        success: true,
        verified: updatedDriver?.verified || false,
        message: result.message,
        data: result.data
      });
    } catch (error) {
      console.error('Verification endpoint error:', error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Confirm booking payment (manual/auto verification after Paystack redirect)
  app.post("/api/payments/verify-booking", async (req, res) => {
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

      const { reference } = req.body;

      if (!reference || typeof reference !== 'string') {
        return res.status(400).json({ error: "Payment reference is required" });
      }

      console.log('Manual booking payment verification requested:', reference);

      // Call Paystack API to verify transaction
      const paystackResponse = await fetch(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${PAYSTACK_SECRET}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!paystackResponse.ok) {
        const errorData = await paystackResponse.json().catch(() => ({}));
        return res.status(400).json({
          error: `Payment verification failed: ${errorData.message || paystackResponse.statusText}`
        });
      }

      const paystackResult = await paystackResponse.json();

      if (!paystackResult.status || !paystackResult.data) {
        return res.status(400).json({ error: 'Invalid response from payment provider' });
      }

      const { data: txData } = paystackResult;

      // Check if payment was successful
      if (txData.status !== 'success') {
        return res.status(400).json({
          error: `Payment not successful: ${txData.status}`,
          status: txData.status
        });
      }

      // Validate metadata
      if (txData.metadata?.type !== 'booking') {
        return res.status(400).json({
          error: 'Transaction is not a booking payment'
        });
      }

      // Call finalization service
      const bookingAmount = txData.amount / 100;
      const result = await finalizeBookingFromPayment(reference, txData.metadata, bookingAmount);

      if (!result.success) {
        console.error('Booking finalization failed:', result.error);
        return res.status(400).json({
          error: result.error || 'Failed to create booking',
          verified: false
        });
      }

      // Return success with booking ID
      res.json({
        success: true,
        verified: true,
        booking_id: result.booking_id,
        already_processed: result.already_processed,
        message: result.already_processed 
          ? 'Booking already created from this payment' 
          : 'Booking created successfully!'
      });
    } catch (error) {
      console.error('Booking verification endpoint error:', error);
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

      const { pending_booking_id } = req.body;

      if (!pending_booking_id) {
        return res.status(400).json({ error: "Missing pending_booking_id" });
      }

      // Get pending booking details with driver and client info
      const { data: pendingBooking, error: bookingError } = await supabase
        .from('pending_bookings')
        .select(`
          *,
          driver:drivers(id, email),
          client:clients(id, email, user_id)
        `)
        .eq('id', pending_booking_id)
        .single();

      if (bookingError || !pendingBooking) {
        console.error('Pending booking not found:', bookingError);
        return res.status(404).json({ error: "Pending booking not found" });
      }

      // Check if pending booking has expired
      if (new Date(pendingBooking.expires_at) < new Date()) {
        console.log('Pending booking expired:', pending_booking_id);
        return res.status(400).json({ error: "Booking session expired. Please create a new booking." });
      }

      // Verify pending booking ownership - must belong to authenticated user
      if (pendingBooking.client?.user_id !== user.id) {
        return res.status(403).json({ error: "Unauthorized - not your pending booking" });
      }

      // Use total_cost from pending booking record (server-side authority)
      const bookingAmount = pendingBooking.total_cost;

      if (!bookingAmount || bookingAmount <= 0) {
        return res.status(400).json({ error: "Invalid booking amount" });
      }

      // Construct the callback URL from the request
      const callbackUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const fullCallbackUrl = `${callbackUrl}/client/bookings`;

      // Prepare payment request - simple charge, no split yet
      // Money stays in platform balance until completion is confirmed
      const paymentData: any = {
        email: pendingBooking.client?.email,
        amount: Math.round(bookingAmount * 100), // Convert to kobo
        metadata: {
          type: 'booking',
          pending_booking_id: pending_booking_id,
          driver_id: pendingBooking.driver_id,
        },
        callback_url: fullCallbackUrl,
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
        console.error('Paystack initialization failed:', data);
        return res.status(500).json({ error: "Failed to initialize payment" });
      }

      console.log('Payment initialized for pending booking:', pending_booking_id);
      res.json({
        authorization_url: data.data.authorization_url,
        reference: data.data.reference,
      });
    } catch (error) {
      console.error('Server error in payment initialization:', error);
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

  // Payment callback - Paystack redirects users here after payment
  // This also creates bookings if webhook hasn't fired (e.g., in development)
  app.get("/payment/callback", async (req, res) => {
    try {
      const { reference, trxref } = req.query;
      const txRef = (reference || trxref) as string;

      if (!txRef) {
        return res.redirect('/client/dashboard?payment=failed');
      }

      console.log('Payment callback received for reference:', txRef);

      // Verify transaction with Paystack
      const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${txRef}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET}`,
        },
      });

      const verifyData = await verifyResponse.json();

      if (!verifyData.status || verifyData.data?.status !== 'success') {
        // Payment failed or not successful
        console.log('Payment verification failed for reference:', txRef);
        return res.redirect('/client/dashboard?payment=failed');
      }

      const { amount, metadata } = verifyData.data;

      // Handle booking payments - create booking if not already created
      if (metadata?.type === 'booking') {
        const bookingAmount = amount / 100; // Convert from kobo
        const result = await finalizeBookingFromPayment(txRef, metadata, bookingAmount);
        
        if (result.success || result.already_processed) {
          console.log('Callback: Booking finalized successfully:', result.booking_id);
          return res.redirect('/client/active');
        } else {
          console.error('Callback: Failed to finalize booking:', result.error);
          return res.redirect('/client/dashboard?payment=error&reason=' + encodeURIComponent(result.error || 'unknown'));
        }
      }

      // Payment successful - redirect to appropriate page
      res.redirect('/client/active');
    } catch (error) {
      console.error('Payment callback error:', error);
      res.redirect('/client/dashboard?payment=error');
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

      // Check if rating already exists for this client
      const { data: existingRating } = await supabase
        .from('ratings')
        .select('id')
        .eq('booking_id', booking_id)
        .eq('rater_role', 'client')
        .single();

      if (existingRating) {
        return res.status(400).json({ error: "You have already rated this booking" });
      }

      // Insert rating
      const { data: newRating, error } = await supabase
        .from('ratings')
        .insert([{
          booking_id,
          client_id: client.id,
          driver_id: booking.driver_id,
          rater_role: 'client',
          rating,
          review: review || null,
        }])
        .select()
        .single();

      if (error) throw error;

      // Update driver's average rating (only from client ratings)
      const { data: driverRatings } = await supabase
        .from('ratings')
        .select('rating')
        .eq('driver_id', booking.driver_id)
        .eq('rater_role', 'client');

      if (driverRatings && driverRatings.length > 0) {
        const avgRating = driverRatings.reduce((sum, r) => sum + r.rating, 0) / driverRatings.length;
        
        await supabase
          .from('drivers')
          .update({ rating: avgRating })
          .eq('id', booking.driver_id);
      }

      res.json(newRating);
    } catch (error) {
      console.error('[Ratings] Error creating rating:', error);
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

      // Recalculate driver's average rating (only from client ratings)
      const { data: driverRatings } = await supabase
        .from('ratings')
        .select('rating')
        .eq('driver_id', existingRating.driver_id)
        .eq('rater_role', 'client');

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
      const updateData: any = {
        driver_confirmed: true,
        driver_confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // If both parties have confirmed, mark booking as completed
      if (booking.client_confirmed) {
        updateData.booking_status = 'completed';
      }

      await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId);

      // Increment driver's total_trips when booking is completed
      if (booking.client_confirmed) {
        const { data: driverData } = await supabase
          .from('drivers')
          .select('total_trips')
          .eq('id', driver.id)
          .single();
        
        if (driverData) {
          await supabase
            .from('drivers')
            .update({ total_trips: (driverData.total_trips || 0) + 1 })
            .eq('id', driver.id);
        }
      }

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

      // Check for open disputes
      const { data: openDisputes } = await supabase
        .from('disputes')
        .select('id, status')
        .eq('booking_id', bookingId)
        .eq('status', 'open');

      if (openDisputes && openDisputes.length > 0) {
        return res.status(400).json({ 
          error: "Cannot approve completion while dispute is open. Please wait for admin review." 
        });
      }

      // Update client confirmation
      const updateData: any = {
        client_confirmed: true,
        client_confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // If both parties have confirmed, mark booking as completed
      if (booking.driver_confirmed) {
        updateData.booking_status = 'completed';
      }

      await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId);

      // Increment driver's total_trips when booking is completed
      if (booking.driver_confirmed) {
        const { data: driverData } = await supabase
          .from('drivers')
          .select('total_trips')
          .eq('id', booking.driver_id)
          .single();
        
        if (driverData) {
          await supabase
            .from('drivers')
            .update({ total_trips: (driverData.total_trips || 0) + 1 })
            .eq('id', booking.driver_id);
        }
      }

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

  // ===========================================================================
  // ADMIN ANALYTICS ENDPOINTS
  // ===========================================================================

  // Get revenue analytics
  app.get("/api/admin/analytics/revenue", async (req, res) => {
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
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!admin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Get last 30 days of revenue data
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('created_at, total_cost, booking_status')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .eq('booking_status', 'completed')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Aggregate by date
      const revenueByDate = (bookings || []).reduce((acc: any, booking: any) => {
        const date = new Date(booking.created_at).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { date, revenue: 0, bookings: 0, commission: 0 };
        }
        acc[date].revenue += booking.total_cost;
        acc[date].bookings += 1;
        acc[date].commission += booking.total_cost * 0.1; // 10% commission
        return acc;
      }, {});

      res.json(Object.values(revenueByDate));
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get driver performance metrics
  app.get("/api/admin/analytics/drivers", async (req, res) => {
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
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!admin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Get driver metrics
      const { data: drivers, error } = await supabase
        .from('drivers')
        .select('id, full_name, total_trips, rating')
        .gte('total_trips', 1)
        .order('total_trips', { ascending: false });

      if (error) throw error;

      // Calculate earnings and acceptance rate for each driver
      const driverMetrics = await Promise.all((drivers || []).map(async (driver: any) => {
        // Get completed bookings for earnings
        const { data: completedBookings } = await supabase
          .from('bookings')
          .select('total_cost')
          .eq('driver_id', driver.id)
          .eq('booking_status', 'completed');

        const totalEarnings = (completedBookings || []).reduce((sum: number, b: any) => 
          sum + (b.total_cost * 0.9), 0); // Driver gets 90%

        // Get acceptance rate
        const { data: allBookings } = await supabase
          .from('bookings')
          .select('booking_status')
          .eq('driver_id', driver.id);

        const totalRequests = (allBookings || []).length;
        const accepted = (allBookings || []).filter((b: any) => 
          b.booking_status !== 'cancelled').length;
        const acceptanceRate = totalRequests > 0 ? (accepted / totalRequests) * 100 : 0;

        return {
          driver_id: driver.id,
          driver_name: driver.full_name,
          total_trips: driver.total_trips,
          total_earnings: Math.round(totalEarnings),
          average_rating: driver.rating || 0,
          acceptance_rate: Math.round(acceptanceRate),
        };
      }));

      res.json(driverMetrics.sort((a, b) => b.total_trips - a.total_trips));
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get booking heatmap data
  app.get("/api/admin/analytics/heatmap", async (req, res) => {
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
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!admin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Get bookings from last 30 days
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      // Create heatmap data
      const heatmapData: any[] = [];
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      (bookings || []).forEach((booking: any) => {
        const date = new Date(booking.created_at);
        const day = days[date.getDay()];
        const hour = date.getHours();

        const existing = heatmapData.find(h => h.day === day && h.hour === hour);
        if (existing) {
          existing.count += 1;
        } else {
          heatmapData.push({ day, hour, count: 1 });
        }
      });

      res.json(heatmapData);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get location analytics
  app.get("/api/admin/analytics/locations", async (req, res) => {
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
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!admin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Get all bookings
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('start_location, destination');

      if (error) throw error;

      // Count location frequency
      const locationCounts: Record<string, number> = {};

      (bookings || []).forEach((booking: any) => {
        // Count start locations
        if (booking.start_location) {
          locationCounts[booking.start_location] = (locationCounts[booking.start_location] || 0) + 1;
        }
        // Count destinations
        if (booking.destination) {
          locationCounts[booking.destination] = (locationCounts[booking.destination] || 0) + 1;
        }
      });

      // Convert to array and sort
      const locationData = Object.entries(locationCounts)
        .map(([location, count]) => ({ location, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20); // Top 20 locations

      res.json(locationData);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // ===========================================================================
  // ADMIN USER MANAGEMENT ENDPOINTS
  // ===========================================================================

  // First-time admin setup (public endpoint with setup key validation)
  app.post("/api/admin/setup", async (req, res) => {
    try {
      const { email, password, name, setupKey } = req.body;

      if (!email || !password || !name || !setupKey) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Verify setup key from environment - MUST be set, no default
      const ADMIN_SETUP_KEY = process.env.ADMIN_SETUP_KEY;
      if (!ADMIN_SETUP_KEY) {
        return res.status(500).json({ error: "Server configuration error: ADMIN_SETUP_KEY not set" });
      }

      if (setupKey !== ADMIN_SETUP_KEY) {
        return res.status(403).json({ error: "Invalid setup key" });
      }

      // Atomic check and create using a transaction-like approach
      // First, acquire a lock on the admin_users table by attempting to create
      const { count, error: countError } = await supabase
        .from('admin_users')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        throw countError;
      }

      if (count && count > 0) {
        return res.status(403).json({ error: "Admin setup already completed" });
      }

      // Create auth user using service role (bypasses RLS)
      const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: {
          role: 'admin',
          name,
        },
        email_confirm: true,
      });

      if (authError) throw authError;

      if (!newUser.user) {
        throw new Error('User creation failed');
      }

      // Poll for the admin record with retry logic (more reliable than fixed delay)
      let adminUser = null;
      let attempts = 0;
      const maxAttempts = 10;

      while (!adminUser && attempts < maxAttempts) {
        const { data, error } = await supabase
          .from('admin_users')
          .select('*')
          .eq('user_id', newUser.user.id)
          .single();

        if (data) {
          adminUser = data;
          break;
        }

        attempts++;
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      if (!adminUser) {
        throw new Error('Admin record creation timed out - trigger may have failed');
      }

      res.json({ 
        message: 'Admin account created successfully',
        admin: adminUser
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Server error" });
    }
  });

  // Get all admin users (super admin only)
  app.get("/api/admin/users", async (req, res) => {
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
        .select('role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!admin || admin.role !== 'super_admin') {
        return res.status(403).json({ error: "Super admin access required" });
      }

      // Get all admin users
      const { data: adminUsers, error } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.json(adminUsers || []);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Create new admin user (super admin only)
  app.post("/api/admin/users", async (req, res) => {
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
        .select('role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!admin || admin.role !== 'super_admin') {
        return res.status(403).json({ error: "Super admin access required" });
      }

      const { email, password, name, role } = req.body;

      if (!email || !password || !name || !role) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (!['super_admin', 'moderator'].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }

      // Create auth user
      const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: {
          role: 'admin',
          name,
        },
        email_confirm: true,
      });

      if (authError) throw authError;

      if (!newUser.user) {
        throw new Error('User creation failed');
      }

      // Create admin user record
      const { data: newAdmin, error: adminError } = await supabase
        .from('admin_users')
        .insert({
          user_id: newUser.user.id,
          name,
          email,
          role,
          is_active: true,
        })
        .select()
        .single();

      if (adminError) throw adminError;

      res.json(newAdmin);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Server error" });
    }
  });

  // Update admin user status (super admin only)
  app.patch("/api/admin/users/:id", async (req, res) => {
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
        .select('role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!admin || admin.role !== 'super_admin') {
        return res.status(403).json({ error: "Super admin access required" });
      }

      const adminId = req.params.id;
      const { is_active, role } = req.body;

      const updates: any = {};
      if (typeof is_active !== 'undefined') updates.is_active = is_active;
      if (role && ['super_admin', 'moderator'].includes(role)) updates.role = role;

      const { data: updatedAdmin, error } = await supabase
        .from('admin_users')
        .update(updates)
        .eq('id', adminId)
        .select()
        .single();

      if (error) throw error;

      res.json(updatedAdmin);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // ============================================================================
  // ADMIN NIN VERIFICATION REVIEW ENDPOINTS
  // ============================================================================

  // Get all pending NIN verifications (locked or pending_manual status)
  app.get("/api/admin/nin-verifications/pending", async (req, res) => {
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
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!admin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Fetch clients with locked or pending_manual verification status
      const { data: clients, error } = await supabase
        .from('clients')
        .select(`
          id,
          full_name,
          email,
          phone,
          nin_verification_state,
          nin_verified_at,
          last_attempt_at,
          nin_attempts_count,
          nin_last_confidence,
          nin_reference_id,
          created_at
        `)
        .in('nin_verification_state', ['locked', 'pending_manual'])
        .order('last_attempt_at', { ascending: false });

      if (error) {
        console.error('Error fetching pending NIN verifications:', error);
        return res.status(500).json({ error: "Failed to fetch pending verifications" });
      }

      // For each client, fetch their latest verification attempt
      const clientsWithVerifications = await Promise.all(
        (clients || []).map(async (client) => {
          const { data: latestVerification } = await supabase
            .from('nin_verifications')
            .select('*')
            .eq('client_id', client.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...client,
            latest_verification: latestVerification
          };
        })
      );

      res.json(clientsWithVerifications);
    } catch (error) {
      console.error('Error in /api/admin/nin-verifications/pending:', error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Review and approve/reject a NIN verification
  app.post("/api/admin/nin-verifications/:id/review", async (req, res) => {
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
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!admin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const clientId = req.params.id;
      const { action, notes } = req.body;

      if (!action || !['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: "Action must be 'approve' or 'reject'" });
      }

      // Get client current state
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError || !client) {
        return res.status(404).json({ error: "Client not found" });
      }

      if (!['locked', 'pending_manual'].includes(client.nin_verification_state)) {
        return res.status(400).json({ 
          error: "Client verification is not pending manual review" 
        });
      }

      // Get the latest verification record to update
      const { data: verification } = await supabase
        .from('nin_verifications')
        .select('id')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (action === 'approve') {
        // Approve: Set client to verified state
        const { error: updateError } = await supabase
          .from('clients')
          .update({
            nin_verification_state: 'verified',
            nin_verified_at: new Date().toISOString(),
            nin_attempts_count: 0,
            last_attempt_at: null
          })
          .eq('id', clientId);

        if (updateError) {
          console.error('Error approving verification:', updateError);
          return res.status(500).json({ error: "Failed to approve verification" });
        }

        // Update verification record
        if (verification) {
          await supabase
            .from('nin_verifications')
            .update({
              status: 'verified',
              reviewer_id: admin.id,
              reviewed_at: new Date().toISOString()
            })
            .eq('id', verification.id);

          // Log event
          await supabase
            .from('nin_verification_events')
            .insert({
              verification_id: verification.id,
              event_type: 'manual_approval',
              message: `Admin manually approved NIN verification. Notes: ${notes || 'None'}`,
              payload_snapshot: { admin_id: admin.id, notes }
            });
        }

        // Send approval email to client (non-blocking, fire-and-forget)
        const approvalTemplate = emailTemplates.ninVerificationApproved({
          clientName: client.full_name,
          approvedAt: new Date().toISOString()
        });

        sendEmail({
          to: client.email,
          toName: client.full_name,
          subject: approvalTemplate.subject,
          html: approvalTemplate.html,
          text: approvalTemplate.text,
          emailType: 'nin_verification_approved',
          templateData: {
            client_name: client.full_name,
            approved_at: new Date().toISOString()
          },
          userId: client.user_id
        }).catch(err => console.error('Failed to send NIN approval email:', err));

        res.json({ 
          success: true, 
          message: 'Verification approved successfully',
          client_id: clientId,
          new_state: 'verified'
        });

      } else {
        // Reject: Keep locked state, reset attempts
        const { error: updateError } = await supabase
          .from('clients')
          .update({
            nin_attempts_count: 0,
            last_attempt_at: null
          })
          .eq('id', clientId);

        if (updateError) {
          console.error('Error rejecting verification:', updateError);
          return res.status(500).json({ error: "Failed to reject verification" });
        }

        // Update verification record
        if (verification) {
          await supabase
            .from('nin_verifications')
            .update({
              status: 'rejected',
              reviewer_id: admin.id,
              reviewed_at: new Date().toISOString(),
              failure_reason: notes || 'Manually rejected by admin'
            })
            .eq('id', verification.id);

          // Log event
          await supabase
            .from('nin_verification_events')
            .insert({
              verification_id: verification.id,
              event_type: 'manual_rejection',
              message: `Admin manually rejected NIN verification. Notes: ${notes || 'None'}`,
              payload_snapshot: { admin_id: admin.id, notes }
            });
        }

        // Send rejection email to client (non-blocking, fire-and-forget)
        const rejectionTemplate = emailTemplates.ninVerificationRejected({
          clientName: client.full_name,
          reason: 'Your verification was manually reviewed and could not be approved',
          adminNotes: notes
        });

        sendEmail({
          to: client.email,
          toName: client.full_name,
          subject: rejectionTemplate.subject,
          html: rejectionTemplate.html,
          text: rejectionTemplate.text,
          emailType: 'nin_verification_rejected',
          templateData: {
            client_name: client.full_name,
            reason: 'Manual review',
            admin_notes: notes
          },
          userId: client.user_id
        }).catch(err => console.error('Failed to send NIN rejection email:', err));

        res.json({ 
          success: true, 
          message: 'Verification rejected successfully',
          client_id: clientId,
          new_state: 'locked'
        });
      }

    } catch (error) {
      console.error('Error in /api/admin/nin-verifications/:id/review:', error);
      res.status(500).json({ error: "Server error" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
