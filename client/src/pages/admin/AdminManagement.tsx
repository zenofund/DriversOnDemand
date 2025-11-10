import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Shield, UserPlus, Crown, UserCog, CheckCircle2, XCircle } from 'lucide-react';
import type { AdminUser } from '@shared/schema';

export default function AdminManagement() {
  const [, setLocation] = useLocation();
  const { user, role, profile } = useAuthStore();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'moderator',
  });

  useEffect(() => {
    if (!user || role !== 'admin') {
      setLocation('/auth/login');
      return;
    }

    // Check if super admin
    const adminProfile = profile as AdminUser;
    if (adminProfile?.role !== 'super_admin') {
      toast({
        title: 'Access Denied',
        description: 'Only super admins can access this page',
        variant: 'destructive',
      });
      setLocation('/admin/dashboard');
    }
  }, [user, role, profile, setLocation, toast]);

  const { data: adminUsers = [] } = useQuery<AdminUser[]>({
    queryKey: ['/api/admin/users'],
    enabled: !!user && role === 'admin',
  });

  const createAdminMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/admin/users', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create admin');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Admin created',
        description: 'New admin user has been created successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setIsCreateDialogOpen(false);
      setFormData({ name: '', email: '', password: '', role: 'moderator' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Creation failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const response = await apiRequest('PATCH', `/api/admin/users/${id}`, { is_active });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update admin');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Status updated',
        description: 'Admin status has been updated',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    useAuthStore.getState().logout();
    setLocation('/auth/login');
  };

  const handleCreateAdmin = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.password) {
      toast({
        title: 'Validation error',
        description: 'All fields are required',
        variant: 'destructive',
      });
      return;
    }

    if (formData.password.length < 8) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 8 characters',
        variant: 'destructive',
      });
      return;
    }

    createAdminMutation.mutate(formData);
  };

  if (!user || role !== 'admin') {
    return null;
  }

  const superAdmins = adminUsers.filter(a => a.role === 'super_admin');
  const moderators = adminUsers.filter(a => a.role === 'moderator');

  return (
    <DashboardLayout role="admin" onLogout={handleLogout}>
      <div className="p-4 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold font-heading text-foreground">
                  Admin Management
                </h1>
                <p className="text-muted-foreground mt-1">
                  Manage platform administrators and permissions
                </p>
              </div>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Create Admin
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Admins</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{adminUsers.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Super Admins</CardTitle>
                  <Crown className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{superAdmins.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Moderators</CardTitle>
                  <UserCog className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{moderators.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {adminUsers.filter(a => a.is_active).length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Super Admins */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  <CardTitle>Super Administrators</CardTitle>
                </div>
                <CardDescription>
                  Full platform access with ability to create and manage other admins
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {superAdmins.map(admin => (
                    <div
                      key={admin.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Crown className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">{admin.name}</p>
                          <p className="text-sm text-muted-foreground">{admin.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {admin.is_active ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            Inactive
                          </Badge>
                        )}
                        {admin.user_id !== user.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleStatusMutation.mutate({
                              id: admin.id,
                              is_active: !admin.is_active
                            })}
                            disabled={toggleStatusMutation.isPending}
                          >
                            {admin.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                        )}
                        {admin.user_id === user.id && (
                          <Badge variant="outline">You</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Moderators */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <UserCog className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Moderators</CardTitle>
                </div>
                <CardDescription>
                  Limited access - can manage users and bookings but cannot create admins
                </CardDescription>
              </CardHeader>
              <CardContent>
                {moderators.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserCog className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No moderators yet</p>
                    <p className="text-sm">Create moderators to help manage the platform</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {moderators.map(admin => (
                      <div
                        key={admin.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <UserCog className="h-5 w-5 text-foreground" />
                          </div>
                          <div>
                            <p className="font-semibold">{admin.name}</p>
                            <p className="text-sm text-muted-foreground">{admin.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {admin.is_active ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              Inactive
                            </Badge>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleStatusMutation.mutate({
                              id: admin.id,
                              is_active: !admin.is_active
                            })}
                            disabled={toggleStatusMutation.isPending}
                          >
                            {admin.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

      {/* Create Admin Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Admin</DialogTitle>
            <DialogDescription>
              Add a new administrator to help manage the platform
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="admin@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                required
              />
              <p className="text-xs text-muted-foreground">
                Minimum 8 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="moderator">
                    <div className="flex items-center gap-2">
                      <UserCog className="h-4 w-4" />
                      <span>Moderator</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="super_admin">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4" />
                      <span>Super Admin</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formData.role === 'super_admin'
                  ? 'Full access including admin management'
                  : 'Limited access to user and booking management'}
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createAdminMutation.isPending}>
                {createAdminMutation.isPending ? 'Creating...' : 'Create Admin'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
