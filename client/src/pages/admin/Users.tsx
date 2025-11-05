import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Search, CheckCircle, XCircle, User, Car } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Driver, Client } from '@shared/schema';

export default function AdminUsers() {
  const [, setLocation] = useLocation();
  const { user, role } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (!user || role !== 'admin') {
      setLocation('/auth/login');
    }
  }, [user, role, setLocation]);

  const { data: drivers = [], isLoading: driversLoading } = useQuery<Driver[]>({
    queryKey: ['/api/admin/drivers'],
    enabled: !!user && role === 'admin',
  });

  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ['/api/admin/clients'],
    enabled: !!user && role === 'admin',
  });

  const updateDriverMutation = useMutation({
    mutationFn: async ({ id, verified }: { id: string; verified: boolean }) => {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(`/api/admin/drivers/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ verified }),
      });

      if (!response.ok) {
        throw new Error('Failed to update driver');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/drivers'] });
      toast({
        title: 'Success',
        description: 'Driver updated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update driver',
        variant: 'destructive',
      });
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    useAuthStore.getState().logout();
    setLocation('/auth/login');
  };

  const filteredDrivers = drivers.filter(
    (driver) =>
      driver.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.phone.includes(searchTerm)
  );

  const filteredClients = clients.filter(
    (client) =>
      client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone.includes(searchTerm)
  );

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
                User Management
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage drivers and clients on the platform
              </p>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Drivers</CardTitle>
                  <Car className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{drivers.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Verified Drivers</CardTitle>
                  <CheckCircle className="h-4 w-4 text-status-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {drivers.filter((d) => d.verified).length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                  <User className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{clients.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Online Drivers</CardTitle>
                  <CheckCircle className="h-4 w-4 text-status-online" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {drivers.filter((d) => d.online_status === 'online').length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tables */}
            <Tabs defaultValue="drivers" className="space-y-4">
              <TabsList>
                <TabsTrigger value="drivers">
                  Drivers ({filteredDrivers.length})
                </TabsTrigger>
                <TabsTrigger value="clients">
                  Clients ({filteredClients.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="drivers" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>All Drivers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {driversLoading ? (
                      <div className="text-center py-8">Loading...</div>
                    ) : filteredDrivers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No drivers found
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Phone</TableHead>
                              <TableHead>License</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Verified</TableHead>
                              <TableHead>Rating</TableHead>
                              <TableHead>Trips</TableHead>
                              <TableHead>Hourly Rate</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredDrivers.map((driver) => (
                              <TableRow key={driver.id}>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10 border-2 border-primary/10">
                                      <AvatarImage 
                                        src={driver.profile_picture_url || undefined} 
                                        alt={driver.full_name}
                                      />
                                      <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                                        {driver.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium">{driver.full_name}</span>
                                  </div>
                                </TableCell>
                                <TableCell>{driver.email}</TableCell>
                                <TableCell>{driver.phone}</TableCell>
                                <TableCell>{driver.license_no || 'N/A'}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      driver.online_status === 'online'
                                        ? 'default'
                                        : 'secondary'
                                    }
                                  >
                                    {driver.online_status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {driver.verified ? (
                                    <CheckCircle className="h-5 w-5 text-status-success" />
                                  ) : (
                                    <XCircle className="h-5 w-5 text-status-error" />
                                  )}
                                </TableCell>
                                <TableCell>
                                  {driver.rating.toFixed(1)} ⭐
                                </TableCell>
                                <TableCell>{driver.total_trips}</TableCell>
                                <TableCell>₦{driver.hourly_rate.toLocaleString()}</TableCell>
                                <TableCell>
                                  {!driver.verified && (
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        updateDriverMutation.mutate({
                                          id: driver.id,
                                          verified: true,
                                        })
                                      }
                                      disabled={updateDriverMutation.isPending}
                                    >
                                      Verify
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="clients" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>All Clients</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {clientsLoading ? (
                      <div className="text-center py-8">Loading...</div>
                    ) : filteredClients.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No clients found
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Phone</TableHead>
                              <TableHead>Verified</TableHead>
                              <TableHead>Joined</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredClients.map((client) => (
                              <TableRow key={client.id}>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10 border-2 border-primary/10">
                                      <AvatarImage 
                                        src={client.profile_picture_url || undefined} 
                                        alt={client.full_name}
                                      />
                                      <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                                        {client.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium">{client.full_name}</span>
                                  </div>
                                </TableCell>
                                <TableCell>{client.email}</TableCell>
                                <TableCell>{client.phone}</TableCell>
                                <TableCell>
                                  {client.verified ? (
                                    <CheckCircle className="h-5 w-5 text-status-success" />
                                  ) : (
                                    <XCircle className="h-5 w-5 text-status-error" />
                                  )}
                                </TableCell>
                                <TableCell>
                                  {new Date(client.created_at).toLocaleDateString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
