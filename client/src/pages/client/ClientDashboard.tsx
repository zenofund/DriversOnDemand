import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DriverCard } from '@/components/DriverCard';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { useBookingStore } from '@/store/bookingStore';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { calculateDistance } from '@/lib/distance';
import { MapPin, Search } from 'lucide-react';
import type { Driver } from '@shared/schema';

export default function ClientDashboard() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuthStore();
  const { toast } = useToast();
  const {
    pickupLocation,
    pickupCoords,
    destination,
    setPickupLocation,
    setDestination,
    setSelectedDriver,
  } = useBookingStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showDrivers, setShowDrivers] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    
    if (!user) {
      setLocation('/auth/login');
    }
  }, [isLoading, user, setLocation]);

  const { data: nearbyDrivers = [], isLoading: isLoadingDrivers } = useQuery<Driver[]>({
    queryKey: ['/api/drivers/nearby'],
    enabled: showDrivers && !!searchQuery,
    refetchOnWindowFocus: false,
  });

  // Subscribe to driver status changes
  useEffect(() => {
    if (!showDrivers) return;

    const channel = supabase
      .channel('driver-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'drivers',
        },
        () => {
          // Refetch nearby drivers when any driver's status changes (online/offline)
          queryClient.invalidateQueries({ queryKey: ['/api/drivers/nearby'] });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [showDrivers]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    useAuthStore.getState().logout();
    setLocation('/auth/login');
  };

  const handleSearch = () => {
    if (!pickupLocation || !destination) {
      toast({
        title: 'Missing information',
        description: 'Please enter both pickup and destination locations',
        variant: 'destructive',
      });
      return;
    }

    // Validate that coordinates are set (not 0,0)
    if (!pickupCoords || (pickupCoords.lat === 0 && pickupCoords.lng === 0)) {
      toast({
        title: 'Invalid pickup location',
        description: 'Please select a valid address from the suggestions',
        variant: 'destructive',
      });
      return;
    }

    setSearchQuery(`${pickupLocation}-${destination}`);
    setShowDrivers(true);
  };

  const handleSelectDriver = (driverId: string) => {
    // Find the full driver object from nearby drivers
    const driver = nearbyDrivers.find((d) => d.id === driverId);
    setSelectedDriver(driverId, driver || null);
    setLocation('/client/booking-confirm');
  };

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout role="client" onLogout={handleLogout}>
      <div className="p-4 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold font-heading text-foreground">
                Book a Driver
              </h1>
              <p className="text-muted-foreground mt-1">
                Find verified professional drivers in your area
              </p>
            </div>

            {/* Search Form */}
            <Card>
              <CardHeader>
                <CardTitle>Where do you need a driver?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pickup">Pickup Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                      <LocationAutocomplete
                        id="pickup"
                        placeholder="Enter pickup address"
                        className="pl-10"
                        value={pickupLocation}
                        onChange={(address, coords) => setPickupLocation(address, coords)}
                        data-testid="input-pickup"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="destination">Destination</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                      <LocationAutocomplete
                        id="destination"
                        placeholder="Enter destination address"
                        className="pl-10"
                        value={destination}
                        onChange={(address, coords) => setDestination(address, coords)}
                        data-testid="input-destination"
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleSearch} 
                  className="mt-6 w-full md:w-auto"
                  data-testid="button-search-drivers"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search Available Drivers
                </Button>
              </CardContent>
            </Card>

            {/* Available Drivers */}
            {showDrivers && (
              <div>
                <h2 className="text-2xl font-semibold mb-4">
                  Available Drivers
                </h2>

                {isLoading && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <p className="text-muted-foreground">Searching for drivers...</p>
                    </CardContent>
                  </Card>
                )}

                {!isLoading && nearbyDrivers.length === 0 && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-semibold text-lg mb-2">No Drivers Available</h3>
                      <p className="text-muted-foreground">
                        There are no drivers online in your area right now. Please try again later.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {!isLoading && nearbyDrivers.length > 0 && (
                  <div className="space-y-4">
                    {nearbyDrivers.map((driver) => {
                      // Calculate real distance from pickup location to driver
                      const driverCoords = driver.current_location as { lat: number; lng: number } | null;
                      const distance = pickupCoords && driverCoords
                        ? calculateDistance(
                            pickupCoords.lat,
                            pickupCoords.lng,
                            driverCoords.lat,
                            driverCoords.lng
                          )
                        : 0;

                      return (
                        <DriverCard
                          key={driver.id}
                          driver={driver}
                          distance={distance}
                          onSelect={handleSelectDriver}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
    </DashboardLayout>
  );
}
