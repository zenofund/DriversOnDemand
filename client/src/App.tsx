import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { ThemeProvider } from "@/components/ThemeProvider";

// Pages
import Landing from "@/pages/Landing";
import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/Signup";
import DriverDashboard from "@/pages/driver/DriverDashboard";
import DriverVerification from "@/pages/driver/Verification";
import DriverSettings from "@/pages/driver/Settings";
import ActiveBookings from "@/pages/driver/ActiveBookings";
import DriverChat from "@/pages/driver/Chat";
import DriverReviews from "@/pages/driver/Reviews";
import Earnings from "@/pages/driver/Earnings";
import History from "@/pages/driver/History";
import ClientDashboard from "@/pages/client/ClientDashboard";
import MyBookings from "@/pages/client/MyBookings";
import BookingConfirm from "@/pages/client/BookingConfirm";
import ActiveBooking from "@/pages/client/ActiveBooking";
import ClientChat from "@/pages/client/Chat";
import ClientSettings from "@/pages/client/Settings";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUsers from "@/pages/admin/Users";
import AdminBookings from "@/pages/admin/Bookings";
import AdminTransactions from "@/pages/admin/Transactions";
import AdminDisputes from "@/pages/admin/Disputes";
import AdminSettings from "@/pages/admin/Settings";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/auth/login" component={Login} />
      <Route path="/auth/signup" component={Signup} />
      <Route path="/driver/verification" component={DriverVerification} />
      <Route path="/driver/dashboard" component={DriverDashboard} />
      <Route path="/driver/bookings" component={ActiveBookings} />
      <Route path="/driver/chat/:id" component={DriverChat} />
      <Route path="/driver/reviews" component={DriverReviews} />
      <Route path="/driver/earnings" component={Earnings} />
      <Route path="/driver/history" component={History} />
      <Route path="/driver/settings" component={DriverSettings} />
      <Route path="/client/dashboard" component={ClientDashboard} />
      <Route path="/client/booking-confirm" component={BookingConfirm} />
      <Route path="/client/active" component={ActiveBooking} />
      <Route path="/client/bookings" component={MyBookings} />
      <Route path="/client/chat/:id" component={ClientChat} />
      <Route path="/client/settings" component={ClientSettings} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/bookings" component={AdminBookings} />
      <Route path="/admin/transactions" component={AdminTransactions} />
      <Route path="/admin/disputes" component={AdminDisputes} />
      <Route path="/admin/settings" component={AdminSettings} />
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
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
