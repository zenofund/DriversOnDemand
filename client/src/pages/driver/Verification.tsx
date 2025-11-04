import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { CheckCircle2, AlertCircle, Shield, CreditCard, FileText } from 'lucide-react';
import type { Driver } from '@shared/schema';

const VERIFICATION_FEE = 5000; // ₦5,000

export default function DriverVerification() {
  const [, setLocation] = useLocation();
  const { user, profile, logout } = useAuthStore();
  const { toast } = useToast();
  const [step, setStep] = useState<'profile' | 'payment'>('profile');
  const [profileData, setProfileData] = useState({
    full_name: '',
    phone: '',
    license_no: '',
    hourly_rate: '2000',
  });

  // Fetch driver data
  const { data: driverData, isLoading } = useQuery<Driver>({
    queryKey: ['/api/drivers/me'],
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) {
      setLocation('/auth/login');
      return;
    }

    // If already verified, redirect to dashboard
    if (driverData?.verified) {
      toast({
        title: 'Already verified',
        description: 'Your account is already verified',
      });
      setLocation('/driver/dashboard');
      return;
    }

    // Pre-fill form with existing data
    if (driverData) {
      setProfileData({
        full_name: driverData.full_name || '',
        phone: driverData.phone || '',
        license_no: driverData.license_no || '',
        hourly_rate: driverData.hourly_rate?.toString() || '2000',
      });

      // If profile is complete (has license number), go to payment step
      if (driverData.license_no && driverData.license_no.length >= 5) {
        setStep('payment');
      }
    }
  }, [user, driverData, setLocation]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PATCH', '/api/drivers/profile', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update profile');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Profile updated',
        description: 'Your profile has been completed successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/me'] });
      setStep('payment');
    },
    onError: (error: Error) => {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const initializePaymentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/payments/verify-driver', {});
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to initialize payment');
      }
      return response.json();
    },
    onSuccess: (data: { authorization_url: string; reference: string }) => {
      // Redirect to Paystack payment page
      window.location.href = data.authorization_url;
    },
    onError: (error: Error) => {
      toast({
        title: 'Payment initialization failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!profileData.full_name || profileData.full_name.length < 2) {
      toast({
        title: 'Validation error',
        description: 'Full name must be at least 2 characters',
        variant: 'destructive',
      });
      return;
    }

    if (!profileData.phone || profileData.phone.length < 10) {
      toast({
        title: 'Validation error',
        description: 'Valid phone number required',
        variant: 'destructive',
      });
      return;
    }

    if (!profileData.license_no || profileData.license_no.length < 5) {
      toast({
        title: 'Validation error',
        description: 'Valid license number required (minimum 5 characters)',
        variant: 'destructive',
      });
      return;
    }

    const hourlyRate = parseFloat(profileData.hourly_rate);
    if (isNaN(hourlyRate) || hourlyRate <= 0) {
      toast({
        title: 'Validation error',
        description: 'Valid hourly rate required',
        variant: 'destructive',
      });
      return;
    }

    updateProfileMutation.mutate({
      full_name: profileData.full_name.trim(),
      phone: profileData.phone.trim(),
      license_no: profileData.license_no.trim().toUpperCase(),
      hourly_rate: hourlyRate,
    });
  };

  const handlePayment = () => {
    initializePaymentMutation.mutate();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    setLocation('/auth/login');
  };

  if (!user || isLoading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold font-heading">Driver Verification</h1>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            <div className={`flex items-center gap-2 ${step === 'profile' ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                step === 'profile' ? 'border-primary bg-primary text-primary-foreground' : 
                step === 'payment' ? 'border-primary bg-primary text-primary-foreground' :
                'border-muted-foreground'
              }`}>
                {step === 'payment' ? <CheckCircle2 className="h-5 w-5" /> : '1'}
              </div>
              <span className="font-medium">Complete Profile</span>
            </div>
            <div className="w-16 h-0.5 bg-border" />
            <div className={`flex items-center gap-2 ${step === 'payment' ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                step === 'payment' ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'
              }`}>
                2
              </div>
              <span className="font-medium">Pay Verification Fee</span>
            </div>
          </div>
        </div>

        {/* Alert */}
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            To ensure the safety and quality of our platform, all drivers must complete verification. 
            This is a one-time process that includes profile completion and a ₦{VERIFICATION_FEE.toLocaleString()} verification fee.
          </AlertDescription>
        </Alert>

        {/* Step 1: Profile Completion */}
        {step === 'profile' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Complete Your Profile
              </CardTitle>
              <CardDescription>
                Please provide your details and driver's license information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={profileData.full_name}
                    onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                    placeholder="John Doe"
                    required
                    data-testid="input-full-name"
                  />
                  <p className="text-xs text-muted-foreground">Your full legal name as it appears on your driver's license</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    placeholder="08012345678"
                    required
                    data-testid="input-phone"
                  />
                  <p className="text-xs text-muted-foreground">Your active phone number for client communication</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="license_no">Driver's License Number *</Label>
                  <Input
                    id="license_no"
                    value={profileData.license_no}
                    onChange={(e) => setProfileData({ ...profileData, license_no: e.target.value })}
                    placeholder="ABC12345678"
                    required
                    data-testid="input-license"
                  />
                  <p className="text-xs text-muted-foreground">Your valid driver's license number (minimum 5 characters)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hourly_rate">Hourly Rate (₦) *</Label>
                  <Input
                    id="hourly_rate"
                    type="number"
                    min="500"
                    step="100"
                    value={profileData.hourly_rate}
                    onChange={(e) => setProfileData({ ...profileData, hourly_rate: e.target.value })}
                    required
                    data-testid="input-rate"
                  />
                  <p className="text-xs text-muted-foreground">Your preferred hourly rate (you can change this later)</p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-submit-profile"
                >
                  {updateProfileMutation.isPending ? 'Saving...' : 'Continue to Payment'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Payment */}
        {step === 'payment' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Pay Verification Fee
              </CardTitle>
              <CardDescription>
                One-time payment to verify your driver account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  Your profile is complete! Now pay the verification fee to start earning.
                </AlertDescription>
              </Alert>

              <div className="bg-muted p-6 rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium">Verification Fee</span>
                  <span className="text-2xl font-bold text-primary">₦{VERIFICATION_FEE.toLocaleString()}</span>
                </div>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>✓ One-time payment</p>
                  <p>✓ Secure payment via Paystack</p>
                  <p>✓ Instant verification upon successful payment</p>
                  <p>✓ Start receiving bookings immediately</p>
                </div>
              </div>

              <div className="space-y-4">
                <Button 
                  className="w-full"
                  size="lg"
                  onClick={handlePayment}
                  disabled={initializePaymentMutation.isPending}
                  data-testid="button-pay-verification"
                >
                  {initializePaymentMutation.isPending ? 'Processing...' : `Pay ₦${VERIFICATION_FEE.toLocaleString()} Now`}
                </Button>

                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={() => setStep('profile')}
                  disabled={initializePaymentMutation.isPending}
                >
                  Back to Profile
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                By proceeding, you agree to our verification terms. Your payment is secured by Paystack.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Benefits Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Shield className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-semibold mb-1">Professional Status</h3>
                <p className="text-sm text-muted-foreground">
                  Verified badge increases client trust and bookings
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle2 className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-semibold mb-1">Quality Assurance</h3>
                <p className="text-sm text-muted-foreground">
                  Ensures all drivers meet professional standards
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <CreditCard className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-semibold mb-1">Start Earning</h3>
                <p className="text-sm text-muted-foreground">
                  Begin accepting bookings immediately after verification
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
