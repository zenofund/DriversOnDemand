import { create } from 'zustand';

interface LocationCoords {
  lat: number;
  lng: number;
}

interface BookingState {
  pickupLocation: string;
  pickupCoords: LocationCoords | null;
  destination: string;
  destinationCoords: LocationCoords | null;
  selectedDriverId: string | null;
  estimatedCost: number;
  estimatedDuration: number;
  estimatedDistance: number;
  setPickupLocation: (location: string, coords: LocationCoords) => void;
  setDestination: (location: string, coords: LocationCoords) => void;
  setSelectedDriver: (driverId: string | null) => void;
  setEstimates: (cost: number, duration: number, distance: number) => void;
  clearBooking: () => void;
}

export const useBookingStore = create<BookingState>((set) => ({
  pickupLocation: '',
  pickupCoords: null,
  destination: '',
  destinationCoords: null,
  selectedDriverId: null,
  estimatedCost: 0,
  estimatedDuration: 0,
  estimatedDistance: 0,
  setPickupLocation: (location, coords) => 
    set({ pickupLocation: location, pickupCoords: coords }),
  setDestination: (location, coords) => 
    set({ destination: location, destinationCoords: coords }),
  setSelectedDriver: (driverId) => 
    set({ selectedDriverId: driverId }),
  setEstimates: (cost, duration, distance) => 
    set({ estimatedCost: cost, estimatedDuration: duration, estimatedDistance: distance }),
  clearBooking: () => 
    set({
      pickupLocation: '',
      pickupCoords: null,
      destination: '',
      destinationCoords: null,
      selectedDriverId: null,
      estimatedCost: 0,
      estimatedDuration: 0,
      estimatedDistance: 0,
    }),
}));
