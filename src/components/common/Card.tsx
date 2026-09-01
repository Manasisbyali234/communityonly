import React from 'react';
import { StyleSheet, View, ViewStyle, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, style, onPress }) => {
  const { colors, roundness, shadows, isDark } = useTheme();

  const cardStyle: ViewStyle = {
    backgroundColor: colors.cardBg,
    borderRadius: roundness.lg,
    borderWidth: isDark ? 1 : 0,
    borderColor: colors.border,
    padding: 16,
    ...(!isDark ? shadows.sm : {}),
  };

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={[cardStyle, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[cardStyle, style]}>{children}</View>;
};
export default Card;
