import { useThemeStore } from '../store/themeStore';
import { lightTheme, darkTheme, palette } from './colors';
import { spacing, roundness, typography, shadows } from './spacing';

export type AppTheme = {
  isDark: boolean;
  colors: typeof lightTheme.colors;
  spacing: typeof spacing;
  roundness: typeof roundness;
  typography: typeof typography;
  shadows: typeof shadows;
  palette: typeof palette;
};

export function useTheme(): AppTheme {
  const themeMode = useThemeStore((state) => state.themeMode);
  const isDark = themeMode === 'dark';
  const activeTheme = isDark ? darkTheme : lightTheme;

  return {
    isDark,
    colors: activeTheme.colors,
    spacing,
    roundness,
    typography,
    shadows,
    palette,
  };
}

export * from './colors';
export * from './spacing';
export { useThemeStore } from '../store/themeStore';
export type { ThemeMode } from '../store/themeStore';
