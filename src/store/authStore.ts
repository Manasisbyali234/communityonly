import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { User } from '../types';
import { getApiBaseUrl } from '../api/config';

// Normalise any image URL to use the current BASE host.
// Handles three cases:
//   1. Relative path  "/api/v1/..."  → prepend BASE
//   2. Proxy URL with a different host (stale IP in AsyncStorage) → rewrite host to BASE
//   3. External URL (https://...) → leave unchanged
const toAbs = (url?: string | null): string | undefined => {
  const BASE = getApiBaseUrl().replace('/api/v1', '');
  if (!url) return undefined;
  if (url.startsWith('/')) return `${BASE}${url}`;
  // Rewrite proxy URLs that point to a different host so they always use the current server IP.
  if (url.includes('/api/v1/media/proxy/')) {
    try {
      const parsed = new URL(url);
      const current = new URL(BASE);
      if (parsed.host !== current.host) {
        parsed.host = current.host;
        parsed.port = current.port;
        parsed.protocol = current.protocol;
        return parsed.toString();
      }
    } catch (_) {}
  }
  return url;
};

function normalizeUser(user: User): User {
  return {
    ...user,
    avatarUrl: toAbs(user.avatarUrl) ?? user.avatarUrl,
    bannerUrl: toAbs(user.bannerUrl) ?? user.bannerUrl,
    coverImage: toAbs(user.coverImage) ?? user.coverImage,
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isOnboarded: boolean;
  isLoading: boolean;
  login: (user: User, token: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => void;
  completeOnboarding: () => void;
  setLoading: (loading: boolean) => void;
  initSecureTokens: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isOnboarded: false,
      isLoading: false,

      // Load tokens into memory on startup.
      // On web: tokens come from zustand persist (AsyncStorage) — wait for hydration instead.
      // On native: tokens are in SecureStore, not persisted by zustand.
      initSecureTokens: async () => {
        if (Platform.OS === 'web') return;
        // Wait for zustand to rehydrate from AsyncStorage first
        await new Promise<void>((resolve) => {
          if (useAuthStore.persist.hasHydrated()) { resolve(); return; }
          const unsub = useAuthStore.persist.onFinishHydration(() => { unsub(); resolve(); });
          setTimeout(resolve, 300); // safety fallback
        });
        try {
          const token = await SecureStore.getItemAsync('accessToken');
          const refreshToken = await SecureStore.getItemAsync('refreshToken');
          if (token && refreshToken) {
            // Restore tokens in memory, keep persisted isAuthenticated/user
            set({ token, refreshToken });
          } else {
            // No tokens in SecureStore — clear auth state
            set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
          }
        } catch (e) {
          console.error('Failed to load secure tokens', e);
        }
      },

      login: async (user, token, refreshToken) => {
        try {
          if (Platform.OS === 'web') {
            await AsyncStorage.setItem('accessToken', token);
            await AsyncStorage.setItem('refreshToken', refreshToken);
          } else {
            await SecureStore.setItemAsync('accessToken', token);
            await SecureStore.setItemAsync('refreshToken', refreshToken);
          }
          set({ user: normalizeUser(user), token, refreshToken, isAuthenticated: true });
        } catch (e) {
          console.error('Failed to store secure tokens', e);
        }
      },

      logout: async () => {
        try {
          if (Platform.OS === 'web') {
            await AsyncStorage.removeItem('accessToken');
            await AsyncStorage.removeItem('refreshToken');
          } else {
            await SecureStore.deleteItemAsync('accessToken');
            await SecureStore.deleteItemAsync('refreshToken');
          }
        } catch (e) {
          console.error('Failed to delete secure tokens', e);
        }
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
      },

      updateProfile: (updates) => {
        set((state) => ({
          user: state.user ? normalizeUser({ ...state.user, ...updates }) : null,
        }));
      },

      completeOnboarding: () => set({ isOnboarded: true }),
      setLoading: (isLoading) => set({ isLoading }),

    }),
    {
      name: 'community-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isOnboarded: state.isOnboarded,
        isAuthenticated: state.isAuthenticated,
        ...(Platform.OS === 'web' ? { token: state.token, refreshToken: state.refreshToken } : {}),
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.user) {
          state.user = normalizeUser(state.user);
        }
      },
    }
  )
);

// Resolves once zustand persist has finished rehydrating from AsyncStorage.
// Must be defined after useAuthStore.
export const waitForHydration = (): Promise<void> =>
  new Promise((resolve) => {
    if (useAuthStore.persist.hasHydrated()) { resolve(); return; }
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
