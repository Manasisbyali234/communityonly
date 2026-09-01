import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark';

interface ThemeState {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  getIsDark: () => boolean;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      themeMode: 'light',
      setThemeMode: (mode) => set({ themeMode: mode }),
      getIsDark: () => {
        const { themeMode } = get();
        return themeMode === 'dark';
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
