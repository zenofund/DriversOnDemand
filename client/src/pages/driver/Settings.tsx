import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { User, DollarSign, CreditCard, Lock, Save } from 'lucide-react';
import type { Driver } from '@shared/schema';

interface Bank {
  name: string;
  code: string;
  slug: string;
}

export default function Settings() {
  const [, setLocation] = useLocation();
  const { user, profile, logout } = useAuthStore();
  const { toast } = useToast();

  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
    license_no: '',
    hourly_rate: '',
  });

  const [bankForm, setBankForm] = useState({
    bank_code: '',
    account_number: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [verifiedAccountName, setVerifiedAccountName] = useState('');

  useEffect(() => {
    if (!user) {
      setLocation('/auth/login');
      return;
    }

    if (profile) {
      const driver = profile as Driver;
      setProfileForm({
        full_name: driver.full_name,
        phone: driver.phone,
        license_no: driver.license_no || '',
        hourly_rate: driver.hourly_rate.toString(),
      });

      if (driver.bank_code && driver.account_number) {
        setBankForm({
          bank_code: driver.bank_code,
          account_number: driver.account_number,
        });
        setVerifiedAccountName(driver.account_name || '');
      }
    }
  }, [user, profile, setLocation]);

  const { data: banks = [] } = useQuery<Bank[]>({
    queryKey: ['/api/banks'],
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: any) => {
      return await apiRequest('/api/drivers/profile', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/me'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Update failed',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      });
    },
  });

  const updateBankMutation = useMutation({
    mutationFn: async (data: { bank_code: string; account_number: string }) => {
      return await apiRequest('/api/drivers/bank-account', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Bank account updated',
        description: 'Your bank account has been verified and updated',
      });
      setVerifiedAccountName(data.account_name || '');
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/me'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Update failed',
        description: error.message || 'Failed to update bank account',
        variant: 'destructive',
      });
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    setLocation('/auth/login');
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updates: any = {
      full_name: profileForm.full_name,
      phone: profileForm.phone,
      hourly_rate: parseFloat(profileForm.hourly_rate),
    };

    if (profileForm.license_no) {
      updates.license_no = profileForm.license_no;
    }

    updateProfileMutation.mutate(updates);
  };

  const handleBankSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!bankForm.bank_code || !bankForm.account_number) {
      toast({
        title: 'Validation error',
        description: 'Please fill in all bank details',
        variant: 'destructive',
      });
      return;
    }

    if (bankForm.account_number.length !== 10) {
      toast({
        title: 'Validation error',
        description: 'Account number must be 10 digits',
        variant: 'destructive',
      });
      return;
    }

    updateBankMutation.mutate(bankForm);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please make sure your passwords match',
        variant: 'destructive',
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });

      if (error) throw error;

      toast({
        title: 'Password updated',
        description: 'Your password has been changed successfully',
      });

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error.message || 'Failed to update password',
        variant: 'destructive',
      });
    }
  };

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar 
        role="driver" 
        onLogout={handleLogout}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="max-w-3xl mx-auto space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold font-heading text-foreground">
                Settings
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage your account settings and preferences
              </p>
            </div>

            {/* Profile Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  <CardTitle>Profile Information</CardTitle>
                </div>
                <CardDescription>
                  Update your personal information and driver details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={profileForm.full_name}
                        onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                        required
                        data-testid="input-full-name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        required
                        data-testid="input-phone"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="license_no">License Number</Label>
                      <Input
                        id="license_no"
                        value={profileForm.license_no}
                        onChange={(e) => setProfileForm({ ...profileForm, license_no: e.target.value })}
                        data-testid="input-license"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hourly_rate">Hourly Rate (₦)</Label>
                      <Input
                        id="hourly_rate"
                        type="number"
                        step="0.01"
                        value={profileForm.hourly_rate}
                        onChange={(e) => setProfileForm({ ...profileForm, hourly_rate: e.target.value })}
                        required
                        data-testid="input-hourly-rate"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={updateProfileMutation.isPending}
                      data-testid="button-save-profile"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Separator />

            {/* Bank Account */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <CardTitle>Bank Account</CardTitle>
                </div>
                <CardDescription>
                  Update your bank account for receiving payments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBankSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bank_code">Bank Name</Label>
                      <Select
                        value={bankForm.bank_code}
                        onValueChange={(value) => setBankForm({ ...bankForm, bank_code: value })}
                      >
                        <SelectTrigger data-testid="select-bank">
                          <SelectValue placeholder="Select your bank" />
                        </SelectTrigger>
                        <SelectContent>
                          {banks.map((bank) => (
                            <SelectItem key={bank.code} value={bank.code}>
                              {bank.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="account_number">Account Number</Label>
                      <Input
                        id="account_number"
                        value={bankForm.account_number}
                        onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        placeholder="0123456789"
                        maxLength={10}
                        data-testid="input-account-number"
                      />
                    </div>
                  </div>

                  {verifiedAccountName && (
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm">
                        <span className="font-semibold">Account Name:</span>{' '}
                        <span className="text-muted-foreground">{verifiedAccountName}</span>
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={updateBankMutation.isPending}
                      data-testid="button-save-bank"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {updateBankMutation.isPending ? 'Verifying...' : 'Verify & Save'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Separator />

            {/* Password Change */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  <CardTitle>Change Password</CardTitle>
                </div>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        required
                        data-testid="input-new-password"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        required
                        data-testid="input-confirm-password"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" data-testid="button-change-password">
                      <Lock className="h-4 w-4 mr-2" />
                      Change Password
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
