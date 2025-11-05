import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { DriverReviews } from '@/components/DriverReviews';
import type { Driver } from '@shared/schema';

export default function DriverReviewsPage() {
  const [, setLocation] = useLocation();
  const { user, profile } = useAuthStore();

  useEffect(() => {
    if (!user) {
      setLocation('/auth/login');
    }
  }, [user, setLocation]);

  const { data: driver } = useQuery<Driver>({
    queryKey: ['/api/drivers/me'],
    enabled: !!user,
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    useAuthStore.getState().logout();
    setLocation('/auth/login');
  };

  if (!user || !profile || !driver) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar role="driver" onLogout={handleLogout} />

      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold font-heading text-foreground">
                My Reviews
              </h1>
              <p className="text-muted-foreground mt-1">
                See what clients are saying about you
              </p>
            </div>

            {/* Reviews Component */}
            <DriverReviews
              driverId={driver.id}
              driverName={driver.full_name}
              averageRating={driver.rating}
              totalTrips={driver.total_trips}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
