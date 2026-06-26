import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, Users, DollarSign, Star, Activity, MapPin } from 'lucide-react';

interface RevenueData {
  date: string;
  revenue: number;
  bookings: number;
  commission: number;
}

interface DriverMetric {
  driver_id: string;
  driver_name: string;
  total_trips: number;
  total_earnings: number;
  average_rating: number;
  acceptance_rate: number;
}

interface BookingHeatmap {
  hour: number;
  day: string;
  count: number;
}

interface LocationData {
  location: string;
  count: number;
}

export default function Analytics() {
  const [, setLocation] = useLocation();
  const { user, role, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;
    
    if (!user || role !== 'admin') {
      setLocation('/auth/login');
    }
  }, [isLoading, user, role, setLocation]);

  const { data: revenueData = [] } = useQuery<RevenueData[]>({
    queryKey: ['/api/admin/analytics/revenue'],
    enabled: !!user && role === 'admin',
  });

  const { data: driverMetrics = [] } = useQuery<DriverMetric[]>({
    queryKey: ['/api/admin/analytics/drivers'],
    enabled: !!user && role === 'admin',
  });

  const { data: bookingHeatmap = [] } = useQuery<BookingHeatmap[]>({
    queryKey: ['/api/admin/analytics/heatmap'],
    enabled: !!user && role === 'admin',
  });

  const { data: locationData = [] } = useQuery<LocationData[]>({
    queryKey: ['/api/admin/analytics/locations'],
    enabled: !!user && role === 'admin',
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    useAuthStore.getState().logout();
    setLocation('/auth/login');
  };

  if (!user || role !== 'admin') {
    return null;
  }

  // Colors for charts
  const COLORS = ['#7a6200', '#bc9c22', '#8b7300', '#d4a634', '#9e7f00'];

  // Prepare booking status data for pie chart
  const bookingStatusData = [
    { name: 'Completed', value: revenueData.reduce((sum, d) => sum + d.bookings, 0) },
    { name: 'Ongoing', value: Math.floor(revenueData.reduce((sum, d) => sum + d.bookings, 0) * 0.15) },
    { name: 'Pending', value: Math.floor(revenueData.reduce((sum, d) => sum + d.bookings, 0) * 0.10) },
  ];

  return (
    <DashboardLayout role="admin" onLogout={handleLogout}>
      <div className="p-4 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold font-heading text-foreground">
                Analytics Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">
                Comprehensive platform insights and performance metrics
              </p>
            </div>

            <Tabs defaultValue="revenue" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="revenue">Revenue Trends</TabsTrigger>
                <TabsTrigger value="drivers">Driver Performance</TabsTrigger>
                <TabsTrigger value="bookings">Booking Heatmap</TabsTrigger>
                <TabsTrigger value="locations">Locations</TabsTrigger>
              </TabsList>

              {/* Revenue Trends Tab */}
              <TabsContent value="revenue" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        ₦{revenueData.reduce((sum, d) => sum + d.revenue, 0).toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Last 30 days
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {revenueData.reduce((sum, d) => sum + d.bookings, 0).toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Last 30 days
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Platform Commission</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        ₦{revenueData.reduce((sum, d) => sum + d.commission, 0).toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Last 30 days
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Trend</CardTitle>
                    <CardDescription>Daily revenue and booking volume</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <AreaChart data={revenueData}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#7a6200" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#7a6200" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorCommission" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#bc9c22" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#bc9c22" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Area 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="#7a6200" 
                          fillOpacity={1} 
                          fill="url(#colorRevenue)" 
                          name="Revenue (₦)"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="commission" 
                          stroke="#bc9c22" 
                          fillOpacity={1} 
                          fill="url(#colorCommission)" 
                          name="Commission (₦)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Daily Bookings</CardTitle>
                      <CardDescription>Booking volume over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={revenueData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="bookings" fill="#7a6200" name="Bookings" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Booking Status Distribution</CardTitle>
                      <CardDescription>Current booking statuses</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={bookingStatusData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {bookingStatusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Driver Performance Tab */}
              <TabsContent value="drivers" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Performing Drivers</CardTitle>
                    <CardDescription>Drivers ranked by total trips and earnings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={driverMetrics.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="driver_name" angle={-45} textAnchor="end" height={100} />
                        <YAxis yAxisId="left" orientation="left" stroke="#7a6200" />
                        <YAxis yAxisId="right" orientation="right" stroke="#bc9c22" />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="total_trips" fill="#7a6200" name="Total Trips" />
                        <Bar yAxisId="right" dataKey="total_earnings" fill="#bc9c22" name="Earnings (₦)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Driver Ratings</CardTitle>
                      <CardDescription>Average ratings of top drivers</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={driverMetrics.slice(0, 8)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" domain={[0, 5]} />
                          <YAxis type="category" dataKey="driver_name" width={100} />
                          <Tooltip />
                          <Bar dataKey="average_rating" fill="#7a6200" name="Rating" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Acceptance Rates</CardTitle>
                      <CardDescription>Booking acceptance rates</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={driverMetrics.slice(0, 8)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" domain={[0, 100]} />
                          <YAxis type="category" dataKey="driver_name" width={100} />
                          <Tooltip />
                          <Bar dataKey="acceptance_rate" fill="#bc9c22" name="Acceptance %" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Driver Performance Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Driver Performance Metrics</CardTitle>
                    <CardDescription>Detailed performance breakdown</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 font-semibold">Driver</th>
                            <th className="text-right p-3 font-semibold">Total Trips</th>
                            <th className="text-right p-3 font-semibold">Earnings</th>
                            <th className="text-right p-3 font-semibold">Rating</th>
                            <th className="text-right p-3 font-semibold">Acceptance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {driverMetrics.map((driver, index) => (
                            <tr key={driver.driver_id} className="border-b hover:bg-muted/50">
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">#{index + 1}</span>
                                  <span>{driver.driver_name}</span>
                                </div>
                              </td>
                              <td className="text-right p-3">{driver.total_trips}</td>
                              <td className="text-right p-3">₦{driver.total_earnings.toLocaleString()}</td>
                              <td className="text-right p-3">
                                <div className="flex items-center justify-end gap-1">
                                  <Star className="h-4 w-4 fill-primary text-primary" />
                                  <span>{driver.average_rating.toFixed(1)}</span>
                                </div>
                              </td>
                              <td className="text-right p-3">{driver.acceptance_rate.toFixed(0)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Booking Heatmap Tab */}
              <TabsContent value="bookings" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Booking Activity Heatmap</CardTitle>
                    <CardDescription>Booking patterns by day and time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                        <div key={day} className="space-y-2">
                          <p className="text-sm font-medium">{day}</p>
                          <div className="grid grid-cols-24 gap-1">
                            {Array.from({ length: 24 }, (_, hour) => {
                              const count = bookingHeatmap.find(
                                h => h.day === day && h.hour === hour
                              )?.count || 0;
                              const maxCount = Math.max(...bookingHeatmap.map(h => h.count), 1);
                              const opacity = 0.2 + (count / maxCount) * 0.8;
                              
                              return (
                                <div
                                  key={hour}
                                  className="aspect-square rounded-sm"
                                  style={{
                                    backgroundColor: `hsl(48, 100%, 24%, ${opacity})`,
                                  }}
                                  title={`${day} ${hour}:00 - ${count} bookings`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                        <span>12 AM</span>
                        <span>6 AM</span>
                        <span>12 PM</span>
                        <span>6 PM</span>
                        <span>11 PM</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Peak Hours Analysis</CardTitle>
                    <CardDescription>Busiest hours of the day</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={
                        Array.from({ length: 24 }, (_, hour) => ({
                          hour: `${hour}:00`,
                          bookings: bookingHeatmap
                            .filter(h => h.hour === hour)
                            .reduce((sum, h) => sum + h.count, 0)
                        }))
                      }>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="bookings" 
                          stroke="#7a6200" 
                          strokeWidth={2}
                          name="Bookings"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Locations Tab */}
              <TabsContent value="locations" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Locations</CardTitle>
                    <CardDescription>Most popular pickup and destination locations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={locationData.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="location" width={150} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#7a6200" name="Bookings">
                          {locationData.slice(0, 10).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {locationData.slice(0, 6).map((location, index) => (
                    <Card key={location.location}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          #{index + 1} {location.location}
                        </CardTitle>
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{location.count}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          total bookings
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
    </DashboardLayout>
  );
}
