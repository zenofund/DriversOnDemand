import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";

export type UserRole = "driver" | "client" | "admin" | null;

export interface DriverProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email: string;
  verified: boolean;
  hourly_rate: number;
  online_status: "online" | "offline";
  rating: number;
  total_trips: number;
  profile_picture_url: string | null;
}

export interface ClientProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email: string;
  nin_verified: boolean;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  role: UserRole;
  profile: DriverProfile | ClientProfile | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setRole: (role: UserRole) => void;
  setProfile: (profile: DriverProfile | ClientProfile | null) => void;
  setIsLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  role: null,
  profile: null,
  isLoading: true,
  setSession: (session) => set({ session }),
  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  setProfile: (profile) => set({ profile }),
  setIsLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ session: null, user: null, role: null, profile: null }),
}));
