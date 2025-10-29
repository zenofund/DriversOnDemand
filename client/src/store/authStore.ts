import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import type { Driver, Client, AdminUser } from '@shared/schema';

interface AuthState {
  user: User | null;
  role: 'driver' | 'client' | 'admin' | null;
  profile: Driver | Client | AdminUser | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setRole: (role: 'driver' | 'client' | 'admin' | null) => void;
  setProfile: (profile: Driver | Client | AdminUser | null) => void;
  setIsLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  profile: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  setProfile: (profile) => set({ profile }),
  setIsLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, role: null, profile: null }),
}));
