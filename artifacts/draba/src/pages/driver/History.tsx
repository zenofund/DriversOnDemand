import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { History as HistoryIcon, DollarSign, Calendar } from 'lucide-react';
import { coerceAmount, formatNaira } from '@/lib/currency';
import { BookingCard } from '@/components/BookingCard';

interface Booking {
  id: string;
  client_id: number;
  start_location: string;
  destination: string;
  booking_status: 'pending' | 'accepted' | 'ongoing' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'authorized' | 'paid' | 'failed' | 'refunded';
  total_fare?: number;
  total_cost: number;
  created_at: string;
  scheduled_time?: string;
  client: {
    full_name: string;
    phone: string;
  };
}

export default function History() {
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

  const { data: bookings = [], isLoading: isLoadingHistory } = useQuery<Booking[]>({
    queryKey: ['/api/bookings/history'],
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    setLocation('/auth/login');
  };

  if (!user) {
    return null;
  }

  const totalEarned = bookings
    .filter(b => b.booking_status === 'completed')
    .reduce((sum, b) => sum + coerceAmount(b.total_fare || b.total_cost), 0);

  const completedCount = bookings.filter(b => b.booking_status === 'completed').length;
  const cancelledCount = bookings.filter(b => b.booking_status === 'cancelled').length;

  return (
    <DashboardLayout role="driver" onLogout={handleLogout}>
      <div className="p-4 sm:p-6 md:p-8">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold font-heading text-foreground">
                Booking History
              </h1>
              <p className="text-muted-foreground mt-1">
                View your completed and cancelled bookings
              </p>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
                  <HistoryIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-trips">
                    {bookings.length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {completedCount} completed, {cancelledCount} cancelled
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed Trips</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-completed-trips">
                    {completedCount}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Successfully completed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-earned">
                    {formatNaira(totalEarned)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    From completed trips
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Bookings List */}
            {isLoadingHistory ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading history...
              </div>
            ) : bookings.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center space-y-3">
                    <HistoryIcon className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="text-lg font-medium text-foreground">
                      No booking history
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Your completed and cancelled bookings will appear here
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div>
                <div className="mb-4">
                  <h2 className="text-xl font-semibold">All Bookings</h2>
                  <p className="text-sm text-muted-foreground">
                    Your past trips and bookings
                  </p>
                </div>
                <div className="space-y-4">
                  {bookings.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={{
                        ...booking,
                        total_cost: booking.total_fare || booking.total_cost,
                      }}
                      role="driver"
                      viewMode="history"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
    </DashboardLayout>
  );
}
