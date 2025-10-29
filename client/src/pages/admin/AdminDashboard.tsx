import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Users, Car, DollarSign, TrendingUp } from 'lucide-react';
import type { DashboardStats } from '@shared/schema';

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { user, role } = useAuthStore();

  useEffect(() => {
    if (!user || role !== 'admin') {
      setLocation('/auth/login');
    }
  }, [user, role, setLocation]);

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['/api/admin/stats'],
    enabled: !!user && role === 'admin',
    refetchOnWindowFocus: false,
  });

  const { data: recentBookings = [] } = useQuery({
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
    <div className="flex h-screen bg-background">
      <DashboardSidebar role="admin" onLogout={handleLogout} />

      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
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

              <Card>
                <CardHeader>
                  <CardTitle>Platform Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Online Drivers</span>
                      <span className="text-2xl font-bold text-status-online">
                        {stats?.active_drivers || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Avg Response Time</span>
                      <span className="text-2xl font-bold">
                        2.5min
                      </span>
                    </div>
                  </div>
                </CardContent>
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
      </main>
    </div>
  );
}
