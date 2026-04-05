import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  role: string | null;
  setToken: (token: string, role?: string) => void;
  logout: () => void;
  isLoggedIn: boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      role: null,
      isLoggedIn: false,
      setToken: (token: string, role?: string) => set({ token, role, isLoggedIn: true }),
      logout: () => set({ token: null, role: null, isLoggedIn: false }),
    }),
    {
      name: 'auth-storage', // saves to local storage
    }
  )
);