import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Car, DollarSign, Star, Clock, Check, X } from 'lucide-react';
import type { Driver, BookingWithDetails } from '@shared/schema';

export default function DriverDashboard() {
  const [, setLocation] = useLocation();
  const { user, profile, logout } = useAuthStore();
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!user) {
      setLocation('/auth/login');
      return;
    }

    if (profile) {
      const driver = profile as Driver;
      setIsOnline(driver.online_status === 'online');
    }
  }, [user, profile, setLocation]);

  const { data: driverData } = useQuery<Driver>({
    queryKey: ['/api/drivers/me'],
    enabled: !!user,
    refetchOnWindowFocus: false,
  });

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

  const toggleOnlineMutation = useMutation({
    mutationFn: async (online: boolean) => {
      const response = await fetch('/api/drivers/toggle-online', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ online }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      return response.json();
    },
    onSuccess: (_, online) => {
      setIsOnline(online);
      toast({
        title: online ? 'You are now online' : 'You are now offline',
        description: online ? 'You will receive booking requests' : 'You will not receive booking requests',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/me'] });
    },
  });

  const acceptBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await fetch(`/api/bookings/${bookingId}/accept`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to accept booking');
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    setLocation('/auth/login');
  };

  const handleToggleOnline = (online: boolean) => {
    toggleOnlineMutation.mutate(online);
  };

  if (!user || !profile) {
    return null;
  }

  const driver = profile as Driver;

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar 
        role="driver" 
        onLogout={handleLogout}
        onToggleOnline={handleToggleOnline}
        isOnline={isOnline}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold font-heading text-foreground">
                Dashboard
              </h1>
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
      </main>
    </div>
  );
}
