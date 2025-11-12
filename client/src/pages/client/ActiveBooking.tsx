import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { useBookingStore } from '@/store/bookingStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { MapPin, Clock, DollarSign, User, Phone, Star, MessageCircle, CheckCircle } from 'lucide-react';
import type { BookingWithDetails } from '@shared/schema';
import { DashboardLayout } from '@/components/DashboardLayout';

function ActiveBooking() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuthStore();
  const { toast } = useToast();

  useEffect(() => {
    if (isLoading) return;
    
    if (!user) {
      setLocation('/auth/login');
    }
  }, [isLoading, user, setLocation]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    useAuthStore.getState().logout();
    setLocation('/auth/login');
  };

  // Fetch active bookings
  const { data: activeBooking, isLoading: isLoadingBooking } = useQuery<BookingWithDetails | null>({
    queryKey: ['/api/bookings/client/active'],
    enabled: !!user,
    refetchInterval: 10000, // Poll every 10 seconds for updates
  });

  // Clear booking store when active booking is loaded
  useEffect(() => {
    if (activeBooking) {
      useBookingStore.getState().clearBooking();
    }
  }, [activeBooking]);

  // Subscribe to booking updates
  useEffect(() => {
    if (!activeBooking) return;

    const channel = supabase
      .channel('booking-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${activeBooking.id}`,
        },
        () => {
          // Refetch booking when updated
          queryClient.invalidateQueries({ queryKey: ['/api/bookings/client/active'] });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [activeBooking]);

  // Confirm completion mutation
  const confirmCompletionMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return apiRequest('POST', `/api/bookings/${bookingId}/client-confirm`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/client/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/client'] });
      toast({
        title: 'Completion Confirmed',
        description: 'You have confirmed the trip completion.',
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

  const handleConfirmCompletion = () => {
    if (!activeBooking) return;
    confirmCompletionMutation.mutate(activeBooking.id);
  };

  const handleChat = () => {
    if (!activeBooking) return;
    setLocation(`/client/chat/${activeBooking.id}`);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      pending: { variant: 'secondary', label: 'Pending' },
      accepted: { variant: 'default', label: 'Accepted' },
      ongoing: { variant: 'default', label: 'Ongoing' },
      completed: { variant: 'outline', label: 'Completed' },
      cancelled: { variant: 'destructive', label: 'Cancelled' },
    };

    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant} data-testid="badge-status">{config.label}</Badge>;
  };

  const getPaymentBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      pending: { variant: 'secondary', label: 'Payment Pending' },
      paid: { variant: 'default', label: 'Paid' },
      failed: { variant: 'destructive', label: 'Payment Failed' },
      refunded: { variant: 'outline', label: 'Refunded' },
    };

    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant} data-testid="badge-payment">{config.label}</Badge>;
  };

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout role="client" onLogout={handleLogout}>
      <div className="container mx-auto p-6">
          <h1 className="text-3xl font-bold mb-6" data-testid="text-page-title">Active Booking</h1>

          {isLoading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="h-60 bg-muted" />
                </Card>
              ))}
            </div>
          )}

          {!isLoading && !activeBooking && (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground text-lg">No active booking</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Book a driver from the dashboard to get started
                </p>
                <Button
                  onClick={() => setLocation('/client/dashboard')}
                  className="mt-4"
                  data-testid="button-book-driver"
                >
                  Book a Driver
                </Button>
              </CardContent>
            </Card>
          )}

          {!isLoading && activeBooking && (
            <div className="space-y-6">
              {/* Status Card */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Booking Status</CardTitle>
                      <CardDescription>Trip #{activeBooking.id.slice(0, 8)}</CardDescription>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      {getStatusBadge(activeBooking.booking_status)}
                      {getPaymentBadge(activeBooking.payment_status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {activeBooking.booking_status === 'pending' && (
                    <div className="bg-muted/50 p-4 rounded-md">
                      <p className="text-sm text-muted-foreground">
                        Waiting for driver to accept your booking request...
                      </p>
                    </div>
                  )}
                  {activeBooking.booking_status === 'accepted' && (
                    <div className="bg-primary/10 p-4 rounded-md">
                      <p className="text-sm">
                        Driver has accepted! They're on their way to pick you up.
                      </p>
                    </div>
                  )}
                  {activeBooking.booking_status === 'ongoing' && (
                    <div className="bg-primary/10 p-4 rounded-md">
                      <p className="text-sm">
                        Trip in progress. Your driver is taking you to your destination.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Driver Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Driver Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-8 w-8 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg" data-testid="text-driver-name">
                        {activeBooking.driver?.full_name || 'Driver'}
                      </h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        {activeBooking.payment_status === 'paid' ? (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span data-testid="text-driver-phone">{activeBooking.driver?.phone}</span>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">
                            Contact details available after payment confirmation
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span data-testid="text-driver-rating">
                            {activeBooking.driver?.rating?.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {(activeBooking.booking_status === 'accepted' || activeBooking.booking_status === 'ongoing') && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleChat}
                          data-testid="button-chat"
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Chat
                        </Button>
                        {!activeBooking.client_confirmed && (
                          <Button
                            size="sm"
                            onClick={handleConfirmCompletion}
                            disabled={confirmCompletionMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                            data-testid="button-complete"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {confirmCompletionMutation.isPending ? 'Confirming...' : 'Complete Request'}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Trip Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Trip Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm text-muted-foreground">Pickup</div>
                      <div className="font-medium" data-testid="text-pickup">
                        {activeBooking.start_location}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm text-muted-foreground">Destination</div>
                      <div className="font-medium" data-testid="text-destination">
                        {activeBooking.destination}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Clock className="h-4 w-4" />
                        <span>Duration</span>
                      </div>
                      <div className="font-medium" data-testid="text-duration">
                        {Math.round(activeBooking.duration_hr * 60)} minutes
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <MapPin className="h-4 w-4" />
                        <span>Distance</span>
                      </div>
                      <div className="font-medium" data-testid="text-distance">
                        {activeBooking.distance_km.toFixed(1)} km
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span>Total Cost</span>
                    </div>
                    <span className="font-bold text-lg text-primary" data-testid="text-cost">
                      ₦{activeBooking.total_cost.toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
    </DashboardLayout>
  );
}

export default ActiveBooking;
