import { useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Users, Car, DollarSign, TrendingUp, AlertCircle, CreditCard, ArrowRight } from 'lucide-react';
import type { DashboardStats } from '@shared/schema';

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { user, role, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;
    
    if (!user || role !== 'admin') {
      setLocation('/auth/login');
    }
  }, [isLoading, user, role, setLocation]);

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['/api/admin/stats'],
    enabled: !!user && role === 'admin',
    refetchOnWindowFocus: false,
  });

  const { data: recentBookings = [] } = useQuery<any[]>({
    queryKey: ['/api/admin/recent-bookings'],
    enabled: !!user && role === 'admin',
    refetchOnWindowFocus: false,
  });

  // Subscribe to platform-wide changes for real-time updates
  useEffect(() => {
    if (!user || role !== 'admin') return;

    const channel = supabase
      .channel('admin-platform-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        () => {
          // Refetch stats and bookings when any booking changes
          queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
          queryClient.invalidateQueries({ queryKey: ['/api/admin/recent-bookings'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'drivers',
        },
        () => {
          // Refetch stats when new drivers register
          queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'clients',
        },
        () => {
          // Refetch stats when new clients register
          queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, role]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    useAuthStore.getState().logout();
    setLocation('/auth/login');
  };

  if (!user || role !== 'admin') {
    return null;
  }

  return (
    <DashboardLayout role="admin" onLogout={handleLogout}>
      <div className="p-4 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold font-heading text-foreground">
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">
                Platform overview and management
              </p>
            </div>

            {/* KPI Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                icon={Users}
                label="Active Drivers"
                value={stats?.active_drivers || 0}
                trend={{ value: 12, positive: true }}
              />
              <StatCard
                icon={Users}
                label="Total Clients"
                value={stats?.total_clients || 0}
                trend={{ value: 8, positive: true }}
              />
              <StatCard
                icon={DollarSign}
                label="Total Revenue"
                value={`₦${(stats?.total_revenue || 0).toLocaleString()}`}
                trend={{ value: 15, positive: true }}
              />
              <StatCard
                icon={TrendingUp}
                label="Commission Earned"
                value={`₦${(stats?.commission_earned || 0).toLocaleString()}`}
                trend={{ value: 10, positive: true }}
              />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="hover-elevate cursor-pointer transition-all" asChild>
                <Link href="/admin/users">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base font-medium">User Management</CardTitle>
                    <Users className="h-5 w-5 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Manage drivers and clients, verify accounts, and monitor user activity
                    </p>
                    <Button variant="ghost" size="sm" className="w-full">
                      Manage Users
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Link>
              </Card>

              <Card className="hover-elevate cursor-pointer transition-all" asChild>
                <Link href="/admin/bookings">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base font-medium">Bookings</CardTitle>
                    <Car className="h-5 w-5 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Monitor all bookings, track status, and oversee platform operations
                    </p>
                    <Button variant="ghost" size="sm" className="w-full">
                      View Bookings
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Link>
              </Card>

              <Card className="hover-elevate cursor-pointer transition-all" asChild>
                <Link href="/admin/transactions">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base font-medium">Transactions</CardTitle>
                    <CreditCard className="h-5 w-5 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Track all platform transactions, revenue, and commission splits
                    </p>
                    <Button variant="ghost" size="sm" className="w-full">
                      View Transactions
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Link>
              </Card>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Trips Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Today</span>
                      <span className="text-2xl font-bold">
                        {stats?.trips_today || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">This Month</span>
                      <span className="text-2xl font-bold">
                        {stats?.trips_this_month || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover-elevate cursor-pointer transition-all" asChild>
                <Link href="/admin/disputes">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Dispute Resolution</CardTitle>
                    <AlertCircle className="h-5 w-5 text-status-warning" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      View and resolve user disputes to maintain platform quality
                    </p>
                    <Button variant="outline" size="sm" className="w-full">
                      Manage Disputes
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Link>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                {recentBookings.length === 0 ? (
                  <div className="text-center py-8">
                    <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No recent bookings</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentBookings.map((booking: any) => (
                      <div 
                        key={booking.id}
                        className="p-4 border rounded-lg flex justify-between items-center hover-elevate"
                      >
                        <div>
                          <p className="font-semibold">{booking.client_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {booking.start_location} → {booking.destination}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">₦{booking.total_cost?.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(booking.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
    </DashboardLayout>
  );
}
