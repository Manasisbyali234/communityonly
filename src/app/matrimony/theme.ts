import { useTheme } from '../../theme';

/**
 * Matrimony is intentionally styled as a distinct, rose-toned experience.
 * Keeping this override local prevents a feature-specific visual treatment
 * from changing the rest of the community app's brand palette.
 */
const lightMatrimonyColors = {
  background: '#FFF9FC',
  surface: '#FFFFFF',
  surfaceVariant: '#FFF1F6',
  surfaceSecondary: '#FFF7FA',
  surfaceContainer: '#FDF2F8',
  surfaceContainerLow: '#FFFFFF',
  surfaceContainerHigh: '#FCE7F3',
  border: '#F3D4E2',
  borderSecondary: '#FCE7F3',
  outline: '#B9809B',
  outlineVariant: '#F3D4E2',
  primary: '#BE185D',
  primaryLight: '#DB2777',
  primaryDark: '#9D174D',
  onPrimary: '#FFFFFF',
  primaryContainer: '#FCE7F3',
  onPrimaryContainer: '#831843',
  secondary: '#A11C54',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#FCE7F3',
  onSecondaryContainer: '#831843',
  // Matrimony-specific confirmations remain in the rose family rather than
  // inheriting the community-wide green success treatment.
  success: '#A11C54',
  cardBg: '#FFFFFF',
  inputBg: '#FFF5F8',
  tabBarBg: '#FFFFFF',
  shadow: '#4A0B25',
  elevation1: '#FFF5F8',
  elevation2: '#FDEAF3',
  elevation3: '#FBE1ED',
  elevation4: '#F9D7E7',
  elevation5: '#F7CDDF',
};

const darkMatrimonyColors = {
  background: '#1A0D14',
  surface: '#231019',
  surfaceVariant: '#321522',
  surfaceSecondary: '#2A121D',
  surfaceContainer: '#321522',
  surfaceContainerLow: '#231019',
  surfaceContainerHigh: '#3D1A2A',
  text: '#FFEAF3',
  textSecondary: '#E8B6CC',
  textMuted: '#BE7C9D',
  onSurface: '#FFEAF3',
  onSurfaceVariant: '#E8B6CC',
  border: '#54263B',
  borderSecondary: '#3D1A2A',
  outline: '#C88AA9',
  outlineVariant: '#54263B',
  primary: '#BE185D',
  primaryLight: '#F472B6',
  primaryDark: '#9D174D',
  onPrimary: '#FFFFFF',
  primaryContainer: '#5B1636',
  onPrimaryContainer: '#FFD8E8',
  secondary: '#F9A8D4',
  onSecondary: '#50052D',
  secondaryContainer: '#6E1E43',
  onSecondaryContainer: '#FFD8E8',
  success: '#BE185D',
  cardBg: '#231019',
  inputBg: '#321522',
  tabBarBg: '#1A0D14',
  shadow: '#000000',
  elevation1: '#28111C',
  elevation2: '#2D1320',
  elevation3: '#321522',
  elevation4: '#381725',
  elevation5: '#3D1A2A',
};

export function useMatrimonyTheme() {
  const theme = useTheme();
  const matrimonyColors = theme.isDark ? darkMatrimonyColors : lightMatrimonyColors;

  return {
    ...theme,
    colors: { ...theme.colors, ...matrimonyColors },
  };
}
