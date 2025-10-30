import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";

// Pages
import Landing from "@/pages/Landing";
import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/Signup";
import DriverDashboard from "@/pages/driver/DriverDashboard";
import DriverSettings from "@/pages/driver/Settings";
import ClientDashboard from "@/pages/client/ClientDashboard";
import MyBookings from "@/pages/client/MyBookings";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/auth/login" component={Login} />
      <Route path="/auth/signup" component={Signup} />
      <Route path="/driver/dashboard" component={DriverDashboard} />
      <Route path="/driver/settings" component={DriverSettings} />
      <Route path="/client/dashboard" component={ClientDashboard} />
      <Route path="/client/bookings" component={MyBookings} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const { setUser, setRole, setProfile, setIsLoading } = useAuthStore();

  const fetchProfile = async (user: any, accessToken: string) => {
    const role = user.user_metadata?.role;
    if (!role) return;

    const endpoint = role === 'driver' ? '/api/drivers/me' :
                    role === 'client' ? '/api/clients/me' :
                    role === 'admin' ? '/api/admin/me' : null;
    
    if (endpoint) {
      try {
        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
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
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        const role = session.user.user_metadata?.role;
        setRole(role);
        if (session.access_token) {
          fetchProfile(session.user, session.access_token);
        }
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        const role = session.user.user_metadata?.role;
        setRole(role);
        if (session.access_token) {
          fetchProfile(session.user, session.access_token);
        }
      } else {
        setUser(null);
        setRole(null);
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [setUser, setRole, setProfile, setIsLoading]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
