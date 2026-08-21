import React, { useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore, ToastType } from '../../store/toastStore';
import { useTheme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

export const Toast: React.FC = () => {
  const { toast, hideToast } = useToastStore();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const translateY = useSharedValue(-200);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (toast.visible) {
      const topOffset = insets.top > 0 ? insets.top + 8 : (Platform.OS === 'ios' ? 44 : 16);
      translateY.value = withSpring(topOffset, {
        damping: 18,
        stiffness: 140,
        mass: 0.8,
      });
      opacity.value = withTiming(1, { duration: 200 });

      const timer = setTimeout(() => {
        hideToast();
      }, toast.duration || 3200);

      return () => clearTimeout(timer);
    } else {
      translateY.value = withTiming(-200, { duration: 250 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [toast.visible, toast.duration, insets.top]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  if (!toast.message && !toast.visible) return null;

  const getTypeConfig = (type: ToastType) => {
    switch (type) {
      case 'error':
        return {
          icon: 'alert-circle' as const,
          iconColor: '#DC2626',
          iconBg: isDark ? 'rgba(220, 38, 38, 0.18)' : '#FEE2E2',
          borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5',
          accentColor: '#DC2626',
        };
      case 'warning':
        return {
          icon: 'warning' as const,
          iconColor: '#D97706',
          iconBg: isDark ? 'rgba(217, 119, 6, 0.18)' : '#FEF3C7',
          borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FCD34D',
          accentColor: '#D97706',
        };
      case 'success':
        return {
          icon: 'checkmark-circle' as const,
          iconColor: '#16A34A',
          iconBg: isDark ? 'rgba(22, 163, 74, 0.18)' : '#DCFCE7',
          borderColor: isDark ? 'rgba(34, 197, 94, 0.3)' : '#86EFAC',
          accentColor: '#16A34A',
        };
      case 'info':
      default:
        return {
          icon: 'information-circle' as const,
          iconColor: colors.primary,
          iconBg: isDark ? 'rgba(45, 106, 45, 0.25)' : (colors.primaryContainer || '#E8F5E9'),
          borderColor: isDark ? 'rgba(76, 175, 80, 0.3)' : (colors.primaryContainer || '#C8E6C9'),
          accentColor: colors.primary,
        };
    }
  };

  const config = getTypeConfig(toast.type);

  return (
    <Animated.View
      pointerEvents={toast.visible ? 'box-none' : 'none'}
      style={[styles.wrapper, animatedStyle]}
    >
      <Pressable
        onPress={hideToast}
        style={[
          styles.container,
          {
            backgroundColor: colors.cardBg,
            borderColor: config.borderColor,
            borderLeftColor: config.accentColor,
            borderLeftWidth: 4,
          },
        ]}
      >
        <View style={[styles.iconBox, { backgroundColor: config.iconBg }]}>
          <Ionicons name={config.icon} size={18} color={config.iconColor} />
        </View>

        <View style={styles.textContainer}>
          <Text
            numberOfLines={3}
            style={[
              styles.messageText,
              {
                color: colors.text,
              },
            ]}
          >
            {toast.message}
          </Text>
        </View>

        <TouchableOpacity
          onPress={hideToast}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.closeBtn}
          accessibilityLabel="Dismiss notification"
        >
          <Ionicons name="close" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99999,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 540,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
      default: {
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12)',
      },
    }),
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  textContainer: {
    flex: 1,
    paddingRight: 6,
  },
  messageText: {
    fontSize: 13.5,
    fontWeight: '600',
    lineHeight: 18,
  },
  closeBtn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});

export default Toast;
