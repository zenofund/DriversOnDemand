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
import { Car, MapPin, Clock, Phone, User, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface Booking {
  id: number;
  client_id: number;
  pickup_location: any;
  dropoff_location: any;
  booking_status: string;
  payment_status: string;
  total_fare: number;
  created_at: string;
  scheduled_time?: string;
  client: {
    name: string;
    phone: string;
  };
}

export default function ActiveBookings() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuthStore();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      setLocation('/auth/login');
    }
  }, [user, setLocation]);

  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ['/api/bookings/active'],
  });

  const acceptBookingMutation = useMutation({
    mutationFn: async (bookingId: number) => {
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
        <div className="p-8">
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
                          <p className="font-medium text-sm">{booking.client.name}</p>
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
                              {booking.pickup_location?.address || 'Location not specified'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <MapPin className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium">Dropoff</p>
                            <p className="text-sm text-muted-foreground">
                              {booking.dropoff_location?.address || 'Location not specified'}
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

                      {/* Fare and Actions */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Fare</p>
                          <p className="text-2xl font-bold text-foreground">
                            ₦{booking.total_fare.toLocaleString()}
                          </p>
                        </div>
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
