import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/DashboardLayout';
import { User, Lock, Bell } from 'lucide-react';
import { insertClientSchema, type Client } from '@shared/schema';
import { z } from 'zod';
import { ProfilePictureUpload } from '@/components/ProfilePictureUpload';
import { Switch } from '@/components/ui/switch';

const profileUpdateSchema = insertClientSchema.partial();
type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(8, 'Current password required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Confirm password required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type PasswordChange = z.infer<typeof passwordChangeSchema>;

export default function ClientSettings() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuthStore();
  const { toast } = useToast();

  useEffect(() => {
    if (isLoading) return;
    
    if (!user) {
      setLocation('/auth/login');
    }
  }, [isLoading, user, setLocation]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    useAuthStore.getState().logout();
    setLocation('/auth/login');
  };

  const { data: clientData, isLoading: isLoadingClient } = useQuery<Client>({
    queryKey: ['/api/clients/me'],
    enabled: !!user,
  });

  // Notification preferences
  const { data: notificationPrefs, isLoading: isLoadingPrefs } = useQuery<{
    booking_notifications: boolean;
    payment_notifications: boolean;
    message_notifications: boolean;
  }>({
    queryKey: ['/api/notifications/preferences'],
    enabled: !!user,
  });

  // Profile form
  const profileForm = useForm<ProfileUpdate>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      email: '',
    },
  });

  // Update form when data loads
  useEffect(() => {
    if (clientData) {
      profileForm.reset({
        full_name: clientData.full_name,
        phone: clientData.phone,
        email: clientData.email,
      });
    }
  }, [clientData, profileForm]);

  // Password form
  const passwordForm = useForm<PasswordChange>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileUpdate) => {
      const response = await apiRequest('PATCH', '/api/clients/profile', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients/me'] });
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update failed',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordChange) => {
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      passwordForm.reset();
      toast({
        title: 'Password changed',
        description: 'Your password has been changed successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Password change failed',
        description: error.message || 'Failed to change password',
        variant: 'destructive',
      });
    },
  });

  // Update notification preferences mutation
  const updateNotificationPrefsMutation = useMutation({
    mutationFn: async (prefs: {
      booking_notifications?: boolean;
      payment_notifications?: boolean;
      message_notifications?: boolean;
    }) => {
      const response = await apiRequest('PUT', '/api/notifications/preferences', prefs);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/preferences'] });
      toast({
        title: 'Preferences updated',
        description: 'Your notification preferences have been updated',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update failed',
        description: error.message || 'Failed to update preferences',
        variant: 'destructive',
      });
    },
  });

  const onProfileSubmit = (data: ProfileUpdate) => {
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = (data: PasswordChange) => {
    changePasswordMutation.mutate(data);
  };

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout role="client" onLogout={handleLogout}>
      <div className="container mx-auto p-6 max-w-4xl">
          <h1 className="text-3xl font-bold mb-6" data-testid="text-page-title">Settings</h1>

          <div className="space-y-6">
            {/* Profile Picture */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Picture</CardTitle>
                <CardDescription>
                  Upload a profile picture for easy identification
                </CardDescription>
              </CardHeader>
              <CardContent>
                {clientData && (
                  <ProfilePictureUpload
                    currentImageUrl={clientData.profile_picture_url}
                    userName={clientData.full_name}
                    userType="client"
                    userId={clientData.id}
                    onUploadSuccess={() => {
                      queryClient.invalidateQueries({ queryKey: ['/api/clients/me'] });
                    }}
                  />
                )}
              </CardContent>
            </Card>

            {/* Profile Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  <CardTitle>Profile Information</CardTitle>
                </div>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-20 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                ) : (
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                      <FormField
                        control={profileForm.control}
                        name="full_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Enter your full name"
                                data-testid="input-full-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Enter your phone number"
                                data-testid="input-phone"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="email"
                                placeholder="Enter your email"
                                disabled
                                data-testid="input-email"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                        data-testid="button-update-profile"
                      >
                        {updateProfileMutation.isPending ? 'Updating...' : 'Update Profile'}
                      </Button>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>

            {/* Change Password */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  <CardTitle>Change Password</CardTitle>
                </div>
                <CardDescription>Update your password for better security</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              placeholder="Enter current password"
                              data-testid="input-current-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              placeholder="Enter new password"
                              data-testid="input-new-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              placeholder="Confirm new password"
                              data-testid="input-confirm-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      disabled={changePasswordMutation.isPending}
                      data-testid="button-change-password"
                    >
                      {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Notification Preferences */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  <CardTitle>Notification Preferences</CardTitle>
                </div>
                <CardDescription>Choose which notifications you want to receive</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingPrefs ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor="booking-notifications" className="text-base font-medium">
                          Booking Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified about booking updates and confirmations
                        </p>
                      </div>
                      <Switch
                        id="booking-notifications"
                        checked={notificationPrefs?.booking_notifications ?? true}
                        onCheckedChange={(checked) =>
                          updateNotificationPrefsMutation.mutate({ booking_notifications: checked })
                        }
                        disabled={updateNotificationPrefsMutation.isPending}
                        data-testid="switch-booking-notifications"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor="payment-notifications" className="text-base font-medium">
                          Payment Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified about payment confirmations and receipts
                        </p>
                      </div>
                      <Switch
                        id="payment-notifications"
                        checked={notificationPrefs?.payment_notifications ?? true}
                        onCheckedChange={(checked) =>
                          updateNotificationPrefsMutation.mutate({ payment_notifications: checked })
                        }
                        disabled={updateNotificationPrefsMutation.isPending}
                        data-testid="switch-payment-notifications"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor="message-notifications" className="text-base font-medium">
                          Message Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified when you receive new messages
                        </p>
                      </div>
                      <Switch
                        id="message-notifications"
                        checked={notificationPrefs?.message_notifications ?? true}
                        onCheckedChange={(checked) =>
                          updateNotificationPrefsMutation.mutate({ message_notifications: checked })
                        }
                        disabled={updateNotificationPrefsMutation.isPending}
                        data-testid="switch-message-notifications"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
    </DashboardLayout>
  );
}
