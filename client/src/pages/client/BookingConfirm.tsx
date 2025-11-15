import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { useBookingStore } from '@/store/bookingStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { MapPin, Clock, DollarSign, User, Phone, Star, ArrowLeft, CreditCard } from 'lucide-react';
import type { Driver } from '@shared/schema';

export default function BookingConfirm() {
  const [, setLocation] = useLocation();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [isCalculating, setIsCalculating] = useState(true);
  const [calculatedCost, setCalculatedCost] = useState<number>(0);
  const [calculatedDuration, setCalculatedDuration] = useState<number>(0);
  const [calculatedDistance, setCalculatedDistance] = useState<number>(0);

  const {
    pickupLocation,
    pickupCoords,
    destination,
    destinationCoords,
    selectedDriverId,
    selectedDriver,
    clearBooking,
  } = useBookingStore();

  useEffect(() => {
    if (!user) {
      setLocation('/auth/login');
    }
  }, [user, setLocation]);

  // Redirect if no booking data
  useEffect(() => {
    if (!pickupLocation || !destination || !selectedDriverId || !selectedDriver || !pickupCoords || !destinationCoords) {
      toast({
        title: 'No booking data',
        description: 'Please start a new booking from the dashboard',
        variant: 'destructive',
      });
      setLocation('/client/dashboard');
    }
  }, [pickupLocation, destination, selectedDriverId, selectedDriver, pickupCoords, destinationCoords, setLocation, toast]);

  // Use selected driver from store (no need to fetch)
  const driver = selectedDriver;
  const isDriverLoading = false;

  // Calculate route details using Google Maps Distance Matrix
  useEffect(() => {
    const calculateRouteDetails = async () => {
      if (!pickupCoords || !destinationCoords || !driver) return;

      try {
        // Load Google Maps routes library
        const loadScript = () => {
          return new Promise<void>((resolve) => {
            if (typeof google !== 'undefined' && google.maps) {
              resolve();
              return;
            }
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=routes`;
            script.async = true;
            script.defer = true;
            script.onload = () => resolve();
            document.head.appendChild(script);
          });
        };

        await loadScript();
        const service = new google.maps.DistanceMatrixService();

        service.getDistanceMatrix({
          origins: [new google.maps.LatLng(pickupCoords.lat, pickupCoords.lng)],
          destinations: [new google.maps.LatLng(destinationCoords.lat, destinationCoords.lng)],
          travelMode: google.maps.TravelMode.DRIVING,
        }, (response, status) => {
          if (status === 'OK' && response?.rows[0]?.elements[0]) {
            const result = response.rows[0].elements[0];
            
            if (result.status === 'OK') {
              const distanceKm = (result.distance?.value || 0) / 1000; // Convert meters to km
              const durationHr = (result.duration?.value || 0) / 3600; // Convert seconds to hours
              
              // Calculate cost: hourly_rate * duration_hr
              const cost = Math.round(driver.hourly_rate * durationHr);
              
              setCalculatedDistance(distanceKm);
              setCalculatedDuration(durationHr);
              setCalculatedCost(cost);
              setIsCalculating(false);
            }
          } else {
            toast({
              title: 'Route calculation failed',
              description: 'Could not calculate route details. Using estimates.',
              variant: 'destructive',
            });
            setIsCalculating(false);
          }
        });
      } catch (error) {
        console.error('Error calculating route:', error);
        toast({
          title: 'Error',
          description: 'Failed to calculate route details',
          variant: 'destructive',
        });
        setIsCalculating(false);
      }
    };

    if (driver && pickupCoords && destinationCoords) {
      calculateRouteDetails();
    }
  }, [driver, pickupCoords, destinationCoords, toast]);

  // Create booking and initialize payment
  const createBookingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDriverId || !pickupCoords || !destinationCoords) {
        throw new Error('Missing booking data');
      }

      // Create pending booking
      const pendingBookingResponse = await apiRequest('POST', '/api/bookings', {
        driver_id: selectedDriverId,
        start_location: pickupLocation,
        destination: destination,
        start_coordinates: pickupCoords,
        destination_coordinates: destinationCoords,
        distance_km: calculatedDistance,
        duration_hr: calculatedDuration,
        total_cost: calculatedCost,
      });

      const pendingBooking = await pendingBookingResponse.json();

      // Initialize payment with pending booking ID
      const paymentResponse = await apiRequest('POST', '/api/payments/initialize-booking', {
        pending_booking_id: pendingBooking.id,
      });

      return paymentResponse.json();
    },
    onSuccess: (data) => {
      // Redirect to Paystack payment page
      if (data.authorization_url) {
        // Note: Don't clear booking store here - it causes error toast before redirect
        // Store will be cleared after successful payment confirmation
        window.location.href = data.authorization_url;
      } else {
        toast({
          title: 'Error',
          description: 'Failed to initialize payment',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Booking failed',
        description: error.message || 'Failed to create booking',
        variant: 'destructive',
      });
    },
  });

  const handleConfirmBooking = () => {
    if (isCalculating) {
      toast({
        title: 'Please wait',
        description: 'Still calculating route details...',
      });
      return;
    }

    if (calculatedCost === 0) {
      toast({
        title: 'Error',
        description: 'Could not calculate cost. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    createBookingMutation.mutate();
  };

  const handleBack = () => {
    setLocation('/client/dashboard');
  };

  if (!user || !driver) {
    return null;
  }

  const durationMinutes = Math.round(calculatedDuration * 60);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6 max-w-4xl">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <Button 
            variant="ghost" 
            onClick={handleBack}
            className="mb-3 md:mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-page-title">Confirm Booking</h1>
          <p className="text-sm md:text-base text-muted-foreground">Review your booking details before payment</p>
        </div>

        <div className="grid gap-4 md:gap-6">
          {/* Driver Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Driver Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
                <div className="h-20 w-20 md:h-16 md:w-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-10 w-10 md:h-8 md:w-8 text-primary" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="font-semibold text-lg md:text-xl" data-testid="text-driver-name">{driver.full_name}</h3>
                  <div className="flex items-center justify-center md:justify-start gap-4 mt-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span data-testid="text-driver-rating">{driver.rating.toFixed(1)}</span>
                    </div>
                    <span data-testid="text-driver-trips">{driver.total_trips} trips</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Contact details will be available after payment confirmation
                  </p>
                </div>
                <div className="text-center md:text-right w-full md:w-auto">
                  <div className="text-sm text-muted-foreground">Hourly Rate</div>
                  <div className="text-xl md:text-lg font-semibold" data-testid="text-driver-rate">
                    ₦{driver.hourly_rate.toLocaleString()}/hr
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trip Details */}
          <Card>
            <CardHeader>
              <CardTitle>Trip Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground">Pickup</div>
                  <div className="font-medium" data-testid="text-pickup">{pickupLocation}</div>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground">Destination</div>
                  <div className="font-medium" data-testid="text-destination">{destination}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cost Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown</CardTitle>
              <CardDescription>
                {isCalculating ? 'Calculating route details...' : 'Based on estimated trip duration'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isCalculating || isDriverLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-8 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Estimated Duration</span>
                    </div>
                    <span className="font-medium" data-testid="text-duration">
                      {durationMinutes} minutes
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>Distance</span>
                    </div>
                    <span className="font-medium" data-testid="text-distance">
                      {calculatedDistance.toFixed(1)} km
                    </span>
                  </div>

                  <Separator />

                  <div className="flex justify-between items-center text-lg">
                    <div className="flex items-center gap-2 font-semibold">
                      <DollarSign className="h-5 w-5" />
                      <span>Total Cost</span>
                    </div>
                    <span className="font-bold text-primary" data-testid="text-total-cost">
                      ₦{calculatedCost.toLocaleString()}
                    </span>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Rate: ₦{driver.hourly_rate.toLocaleString()}/hr × {calculatedDuration.toFixed(2)} hours
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex-1 h-11 md:h-10"
              disabled={createBookingMutation.isPending}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmBooking}
              className="flex-1 h-11 md:h-10 text-sm md:text-base"
              disabled={isCalculating || isDriverLoading || createBookingMutation.isPending}
              data-testid="button-confirm-pay"
            >
              {createBookingMutation.isPending ? (
                'Processing...'
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-1.5 md:mr-2 flex-shrink-0" />
                  <span className="truncate">Confirm & Pay ₦{calculatedCost.toLocaleString()}</span>
                </>
              )}
            </Button>
          </div>

          {/* Payment Info */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4 md:pt-6 pb-4 md:pb-6">
              <p className="text-xs md:text-sm text-muted-foreground text-center leading-relaxed">
                You'll be redirected to Paystack to complete your payment securely.
                Payment will be held until trip completion is confirmed.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
