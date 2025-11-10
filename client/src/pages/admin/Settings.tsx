import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings as SettingsIcon, DollarSign, Percent } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminSettings() {
  const [, setLocation] = useLocation();
  const { user, role } = useAuthStore();
  const [commissionPercentage, setCommissionPercentage] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (!user || role !== 'admin') {
      setLocation('/auth/login');
    }
  }, [user, role, setLocation]);

  const { data: settings = [] } = useQuery<any[]>({
    queryKey: ['/api/admin/settings'],
    enabled: !!user && role === 'admin',
  });

  useEffect(() => {
    const commissionSetting = settings.find((s) => s.setting_key === 'commission_percentage');
    if (commissionSetting) {
      setCommissionPercentage(commissionSetting.setting_value);
    }
  }, [settings]);

  const updateCommissionMutation = useMutation({
    mutationFn: async (percentage: number) => {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch('/api/admin/settings/commission', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ commission_percentage: percentage }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update commission');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      toast({
        title: 'Success',
        description: 'Commission percentage updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
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

  const handleUpdateCommission = () => {
    const percentage = parseFloat(commissionPercentage);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      toast({
        title: 'Invalid Input',
        description: 'Commission must be between 0 and 100',
        variant: 'destructive',
      });
      return;
    }

    updateCommissionMutation.mutate(percentage);
  };

  if (!user || role !== 'admin') {
    return null;
  }

  return (
    <DashboardLayout role="admin" onLogout={handleLogout}>
      <div className="p-4 sm:p-6 md:p-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold font-heading text-foreground">
                Platform Settings
              </h1>
              <p className="text-muted-foreground mt-1">
                Configure platform-wide settings and policies
              </p>
            </div>

            {/* Commission Settings */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Percent className="h-5 w-5 text-primary" />
                  <CardTitle>Commission Settings</CardTitle>
                </div>
                <CardDescription>
                  Set the platform commission percentage for all bookings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="commission">Commission Percentage (%)</Label>
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <Input
                        id="commission"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={commissionPercentage}
                        onChange={(e) => setCommissionPercentage(e.target.value)}
                        placeholder="10"
                      />
                      <p className="text-sm text-muted-foreground mt-2">
                        Current: {commissionPercentage}% platform commission
                      </p>
                    </div>
                    <Button
                      onClick={handleUpdateCommission}
                      disabled={updateCommissionMutation.isPending}
                    >
                      Update Commission
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">How it works</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Platform takes {commissionPercentage}% of each booking</li>
                    <li>• Driver receives {100 - parseFloat(commissionPercentage || '0')}% of the booking amount</li>
                    <li>• Commission is calculated automatically on booking completion</li>
                    <li>• Changes apply to all new bookings immediately</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Revenue Breakdown Example */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-status-success" />
                  <CardTitle>Revenue Split Example</CardTitle>
                </div>
                <CardDescription>
                  Example breakdown for a ₦10,000 booking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="font-medium">Total Booking Amount</span>
                    <span className="text-xl font-bold">₦10,000</span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
                    <span className="font-medium">Platform Commission ({commissionPercentage}%)</span>
                    <span className="text-xl font-bold text-primary">
                      ₦{(10000 * (parseFloat(commissionPercentage || '0') / 100)).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-status-success/10 rounded-lg">
                    <span className="font-medium">
                      Driver Earnings ({100 - parseFloat(commissionPercentage || '0')}%)
                    </span>
                    <span className="text-xl font-bold text-status-success">
                      ₦{(10000 * ((100 - parseFloat(commissionPercentage || '0')) / 100)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Platform Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Platform Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Admin Role</span>
                    <span className="font-medium">Super Admin</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Platform Status</span>
                    <span className="font-medium text-status-online">Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Gateway</span>
                    <span className="font-medium">Paystack</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Database</span>
                    <span className="font-medium">Supabase PostgreSQL</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
    </DashboardLayout>
  );
}
