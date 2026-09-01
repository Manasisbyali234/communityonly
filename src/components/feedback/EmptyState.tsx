import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import Button from '../common/Button';

interface EmptyStateProps {
  title: string;
  description: string;
  iconName?: keyof typeof Ionicons.name | string;
  actionTitle?: string;
  onActionPress?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  iconName = 'document-text-outline',
  actionTitle,
  onActionPress,
  style,
}) => {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconContainer, { backgroundColor: colors.surfaceSecondary }]}>
        <Ionicons name={iconName as any} size={40} color={colors.primary} />
      </View>
      
      <Text
        style={[
          styles.title,
          {
            color: colors.text,
            fontSize: typography.sizes.lg,
            fontWeight: typography.weights.bold,
            marginBottom: spacing.xs,
          },
        ]}
      >
        {title}
      </Text>
      
      <Text
        style={[
          styles.description,
          {
            color: colors.textSecondary,
            fontSize: typography.sizes.sm,
            marginBottom: spacing.lg,
          },
        ]}
      >
        {description}
      </Text>

      {actionTitle && onActionPress && (
        <Button title={actionTitle} onPress={onActionPress} size="sm" />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    minHeight: 280,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 18,
  },
});
export default EmptyState;
