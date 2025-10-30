import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { BadgeCheck } from 'lucide-react';

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { setUser, setRole, setProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      if (data.user) {
        setUser(data.user);
        
        // Check user metadata for role
        const userRole = data.user.user_metadata?.role;
        setRole(userRole);

        // Fetch and set the profile based on role
        if (userRole) {
          const endpoint = userRole === 'driver' ? '/api/drivers/me' :
                          userRole === 'client' ? '/api/clients/me' :
                          userRole === 'admin' ? '/api/admin/me' : null;
          
          if (endpoint) {
            try {
              const response = await fetch(endpoint, {
                headers: {
                  'Authorization': `Bearer ${data.session?.access_token}`,
                },
              });
              if (response.ok) {
                const profile = await response.json();
                setProfile(profile);
              }
            } catch (err) {
              console.error('Failed to fetch profile:', err);
            }
          }
        }

        toast({
          title: 'Welcome back!',
          description: 'You have successfully logged in.',
        });

        // Redirect based on role
        if (userRole === 'driver') {
          setLocation('/driver/dashboard');
        } else if (userRole === 'client') {
          setLocation('/client/dashboard');
        } else if (userRole === 'admin') {
          setLocation('/admin/dashboard');
        } else {
          setLocation('/');
        }
      }
    } catch (error: any) {
      toast({
        title: 'Login failed',
        description: error.message || 'Invalid email or password',
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
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold font-heading mb-2">
            <div className="h-10 w-10 rounded-md bg-primary flex items-center justify-center">
              <BadgeCheck className="h-6 w-6 text-primary-foreground" />
            </div>
            <span>Drivers On Demand</span>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>Sign in to your account to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  data-testid="input-password"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
                data-testid="button-login-submit"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <p className="text-muted-foreground">
                Don't have an account?{' '}
                <Link href="/auth/signup" className="text-primary font-medium hover:underline" data-testid="link-signup">
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
