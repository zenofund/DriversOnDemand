import { create } from "zustand";

interface BookingState {
  pickupLocation: string;
  destination: string;
  selectedDriverId: string | null;
  selectedDriver: Record<string, unknown> | null;
  estimatedCost: number;
  estimatedHours: number;
  setPickupLocation: (loc: string) => void;
  setDestination: (dest: string) => void;
  setSelectedDriver: (id: string, driver: Record<string, unknown> | null) => void;
  setEstimate: (cost: number, hours: number) => void;
  reset: () => void;
}

export const useBookingStore = create<BookingState>((set) => ({
  pickupLocation: "",
  destination: "",
  selectedDriverId: null,
  selectedDriver: null,
  estimatedCost: 0,
  estimatedHours: 1,
  setPickupLocation: (pickupLocation) => set({ pickupLocation }),
  setDestination: (destination) => set({ destination }),
  setSelectedDriver: (id, driver) =>
    set({ selectedDriverId: id, selectedDriver: driver }),
  setEstimate: (estimatedCost, estimatedHours) =>
    set({ estimatedCost, estimatedHours }),
  reset: () =>
    set({
      pickupLocation: "",
      destination: "",
      selectedDriverId: null,
      selectedDriver: null,
      estimatedCost: 0,
      estimatedHours: 1,
    }),
}));
