import { useEffect, useState, useRef } from 'react';
import { useLocation, useSearch } from 'wouter';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Car, DollarSign, Star, Clock, Check, X, ShieldCheck } from 'lucide-react';
import type { Driver, BookingWithDetails } from '@shared/schema';
import { useGeolocation } from '@/hooks/useGeolocation';

export default function DriverDashboard() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const paymentSuccess = searchParams.get('payment_success') === 'true';
  const { user, profile, isLoading, logout } = useAuthStore();
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(false);
  const [isWaitingForVerification, setIsWaitingForVerification] = useState(paymentSuccess);
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isTogglingOnlineRef = useRef(false);
  const hasValidLocationRef = useRef(false);
  const desiredOnlineStateRef = useRef(false); // Track what user actually wants
  const { coordinates, error: geoError, getCurrentPosition } = useGeolocation();

  useEffect(() => {
    // Wait for auth state to load before redirecting
    if (isLoading) return;
    
    if (!user) {
      setLocation('/auth/login');
      return;
    }

    if (profile) {
      const driver = profile as Driver;
      
      // If waiting for verification after payment, don't redirect yet
      if (isWaitingForVerification) {
        return;
      }
      
      // Redirect unverified drivers to verification page
      if (!driver.verified) {
        toast({
          title: 'Verification required',
          description: 'Please complete your verification to access the dashboard',
        });
        setLocation('/driver/verification');
        return;
      }

      setIsOnline(driver.online_status === 'online');
    }
  }, [isLoading, user, profile, setLocation, toast, isWaitingForVerification]);

  const { data: driverData, refetch: refetchDriverData } = useQuery<Driver>({
    queryKey: ['/api/drivers/me'],
    enabled: !!user,
    refetchOnWindowFocus: false,
    refetchInterval: isWaitingForVerification ? 2000 : false, // Poll every 2 seconds when waiting
  });

  // Handle payment success and wait for verification
  useEffect(() => {
    if (!isWaitingForVerification || !driverData) return;

    // Check if driver is now verified
    if (driverData.verified) {
      setIsWaitingForVerification(false);
      
      // Update auth store profile with verified driver data
      const { setProfile } = useAuthStore.getState();
      setProfile(driverData);
      
      // Remove query param from URL
      window.history.replaceState({}, '', '/driver/dashboard');
      
      toast({
        title: 'Verification successful!',
        description: 'Your account has been verified. You can now start accepting bookings.',
        duration: 5000,
      });
    }
  }, [isWaitingForVerification, driverData, toast]);

  // Set timeout for verification wait
  useEffect(() => {
    if (!isWaitingForVerification) return;

    // After 30 seconds, stop waiting and show message
    const timeout = setTimeout(() => {
      if (isWaitingForVerification) {
        setIsWaitingForVerification(false);
        toast({
          title: 'Verification is processing',
          description: 'Your payment is being processed. Please refresh the page in a few moments.',
          duration: 8000,
        });
      }
    }, 30000);

    return () => clearTimeout(timeout);
  }, [isWaitingForVerification, toast]);

  const { data: activeBookings = [] } = useQuery<BookingWithDetails[]>({
    queryKey: ['/api/bookings/active'],
    enabled: !!user,
    refetchOnWindowFocus: false,
  });

  // Subscribe to booking changes for real-time updates
  useEffect(() => {
    if (!user || !profile) return;

    const channel = supabase
      .channel('booking-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `driver_id=eq.${(profile as Driver).id}`,
        },
        (payload) => {
          // Refetch active bookings when bookings change
          queryClient.invalidateQueries({ queryKey: ['/api/bookings/active'] });
          
          // Show toast for new bookings
          if (payload.eventType === 'INSERT') {
            toast({
              title: 'New booking request!',
              description: 'You have a new booking request',
            });
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, profile, toast]);

  const { data: stats } = useQuery<{ today_trips: number; today_earnings: number; total_earnings: number; total_trips: number }>({
    queryKey: ['/api/drivers/stats'],
    enabled: !!user,
    refetchOnWindowFocus: false,
  });

  const updateLocationMutation = useMutation({
    mutationFn: async (location: { lat: number; lng: number }) => {
      const response = await apiRequest('PATCH', '/api/drivers/location', location);
      return response.json();
    },
    onSuccess: async () => {
      hasValidLocationRef.current = true;
      
      // Only proceed if user still wants to be online
      if (isTogglingOnlineRef.current && desiredOnlineStateRef.current) {
        try {
          await apiRequest('POST', '/api/drivers/toggle-online', { online: true });
          
          // Final check - user still wants online?
          if (desiredOnlineStateRef.current) {
            setIsOnline(true);
            toast({
              title: 'You are now online',
              description: 'Location updated. You will receive booking requests.',
            });
            queryClient.invalidateQueries({ queryKey: ['/api/drivers/me'] });
          }
          isTogglingOnlineRef.current = false;
        } catch (error) {
          // Backend toggle failed after location was saved
          isTogglingOnlineRef.current = false;
          hasValidLocationRef.current = false;
          
          if (desiredOnlineStateRef.current) {
            toast({
              title: 'Failed to go online',
              description: 'Location saved but could not set online status. Please try again.',
              variant: 'destructive',
            });
          }
        }
      } else {
        // User changed their mind - clean up
        isTogglingOnlineRef.current = false;
      }
    },
    onError: () => {
      hasValidLocationRef.current = false;
      
      if (isTogglingOnlineRef.current && desiredOnlineStateRef.current) {
        isTogglingOnlineRef.current = false;
        toast({
          title: 'Location update failed',
          description: 'Could not save your location. Please try again.',
          variant: 'destructive',
        });
      } else {
        isTogglingOnlineRef.current = false;
      }
    },
  });

  const toggleOfflineMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/drivers/toggle-online', { online: false });
      return response.json();
    },
    onSuccess: () => {
      // Only apply if user still wants offline
      if (!desiredOnlineStateRef.current) {
        setIsOnline(false);
        isTogglingOnlineRef.current = false;
        hasValidLocationRef.current = false;
        
        if (locationIntervalRef.current) {
          clearInterval(locationIntervalRef.current);
          locationIntervalRef.current = null;
        }
        
        toast({
          title: 'You are now offline',
          description: 'You will not receive booking requests',
        });
        queryClient.invalidateQueries({ queryKey: ['/api/drivers/me'] });
      }
    },
    onError: () => {
      // Force offline locally even if backend fails, but only if user still wants offline
      if (!desiredOnlineStateRef.current) {
        setIsOnline(false);
        isTogglingOnlineRef.current = false;
        hasValidLocationRef.current = false;
        
        if (locationIntervalRef.current) {
          clearInterval(locationIntervalRef.current);
          locationIntervalRef.current = null;
        }
        
        toast({
          title: 'Offline (sync failed)',
          description: 'You appear offline locally, but server sync failed. You may still receive requests.',
          variant: 'destructive',
        });
      }
    },
  });

  // Handle coordinates update
  useEffect(() => {
    if (coordinates && isTogglingOnlineRef.current) {
      updateLocationMutation.mutate(coordinates);
    } else if (coordinates && hasValidLocationRef.current) {
      // Periodic update (driver already online)
      updateLocationMutation.mutate(coordinates);
    }
  }, [coordinates]);

  // Handle geolocation errors
  useEffect(() => {
    if (geoError && isTogglingOnlineRef.current) {
      isTogglingOnlineRef.current = false;
      toast({
        title: 'Location access required',
        description: geoError,
        variant: 'destructive',
      });
    }
  }, [geoError]);

  // Periodic location updates while online (every 5 minutes)
  // Only if we have a valid location
  useEffect(() => {
    if (isOnline && hasValidLocationRef.current) {
      // Set up periodic updates every 5 minutes (300000ms)
      locationIntervalRef.current = setInterval(() => {
        if (hasValidLocationRef.current) {
          getCurrentPosition();
        }
      }, 300000);
    } else {
      // Clear interval when going offline or location becomes invalid
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
    };
  }, [isOnline, hasValidLocationRef.current]);

  const acceptBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await apiRequest('POST', `/api/bookings/${bookingId}/accept`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Booking accepted',
        description: 'The client has been notified',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/active'] });
    },
  });

  const confirmCompletionMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return apiRequest('POST', `/api/bookings/${bookingId}/driver-confirm`);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/stats'] });
      
      const response = data as any;
      toast({
        title: 'Completion Confirmed',
        description: response?.message || 'You have confirmed the trip completion.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to confirm completion',
        variant: 'destructive',
      });
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    setLocation('/auth/login');
  };

  const handleToggleOnline = (online: boolean) => {
    // Check if driver is verified
    if (driver && !driver.verified) {
      toast({
        title: 'Verification required',
        description: 'You must complete verification before going online',
        variant: 'destructive',
      });
      return;
    }

    // Update desired state immediately
    desiredOnlineStateRef.current = online;
    
    if (online) {
      // Start the process: first capture location
      isTogglingOnlineRef.current = true;
      getCurrentPosition();
    } else {
      // Going offline - cancel any pending online attempt and call backend
      isTogglingOnlineRef.current = false;
      toggleOfflineMutation.mutate();
    }
  };

  if (!user || !profile) {
    return null;
  }

  const driver = profile as Driver;

  // Show waiting screen when processing verification payment
  if (isWaitingForVerification) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary animate-pulse" />
              Processing Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Thank you for your payment! We're confirming your verification status...
            </p>
            <div className="flex items-center gap-2 text-sm">
              <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
              <span>This usually takes just a few seconds</span>
            </div>
            <div className="text-xs text-muted-foreground">
              If this takes too long, please refresh the page or contact support.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <DashboardLayout 
      role="driver" 
      onLogout={handleLogout}
      onToggleOnline={handleToggleOnline}
      isOnline={isOnline}
    >
      <div className="p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold font-heading text-foreground">
                  Dashboard
                </h1>
                {driver.verified && (
                  <div className="flex items-center gap-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-sm font-medium">
                    <ShieldCheck className="h-4 w-4" />
                    Verified
                  </div>
                )}
              </div>
              <p className="text-muted-foreground mt-1">
                Welcome back, {driver.full_name}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                icon={Car}
                label="Today's Trips"
                value={stats?.today_trips || 0}
              />
              <StatCard
                icon={DollarSign}
                label="Today's Earnings"
                value={`₦${(stats?.today_earnings || 0).toLocaleString()}`}
              />
              <StatCard
                icon={Star}
                label="Rating"
                value={driver.rating?.toFixed(1) || '0.0'}
              />
              <StatCard
                icon={Clock}
                label="Total Trips"
                value={driver.total_trips || 0}
              />
            </div>

            {/* Active Bookings */}
            {activeBookings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Active Booking Requests</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {activeBookings.map((booking) => (
                    <div 
                      key={booking.id} 
                      className="p-4 border rounded-lg space-y-3"
                      data-testid={`booking-${booking.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold">{booking.client.full_name}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {booking.start_location} → {booking.destination}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span>Distance: {booking.distance_km.toFixed(1)} km</span>
                            <span>Duration: {(booking.duration_hr * 60).toFixed(0)} min</span>
                            <span className="font-semibold text-primary">
                              ₦{booking.total_cost.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <StatusBadge status={booking.booking_status} type="booking" />
                      </div>

                      {/* Completion Confirmation Status */}
                      {booking.booking_status === 'ongoing' && (
                        <div className={`text-xs p-2 rounded-md ${
                          booking.driver_confirmed 
                            ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' 
                            : 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                        }`}>
                          {booking.driver_confirmed && booking.client_confirmed && (
                            <span className="font-medium">✓ Both parties confirmed. Payment processing...</span>
                          )}
                          {booking.driver_confirmed && !booking.client_confirmed && (
                            <span>✓ You confirmed. Waiting for client confirmation.</span>
                          )}
                          {!booking.driver_confirmed && booking.client_confirmed && (
                            <span>Client confirmed. Please confirm on your end.</span>
                          )}
                          {!booking.driver_confirmed && !booking.client_confirmed && (
                            <span>Trip in progress. Confirm when finished.</span>
                          )}
                        </div>
                      )}

                      {booking.booking_status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => acceptBookingMutation.mutate(booking.id)}
                            disabled={acceptBookingMutation.isPending}
                            data-testid={`button-accept-${booking.id}`}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            data-testid={`button-decline-${booking.id}`}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Decline
                          </Button>
                        </div>
                      )}
                      
                      {booking.booking_status === 'ongoing' && !booking.driver_confirmed && (
                        <Button
                          size="sm"
                          onClick={() => confirmCompletionMutation.mutate(booking.id)}
                          disabled={confirmCompletionMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {confirmCompletionMutation.isPending ? 'Confirming...' : 'Confirm Completion'}
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* No Active Bookings */}
            {activeBookings.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No Active Bookings</h3>
                  <p className="text-muted-foreground">
                    {isOnline 
                      ? 'You will receive notifications when clients book you'
                      : 'Go online to start receiving booking requests'
                    }
                  </p>
                </CardContent>
              </Card>
            )}
        </div>
      </div>
    </DashboardLayout>
  );
}
