import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Shield, CheckCircle } from 'lucide-react';
import { Logo } from '@/components/Logo';

export default function FirstTimeSetup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    setupKey: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please ensure both passwords are the same',
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

    setLoading(true);

    try {
      // Call secure backend endpoint for admin setup
      const response = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          setupKey: formData.setupKey,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Setup failed');
      }

      toast({
        title: 'Admin account created!',
        description: 'Your super admin account has been created successfully. Please log in.',
      });

      // Redirect to login
      setTimeout(() => {
        setLocation('/auth/login');
      }, 2000);
    } catch (error: any) {
      toast({
        title: 'Setup failed',
        description: error.message || 'An error occurred during setup',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center mb-4">
            <Logo size="lg" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold font-heading">Admin Setup</h1>
          </div>
          <p className="text-muted-foreground">
            Create the first super admin account
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>First Time Setup</CardTitle>
            <CardDescription>
              This will create your super admin account with full platform access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="setupKey">Setup Key *</Label>
                <Input
                  id="setupKey"
                  type="password"
                  value={formData.setupKey}
                  onChange={(e) => setFormData({ ...formData, setupKey: e.target.value })}
                  placeholder="Enter setup key"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Required security key for admin setup
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
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
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span>Full platform access</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span>Create additional admins</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span>Manage all platform operations</span>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Create Super Admin Account'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          <p>Already have an account?{' '}
            <a href="/auth/login" className="text-primary hover:underline">
              Log in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
