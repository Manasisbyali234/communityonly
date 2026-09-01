import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, Platform, Pressable } from 'react-native';
import { useConfirmStore } from '../../store/confirmStore';
import { useTheme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

export const ConfirmationModal: React.FC = () => {
  const { visible, options, handleConfirm, handleCancel } = useConfirmStore();
  const { colors, isDark } = useTheme();

  if (!visible) return null;

  const isDestructive = options.isDestructive ?? false;
  const defaultIcon = isDestructive ? 'trash-outline' : 'help-circle-outline';
  const iconName = (options.icon || defaultIcon) as any;

  const accentColor = isDestructive ? '#DC2626' : colors.primary;
  const iconBg = isDestructive
    ? (isDark ? 'rgba(220, 38, 38, 0.2)' : '#FEE2E2')
    : (isDark ? 'rgba(45, 106, 45, 0.25)' : (colors.primaryContainer || '#E8F5E9'));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleCancel} />

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.cardBg,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Top Icon Badge */}
          <View style={[styles.iconBadge, { backgroundColor: iconBg }]}>
            <Ionicons name={iconName} size={26} color={accentColor} />
          </View>

          {/* Title & Description */}
          <Text style={[styles.title, { color: colors.text }]}>{options.title}</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {options.message}
          </Text>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.cancelButton,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.surfaceSecondary || '#F3F4F6',
                  borderColor: colors.border,
                },
              ]}
              onPress={handleCancel}
              activeOpacity={0.7}
              accessibilityLabel={options.cancelText || 'Cancel'}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                {options.cancelText || 'Cancel'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                {
                  backgroundColor: isDestructive ? '#DC2626' : colors.primary,
                },
              ]}
              onPress={handleConfirm}
              activeOpacity={0.8}
              accessibilityLabel={options.confirmText || 'Confirm'}
            >
              <Text style={styles.confirmButtonText}>
                {options.confirmText || 'Confirm'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 99998,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
      default: {
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  button: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  cancelButton: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  cancelButtonText: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  confirmButton: {},
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
});

export default ConfirmationModal;
