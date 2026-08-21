import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

interface AdminUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  role: string;
}

interface AdminAuthState {
  admin: AdminUser | null;
  token: string | null;
  expiresAt: string | null;
  isAuthenticated: boolean;
  login: (admin: AdminUser, token: string, expiresAt?: string) => void;
  logout: () => void;
  isTokenValid: () => boolean;
}

export const useAdminStore = create<AdminAuthState>()(
  persist(
    (set, get) => ({
      admin: null,
      token: null,
      expiresAt: null,
      isAuthenticated: false,
      login: (admin, token, expiresAt) => set({ admin, token, expiresAt: expiresAt ?? null, isAuthenticated: true }),
      logout: () => set({ admin: null, token: null, expiresAt: null, isAuthenticated: false }),
      isTokenValid: () => {
        const { token, expiresAt } = get();
        if (!token) return false;
        if (!expiresAt) return true; // legacy sessions without expiresAt — assume valid
        return new Date(expiresAt) > new Date();
      },
    }),
    {
      name: 'admin-auth-storage',
      storage: createJSONStorage(() =>
        Platform.OS === 'web' ? localStorage : AsyncStorage
      ),
    }
  )
);
