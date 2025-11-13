import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { History as HistoryIcon, MapPin, DollarSign, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { coerceAmount, formatNaira } from '@/lib/currency';

interface Booking {
  id: number;
  client_id: number;
  start_location: string;
  destination: string;
  booking_status: string;
  payment_status: string;
  total_fare: number;
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

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
            {isLoading ? (
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
              <Card>
                <CardHeader>
                  <CardTitle>All Bookings</CardTitle>
                  <CardDescription>
                    Your past trips and bookings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {bookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="p-4 rounded-md border"
                        data-testid={`history-booking-${booking.id}`}
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">Booking #{booking.id}</h3>
                              <Badge className={getStatusColor(booking.booking_status)}>
                                {booking.booking_status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(booking.created_at), 'PPp')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Fare</p>
                            <p className="text-lg font-bold">
                              {formatNaira(booking.total_fare || booking.total_cost)}
                            </p>
                          </div>
                        </div>

                        <div className="grid gap-2 mb-3">
                          <div className="flex gap-2 text-sm">
                            <User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground">Client:</span>
                            <span className="font-medium">{booking.client?.full_name || 'Unknown'}</span>
                          </div>
                          <div className="flex gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <span className="text-muted-foreground">From: </span>
                              <span>{booking.start_location || 'N/A'}</span>
                            </div>
                          </div>
                          <div className="flex gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <span className="text-muted-foreground">To: </span>
                              <span>{booking.destination || 'N/A'}</span>
                            </div>
                          </div>
                        </div>

                        <Badge variant="outline" className="text-xs">
                          {booking.payment_status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
    </DashboardLayout>
  );
}
