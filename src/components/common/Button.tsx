import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
  StyleProp,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

export interface ButtonProps {
  title?: string;
  children?: React.ReactNode;
  onPress?: (event?: any) => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'destructive-subtle' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: string;
  iconComponent?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  iconSize?: number;
  iconColor?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  activeOpacity?: number;
  accessibilityLabel?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  iconComponent,
  iconPosition = 'left',
  iconSize,
  iconColor,
  style,
  textStyle,
  activeOpacity = 0.8,
  accessibilityLabel,
}) => {
  const { colors, isDark } = useTheme();

  const handlePress = (e: any) => {
    if (!loading && !disabled && onPress) {
      onPress(e);
    }
  };

  // Base sizing tokens
  const sizeConfig = {
    sm: {
      height: 36,
      paddingHorizontal: 14,
      borderRadius: 14,
      fontSize: 12.5,
      iconSize: 15,
      gap: 5,
    },
    md: {
      height: 42,
      paddingHorizontal: 18,
      borderRadius: 14,
      fontSize: 14,
      iconSize: 18,
      gap: 6,
    },
    lg: {
      height: 50,
      paddingHorizontal: 22,
      borderRadius: 16,
      fontSize: 15.5,
      iconSize: 20,
      gap: 8,
    },
  }[size];

  // Dynamic colors by variant
  let bgColor = colors.primary;
  let textColor = '#FFFFFF';
  let borderColor = 'transparent';
  let borderWidth = 0;

  switch (variant) {
    case 'primary':
      bgColor = colors.primary;
      textColor = '#FFFFFF';
      break;

    case 'secondary':
      bgColor = isDark ? 'rgba(45, 106, 45, 0.22)' : '#EDF4EC';
      textColor = isDark ? colors.primaryLight : colors.primary;
      break;

    case 'outline':
      bgColor = 'transparent';
      textColor = isDark ? colors.primaryLight : colors.primary;
      borderColor = isDark ? colors.primaryLight + '50' : colors.primary + '50';
      borderWidth = 1.2;
      break;

    case 'ghost':
      bgColor = 'transparent';
      textColor = isDark ? colors.primaryLight : colors.primary;
      break;

    case 'destructive':
      bgColor = '#DC2626';
      textColor = '#FFFFFF';
      break;

    case 'destructive-subtle':
      bgColor = isDark ? 'rgba(220, 38, 38, 0.2)' : '#FEE2E2';
      textColor = '#DC2626';
      break;

    default:
      bgColor = colors.primary;
      textColor = '#FFFFFF';
      break;
  }

  const computedIconColor = iconColor || textColor;
  const computedIconSize = iconSize || sizeConfig.iconSize;

  const renderIcon = () => {
    if (iconComponent) return iconComponent;
    if (icon) {
      return (
        <Ionicons
          name={icon as any}
          size={computedIconSize}
          color={computedIconColor}
        />
      );
    }
    return null;
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={activeOpacity}
      accessibilityLabel={accessibilityLabel || title}
      style={[
        styles.baseButton,
        {
          height: sizeConfig.height,
          paddingHorizontal: sizeConfig.paddingHorizontal,
          borderRadius: sizeConfig.borderRadius,
          backgroundColor: bgColor,
          borderColor,
          borderWidth,
          gap: sizeConfig.gap,
          width: fullWidth ? '100%' : undefined,
          opacity: disabled ? 0.45 : 1,
        },
        variant === 'primary' && !disabled && styles.primaryShadow,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'destructive' ? '#FFFFFF' : colors.primary}
        />
      ) : (
        <>
          {iconPosition === 'left' && renderIcon()}
          {children ? (
            children
          ) : title ? (
            <Text
              numberOfLines={1}
              style={[
                styles.baseText,
                {
                  fontSize: sizeConfig.fontSize,
                  color: textColor,
                },
                textStyle,
              ]}
            >
              {title}
            </Text>
          ) : null}
          {iconPosition === 'right' && renderIcon()}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseText: {
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  primaryShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#2D6A2D',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 5,
      },
      android: {
        elevation: 2,
      },
    }),
  },
});

export default Button;
