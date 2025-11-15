import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Car } from 'lucide-react';
import { BookingCard } from '@/components/BookingCard';

interface Booking {
  id: string;
  client_id: string;
  start_location: string;
  destination: string;
  start_coordinates: any;
  destination_coordinates: any;
  booking_status: 'pending' | 'accepted' | 'ongoing' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'authorized' | 'paid' | 'failed' | 'refunded';
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
  const { user, profile, isLoading, logout } = useAuthStore();
  const { toast } = useToast();

  useEffect(() => {
    if (isLoading) return;
    
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
  }, [isLoading, user, profile, setLocation, toast]);

  const { data: bookings = [], isLoading: isLoadingBookings } = useQuery<Booking[]>({
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
    onError: (error: Error) => {
      toast({
        title: 'Failed to accept',
        description: error.message || 'Could not accept this booking',
        variant: 'destructive',
      });
    },
  });

  const rejectBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await apiRequest('POST', `/api/bookings/${bookingId}/reject`, {});
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Booking rejected',
        description: 'You have rejected this booking. The client will be notified.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/history'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to reject',
        description: error.message || 'Could not reject this booking',
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

  const handleChat = (bookingId: string) => {
    setLocation(`/driver/chat/${bookingId}`);
  };

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout role="driver" onLogout={handleLogout}>
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
            {isLoadingBookings ? (
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
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    role="driver"
                    viewMode="active"
                    onAccept={(id) => acceptBookingMutation.mutate(id)}
                    onReject={(id) => rejectBookingMutation.mutate(id)}
                    onConfirmCompletion={(id) => confirmCompletionMutation.mutate(id)}
                    onChat={handleChat}
                    isLoading={acceptBookingMutation.isPending || rejectBookingMutation.isPending || confirmCompletionMutation.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
    </DashboardLayout>
  );
}
