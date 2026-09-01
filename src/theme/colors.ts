// ── Material Design 3 – Gowda Community Color System ─────────────────────────
// Earthy palette inspired by Karnataka's landscape: saffron fields, forest
// greens, temple gold, and warm terracotta soil.

export const palette = {
  // ── Brand Core ──────────────────────────────────────────────────────────────
  // Primary: Deep Forest Green (community, growth, village)
  primary: '#2D6A2D',
  primaryLight: '#4CAF50',
  primaryDark: '#1B5E20',
  onPrimary: '#FFFFFF',
  primaryContainer: '#C8E6C9',
  onPrimaryContainer: '#003909',
  
  // Gradients
  gradientStart: '#2D6A2D',
  gradientMiddle: '#4CAF50',
  gradientEnd: '#81C784',

  // Secondary: Warm Saffron (culture, heritage, auspiciousness)
  secondary: '#E65100',
  secondaryLight: '#FF6D00',
  secondaryDark: '#BF360C',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#FFCCBC',
  onSecondaryContainer: '#3E0A00',

  // Tertiary: Temple Gold (recognition, achievements)
  tertiary: '#F9A825',
  tertiaryLight: '#FFD54F',
  tertiaryDark: '#F57F17',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#FFF9C4',
  onTertiaryContainer: '#2B1600',

  // ── Semantic ────────────────────────────────────────────────────────────────
  success: '#2E7D32',
  warning: '#F57C00',
  error: '#B71C1C',
  errorContainer: '#FFCDD2',
  onError: '#FFFFFF',
  info: '#1565C0',

  // ── Community Heritage ──────────────────────────────────────────────────────
  heritage: '#5D4037',       // Earthy brown - soil/roots
  saffron: '#FF6F00',        // Saffron/turmeric
  forestGreen: '#1B5E20',    // Deep Karnataka forest
  templeGold: '#F9A825',     // Temple gopuram gold
  creamWhite: '#FFF8E1',     // Warm cream background
  terracotta: '#BF360C',     // Terracotta/red soil

  // ── Neutrals ────────────────────────────────────────────────────────────────
  white: '#FFFFFF',
  black: '#000000',
  neutral10: '#1C1B1F',
  neutral20: '#313033',
  neutral30: '#484649',
  neutral40: '#605D62',
  neutral50: '#787579',
  neutral60: '#939094',
  neutral70: '#AEAAAE',
  neutral80: '#CAC4D0',
  neutral90: '#E6E1E5',
  neutral95: '#F4EFF4',
  neutral99: '#FFFBFE',

  // ── Neutral Variant ─────────────────────────────────────────────────────────
  neutralVariant10: '#1D1A22',
  neutralVariant20: '#322F37',
  neutralVariant30: '#49454F',
  neutralVariant40: '#605D66',
  neutralVariant50: '#79747E',
  neutralVariant60: '#938F99',
  neutralVariant70: '#AEA9B4',
  neutralVariant80: '#CAC4D0',
  neutralVariant90: '#E7E0EC',
  neutralVariant95: '#F5EEFA',
};

