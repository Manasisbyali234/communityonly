import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  height?: number;
  title?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  children,
  height,
  title,
}) => {
  const { colors, spacing, roundness, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const sheetHeight = Math.max(0, Math.min(height ?? windowHeight * 0.7, windowHeight - insets.top - 16));

  const handleClose = () => {
    onClose();
  };

  if (!visible) return null;

  const SheetInner = (
    <View style={styles.container}>
      <View
        style={[styles.backdrop, { backgroundColor: '#000000', opacity: 0.5 }]}
        pointerEvents="none"
      />
      <Pressable style={styles.backdropPressable} onPress={handleClose} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.cardBg,
              height: sheetHeight,
              borderTopLeftRadius: roundness.xl,
              borderTopRightRadius: roundness.xl,
              paddingBottom: insets.bottom + spacing.sm,
            },
          ]}
        >
          <View style={styles.grabberContainer}>
            <View style={[styles.grabber, { backgroundColor: colors.border }]} />
          </View>

          <View style={[styles.header, { borderBottomColor: colors.borderSecondary }]}>
            {title ? (
              <Text
                style={[
                  styles.title,
                  {
                    color: colors.text,
                    fontSize: typography.sizes.lg,
                    fontWeight: typography.weights.bold,
                  },
                ]}
              >
                {title}
              </Text>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            <Pressable
              onPress={handleClose}
              style={[styles.closeBtn, { backgroundColor: colors.inputBg }]}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.body}>{children}</View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );

  // Use plain View overlay on web + Android — Modal causes crashes on both:
  // - web: react-native-web portal removeChild crash during navigation
  // - Android: RN 0.86 + reanimated 4.x Modal touch interception bug
  // Only use Modal on iOS where it works correctly.
  if (Platform.OS !== 'web') {
    return (
      <Modal
        transparent
        visible={visible}
        animationType="none"
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        {SheetInner}
      </Modal>
    );
  }

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 999 }]}>
      {SheetInner}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropPressable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  keyboardView: {
    width: '100%',
  },
  sheet: {
    width: '100%',
    overflow: 'hidden',
  },
  grabberContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 10,
  },
  grabber: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  title: {
    flex: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
});

export default BottomSheet;
