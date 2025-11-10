import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { useLocation } from 'wouter';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { Calendar, MapPin, DollarSign, User, Clock, MessageCircle } from 'lucide-react';
import { RatingDialog } from '@/components/RatingDialog';
import { DashboardLayout } from '@/components/DashboardLayout';

interface Booking {
  id: string;
  driver_id: string;
  start_location: string;
  destination: string;
  distance_km: number;
  duration_hr: number;
  total_cost: number;
  payment_status: string;
  booking_status: string;
  client_confirmed: boolean;
  driver_confirmed: boolean;
  created_at: string;
  driver: {
    full_name: string;
    phone: string;
    rating: number;
  };
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500',
  accepted: 'bg-blue-500',
  ongoing: 'bg-purple-500',
  completed: 'bg-green-500',
  cancelled: 'bg-red-500',
};

export default function MyBookings() {
  const [, setLocation] = useLocation();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [selectedBookingForRating, setSelectedBookingForRating] = useState<Booking | null>(null);

  useEffect(() => {
    if (!user) {
      setLocation('/auth/login');
    }
  }, [user, setLocation]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    useAuthStore.getState().logout();
    setLocation('/auth/login');
  };

  // Fetch client's bookings
  const { data: bookings, isLoading } = useQuery<Booking[]>({
    queryKey: ['/api/bookings/client'],
    enabled: !!user,
  });

  // Confirm completion mutation
  const confirmCompletionMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return apiRequest(`/api/bookings/${bookingId}/client-confirm`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
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

  const handleConfirmCompletion = (bookingId: string) => {
    confirmCompletionMutation.mutate(bookingId);
  };

  return (
    <DashboardLayout role="client" onLogout={handleLogout}>
      <div className="container mx-auto p-6">
          <h1 className="text-3xl font-bold mb-6" data-testid="text-page-title">My Bookings</h1>

          {isLoading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="h-40 bg-muted" />
                </Card>
              ))}
            </div>
          )}

          {!isLoading && (!bookings || bookings.length === 0) && (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground text-lg">No bookings yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Book your first driver from the dashboard
                </p>
              </CardContent>
            </Card>
          )}

          {!isLoading && bookings && bookings.length > 0 && (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <Card key={booking.id} data-testid={`card-booking-${booking.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      Trip to {booking.destination}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        className={statusColors[booking.booking_status]}
                        data-testid={`badge-status-${booking.id}`}
                      >
                        {booking.booking_status}
                      </Badge>
                      {booking.payment_status === 'paid' && (
                        <Badge variant="outline" className="bg-green-50">
                          Paid
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Driver Info */}
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{booking.driver.full_name}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">{booking.driver.phone}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-yellow-600">
                    ⭐ {booking.driver.rating.toFixed(1)}
                  </span>
                </div>

                {/* Location Details */}
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Pickup</p>
                      <p className="text-muted-foreground">{booking.start_location}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Destination</p>
                      <p className="text-muted-foreground">{booking.destination}</p>
                    </div>
                  </div>
                </div>

                {/* Trip Stats */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Distance</p>
                    <p className="font-semibold">{booking.distance_km.toFixed(1)} km</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-semibold">{booking.duration_hr.toFixed(1)} hrs</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Cost</p>
                    <p className="font-semibold">₦{booking.total_cost.toLocaleString()}</p>
                  </div>
                </div>

                {/* Date */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Booked on {format(new Date(booking.created_at), 'PPp')}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t flex-wrap">
                  {/* Chat Button - Available for active bookings */}
                  {(booking.booking_status === 'accepted' || booking.booking_status === 'ongoing') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation(`/client/chat/${booking.id}`)}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Chat
                    </Button>
                  )}
                  
                  {booking.booking_status === 'ongoing' && !booking.client_confirmed && (
                    <Button
                      onClick={() => handleConfirmCompletion(booking.id)}
                      disabled={confirmCompletionMutation.isPending}
                      data-testid={`button-confirm-${booking.id}`}
                    >
                      {confirmCompletionMutation.isPending ? 'Confirming...' : 'Confirm Completion'}
                    </Button>
                  )}

                  {booking.booking_status === 'ongoing' && booking.client_confirmed && !booking.driver_confirmed && (
                    <div className="text-sm text-muted-foreground">
                      ⏳ Waiting for driver to confirm completion
                    </div>
                  )}

                  {booking.booking_status === 'completed' && (
                    <Button
                      variant="outline"
                      onClick={() => setSelectedBookingForRating(booking)}
                      data-testid={`button-rate-${booking.id}`}
                    >
                      Rate Driver
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
          )}

          {/* Rating Dialog */}
          {selectedBookingForRating && (
            <RatingDialog
              open={!!selectedBookingForRating}
              onOpenChange={(open) => !open && setSelectedBookingForRating(null)}
              bookingId={selectedBookingForRating.id}
              driverName={selectedBookingForRating.driver.full_name}
            />
          )}
        </div>
    </DashboardLayout>
  );
}
