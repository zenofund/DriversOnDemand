import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Car, MapPin, Clock, Phone, User, CheckCircle, AlertCircle, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Booking {
  id: string;
  client_id: string;
  start_location: string;
  destination: string;
  start_coordinates: any;
  destination_coordinates: any;
  booking_status: string;
  payment_status: string;
  total_cost: number;
  created_at: string;
  driver_confirmed: boolean;
  client_confirmed: boolean;
  scheduled_time?: string;
  client: {
    full_name: string;
    phone: string;
  };
}

export default function ActiveBookings() {
  const [, setLocation] = useLocation();
  const { user, profile, logout } = useAuthStore();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      setLocation('/auth/login');
      return;
    }

    // Check if driver is verified
    if (profile && !(profile as any).verified) {
      toast({
        title: 'Verification required',
        description: 'Please complete your verification first',
      });
      setLocation('/driver/verification');
      return;
    }
  }, [user, profile, setLocation, toast]);

  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ['/api/bookings/active'],
  });

  // Subscribe to booking updates for real-time confirmation status
  useEffect(() => {
    if (!user || !profile) return;

    const channel = supabase
      .channel('booking-confirmations')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `driver_id=eq.${(profile as any).id}`,
        },
        () => {
          // Refetch bookings when any booking is updated (e.g., client confirms)
          queryClient.invalidateQueries({ queryKey: ['/api/bookings/active'] });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, profile]);

  const acceptBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await apiRequest('POST', `/api/bookings/${bookingId}/accept`, {});
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Booking accepted',
        description: 'You have accepted this booking',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/active'] });
    },
    onError: () => {
      toast({
        title: 'Failed to accept',
        description: 'Could not accept this booking',
        variant: 'destructive',
      });
    },
  });

  const confirmCompletionMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return apiRequest('POST', `/api/bookings/${bookingId}/driver-confirm`);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/history'] });
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

  if (!user) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'accepted':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'ongoing':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar role="driver" onLogout={handleLogout} />

      <main className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6 md:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold font-heading text-foreground">
                Active Bookings
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage your current and pending bookings
              </p>
            </div>

            {/* Bookings List */}
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading bookings...
              </div>
            ) : bookings.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center space-y-3">
                    <Car className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="text-lg font-medium text-foreground">
                      No active bookings
                    </p>
                    <p className="text-sm text-muted-foreground">
                      You don't have any active bookings at the moment
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <Card key={booking.id} data-testid={`booking-card-${booking.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">
                            Booking #{booking.id}
                          </CardTitle>
                          <CardDescription>
                            {format(new Date(booking.created_at), 'PPp')}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Badge className={getStatusColor(booking.booking_status)}>
                            {booking.booking_status}
                          </Badge>
                          <Badge variant="outline" data-testid={`payment-status-${booking.id}`}>
                            {booking.payment_status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Client Info */}
                      <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{booking.client.full_name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {booking.client.phone}
                          </p>
                        </div>
                      </div>

                      {/* Location Info */}
                      <div className="grid gap-3">
                        <div className="flex gap-3">
                          <MapPin className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium">Pickup</p>
                            <p className="text-sm text-muted-foreground">
                              {booking.start_location || 'Location not specified'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <MapPin className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium">Destination</p>
                            <p className="text-sm text-muted-foreground">
                              {booking.destination || 'Location not specified'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Scheduled Time */}
                      {booking.scheduled_time && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>Scheduled: {format(new Date(booking.scheduled_time), 'PPp')}</span>
                        </div>
                      )}

                      {/* Completion Confirmation Status */}
                      {booking.booking_status === 'ongoing' && (
                        <Alert className={booking.driver_confirmed ? 'border-green-600 bg-green-50 dark:bg-green-950/20' : 'border-blue-600 bg-blue-50 dark:bg-blue-950/20'}>
                          <AlertCircle className={booking.driver_confirmed ? 'h-4 w-4 text-green-600' : 'h-4 w-4 text-blue-600'} />
                          <AlertDescription className="text-sm">
                            {booking.driver_confirmed && booking.client_confirmed && (
                              <span className="text-green-700 dark:text-green-400 font-medium">
                                Both parties confirmed. Payment processing...
                              </span>
                            )}
                            {booking.driver_confirmed && !booking.client_confirmed && (
                              <span className="text-blue-700 dark:text-blue-400">
                                You confirmed completion. Waiting for client confirmation.
                              </span>
                            )}
                            {!booking.driver_confirmed && booking.client_confirmed && (
                              <span className="text-blue-700 dark:text-blue-400">
                                Client confirmed completion. Please confirm on your end.
                              </span>
                            )}
                            {!booking.driver_confirmed && !booking.client_confirmed && (
                              <span className="text-blue-700 dark:text-blue-400">
                                Trip in progress. Confirm completion when finished.
                              </span>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Fare and Actions */}
                      <div className="flex items-center justify-between pt-2 border-t flex-wrap gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Fare</p>
                          <p className="text-2xl font-bold text-foreground">
                            ₦{booking.total_cost.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {/* Chat Button - Available for all active bookings */}
                          {(booking.booking_status === 'accepted' || booking.booking_status === 'ongoing') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setLocation(`/driver/chat/${booking.id}`)}
                            >
                              <MessageCircle className="h-4 w-4 mr-2" />
                              Chat
                            </Button>
                          )}
                          
                          {booking.booking_status === 'pending' && (
                            <Button
                              onClick={() => acceptBookingMutation.mutate(booking.id)}
                              disabled={acceptBookingMutation.isPending}
                              data-testid={`button-accept-${booking.id}`}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Accept Booking
                            </Button>
                          )}
                          {booking.booking_status === 'ongoing' && !booking.driver_confirmed && (
                            <Button
                              onClick={() => confirmCompletionMutation.mutate(booking.id)}
                              disabled={confirmCompletionMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                              data-testid={`button-confirm-${booking.id}`}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              {confirmCompletionMutation.isPending ? 'Confirming...' : 'Confirm Completion'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