// ── Light Theme (Warm Cream + Forest Green) ──────────────────────────────────
export const lightTheme = {
  dark: false,
  colors: {
    // Surface hierarchy (M3)
    background: '#FFFFFF',        // Pure white background for all screens
    surface: '#FFFFFF',
    surfaceVariant: '#F4F7F4',    // Soft clean light surface
    surfaceSecondary: '#FAFAFA',
    surfaceContainer: '#F3F4F6',
    surfaceContainerLow: '#FFFFFF',
    surfaceContainerHigh: '#E8F5E9',

    // Text
    text: '#111827',              // Neutral dark (slate-900)
    textSecondary: '#4B5563',     // Neutral grey (slate-600)
    textMuted: '#6B7280',         // Neutral muted grey (slate-500)
    onSurface: '#111827',
    onSurfaceVariant: '#4B5563',

    // Borders / Outlines (M3)
    border: '#E5E7EB',            // Clean neutral grey border
    borderSecondary: '#F3F4F6',   // Soft light grey divider
    outline: '#9CA3AF',
    outlineVariant: '#E5E7EB',

    // Brand
    primary: palette.primary,
    primaryLight: palette.primaryLight,
    primaryDark: palette.primaryDark,
    onPrimary: palette.onPrimary,
    primaryContainer: palette.primaryContainer,
    onPrimaryContainer: palette.onPrimaryContainer,

    secondary: palette.secondary,
    onSecondary: palette.onSecondary,
    secondaryContainer: palette.secondaryContainer,
    onSecondaryContainer: palette.onSecondaryContainer,

    tertiary: palette.tertiary,
    onTertiary: palette.onTertiary,
    tertiaryContainer: palette.tertiaryContainer,
    onTertiaryContainer: palette.onTertiaryContainer,

    // Semantic
    success: palette.success,
    warning: palette.warning,
    error: palette.error,
    errorContainer: palette.errorContainer,
    onError: palette.onError,
    info: palette.info,

    // Community Heritage
    heritage: palette.heritage,
    saffron: palette.saffron,
    forestGreen: palette.forestGreen,
    templeGold: palette.templeGold,

    // Components
    cardBg: '#FFFFFF',
    inputBg: '#EDF4EC',
    tabBarBg: '#FFFFFF',
    shadow: '#1A2D1A',

    // Backward-compat aliases
    danger: palette.error,
    accent: palette.tertiary,

    // M3 Elevation surfaces (simulate tonal elevation with green tint)
    elevation1: '#F0F7EE',
    elevation2: '#E8F2E5',
    elevation3: '#E1EDDD',
    elevation4: '#DAE8D6',
    elevation5: '#D3E3CE',
  },
};

// ── Dark Theme (Deep Forest Night) ──────────────────────────────────────────
export const darkTheme = {
  dark: true,
  colors: {
    // Surface hierarchy (M3 dark)
    background: '#0D1B0D',         // Very deep forest night
    surface: '#141F14',
    surfaceVariant: '#1E2D1E',
    surfaceSecondary: '#1A261A',
    surfaceContainer: '#1E2D1E',
    surfaceContainerLow: '#141F14',
    surfaceContainerHigh: '#253525',

    // Text
    text: '#E8F5E9',               // Soft warm white
    textSecondary: '#A5C8A0',
    textMuted: '#6B9668',
    onSurface: '#E6E1E5',
    onSurfaceVariant: '#CAC4D0',

    // Borders
    border: '#2D4A2D',
    borderSecondary: '#1F361F',
    outline: '#938F99',
    outlineVariant: '#49454F',

    // Brand (lighter variants for dark bg)
    primary: '#81C784',
    primaryLight: '#A5D6A7',
    primaryDark: '#4CAF50',
    onPrimary: '#003909',
    primaryContainer: '#1B5E20',
    onPrimaryContainer: '#C8E6C9',

    secondary: '#FF8A65',
    onSecondary: '#3E0A00',
    secondaryContainer: '#BF360C',
    onSecondaryContainer: '#FFCCBC',

    tertiary: '#FFD54F',
    onTertiary: '#2B1600',
    tertiaryContainer: '#F57F17',
    onTertiaryContainer: '#FFF9C4',

    // Semantic
    success: '#66BB6A',
    warning: '#FFB74D',
    error: '#EF9A9A',
    errorContainer: '#7F1D1D',
    onError: '#000000',
    info: '#64B5F6',

    // Community Heritage
    heritage: '#A1887F',
    saffron: '#FFB300',
    forestGreen: '#4CAF50',
    templeGold: '#FFD54F',

    // Components
    cardBg: '#141F14',
    inputBg: '#1E2D1E',
    tabBarBg: '#0D1B0D',
    shadow: '#000000',

    // Backward-compat aliases
    danger: '#EF9A9A',
    accent: '#FFD54F',

    // Elevation
    elevation1: '#182918',
    elevation2: '#1C2E1C',
    elevation3: '#203320',
    elevation4: '#243824',
    elevation5: '#283D28',
  },
};

export type ThemeType = typeof lightTheme;
export type ColorsType = typeof lightTheme.colors;
