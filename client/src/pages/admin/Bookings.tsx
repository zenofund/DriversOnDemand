import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Calendar, DollarSign, MapPin } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import type { BookingWithDetails } from '@shared/schema';

export default function AdminBookings() {
  const [, setLocation] = useLocation();
  const { user, role } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user || role !== 'admin') {
      setLocation('/auth/login');
    }
  }, [user, role, setLocation]);

  const { data: bookings = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/bookings'],
    enabled: !!user && role === 'admin',
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    useAuthStore.getState().logout();
    setLocation('/auth/login');
  };

  const filteredBookings = bookings.filter(
    (booking) =>
      booking.start_location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.driver?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.client?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.booking_status === 'pending').length,
    ongoing: bookings.filter((b) => b.booking_status === 'ongoing').length,
    completed: bookings.filter((b) => b.booking_status === 'completed').length,
    cancelled: bookings.filter((b) => b.booking_status === 'cancelled').length,
    totalRevenue: bookings
      .filter((b) => b.payment_status === 'paid')
      .reduce((sum, b) => sum + b.total_cost, 0),
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
                Bookings Management
              </h1>
              <p className="text-muted-foreground mt-1">
                Monitor and manage all platform bookings
              </p>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by location, driver, or client..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-status-warning">{stats.pending}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Ongoing</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{stats.ongoing}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-status-success">{stats.completed}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-status-error">{stats.cancelled}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">₦{stats.totalRevenue.toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>

            {/* Bookings Table */}
            <Card>
              <CardHeader>
                <CardTitle>All Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : filteredBookings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No bookings found
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Driver</TableHead>
                          <TableHead>Route</TableHead>
                          <TableHead>Distance</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBookings.map((booking) => (
                          <TableRow key={booking.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {new Date(booking.created_at).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{booking.client?.full_name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {booking.client?.phone}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{booking.driver?.full_name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {booking.driver?.phone}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-xs">
                                <div className="flex items-start gap-1 text-sm">
                                  <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                  <span className="truncate">{booking.start_location}</span>
                                </div>
                                <div className="flex items-start gap-1 text-sm text-muted-foreground">
                                  <MapPin className="h-4 w-4 text-status-error mt-0.5 flex-shrink-0" />
                                  <span className="truncate">{booking.destination}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {booking.distance_km.toFixed(1)} km
                            </TableCell>
                            <TableCell className="font-semibold">
                              ₦{booking.total_cost.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  booking.payment_status === 'paid'
                                    ? 'default'
                                    : booking.payment_status === 'pending'
                                    ? 'secondary'
                                    : 'destructive'
                                }
                              >
                                {booking.payment_status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={booking.booking_status} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
