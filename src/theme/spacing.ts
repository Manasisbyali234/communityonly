// ── Material Design 3 – Spacing & Shape Tokens ────────────────────────────────
import { Platform } from 'react-native';

// M3 Spacing scale (4dp base unit)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  // M3 extended
  2: 2,
  4: 4,
  6: 6,
  8: 8,
  10: 10,
  12: 12,
  14: 14,
  16: 16,
  20: 20,
  24: 24,
  28: 28,
  32: 32,
  40: 40,
  48: 48,
  56: 56,
  64: 64,
};

// M3 Shape (corner radius) tokens
export const roundness = {
  none: 0,
  xs: 4,      // Extra small
  sm: 8,      // Small
  md: 12,     // Medium
  lg: 16,     // Large
  xl: 24,     // Extra large
  xxl: 28,    // Extra large (top)
  full: 9999, // Full (pill)
};

// M3 Typography scale
export const typography = {
  // Display
  displayLarge:   { fontSize: 57, lineHeight: 64, fontWeight: '400' as const, letterSpacing: -0.25 },
  displayMedium:  { fontSize: 45, lineHeight: 52, fontWeight: '400' as const, letterSpacing: 0 },
  displaySmall:   { fontSize: 36, lineHeight: 44, fontWeight: '400' as const, letterSpacing: 0 },

  // Headline
  headlineLarge:  { fontSize: 32, lineHeight: 40, fontWeight: '700' as const, letterSpacing: 0 },
  headlineMedium: { fontSize: 28, lineHeight: 36, fontWeight: '700' as const, letterSpacing: 0 },
  headlineSmall:  { fontSize: 24, lineHeight: 32, fontWeight: '700' as const, letterSpacing: 0 },

  // Title
  titleLarge:   { fontSize: 22, lineHeight: 28, fontWeight: '600' as const, letterSpacing: 0 },
  titleMedium:  { fontSize: 16, lineHeight: 24, fontWeight: '600' as const, letterSpacing: 0.15 },
  titleSmall:   { fontSize: 14, lineHeight: 20, fontWeight: '600' as const, letterSpacing: 0.1 },

  // Label
  labelLarge:   { fontSize: 14, lineHeight: 20, fontWeight: '700' as const, letterSpacing: 0.1 },
  labelMedium:  { fontSize: 12, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0.5 },
  labelSmall:   { fontSize: 11, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0.5 },

  // Body
  bodyLarge:    { fontSize: 16, lineHeight: 24, fontWeight: '400' as const, letterSpacing: 0.15 },
  bodyMedium:   { fontSize: 14, lineHeight: 20, fontWeight: '400' as const, letterSpacing: 0.25 },
  bodySmall:    { fontSize: 12, lineHeight: 16, fontWeight: '400' as const, letterSpacing: 0.4 },

  // Legacy (for backward compatibility)
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  weights: {
    thin: '100' as const,
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    black: '900' as const,
  },
};

// M3 Elevation shadows (with warm tint for light, dark for dark)
export const shadows = {
  // Level 0 – no shadow
  none: Platform.select({
    web: {
      boxShadow: 'none',
    },
    default: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    }
  }),
  // Level 1 – Cards, sheets
  sm: Platform.select({
    web: {
      boxShadow: '0px 1px 3px rgba(26, 45, 26, 0.08)',
    },
    default: {
      shadowColor: '#1A2D1A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 1,
    }
  }),
  // Level 2 – Menus, dropdowns
  md: Platform.select({
    web: {
      boxShadow: '0px 2px 8px rgba(26, 45, 26, 0.12)',
    },
    default: {
      shadowColor: '#1A2D1A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 3,
    }
  }),
  // Level 3 – FABs, modals
  lg: Platform.select({
    web: {
      boxShadow: '0px 4px 12px rgba(26, 45, 26, 0.16)',
    },
    default: {
      shadowColor: '#1A2D1A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.16,
      shadowRadius: 12,
      elevation: 6,
    }
  }),
  // Level 4 – Navigation drawers
  xl: Platform.select({
    web: {
      boxShadow: '0px 6px 16px rgba(26, 45, 26, 0.20)',
    },
    default: {
      shadowColor: '#1A2D1A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.20,
      shadowRadius: 16,
      elevation: 8,
    }
  }),
  // Level 5 – Dialogs
  xxl: Platform.select({
    web: {
      boxShadow: '0px 8px 20px rgba(26, 45, 26, 0.24)',
    },
    default: {
      shadowColor: '#1A2D1A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.24,
      shadowRadius: 20,
      elevation: 12,
    }
  }),
};
