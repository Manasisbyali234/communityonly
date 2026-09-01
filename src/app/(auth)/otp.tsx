import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Keyboard } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import Button from '../../components/common/Button';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../api/client';

export default function OTPVerification() {
  const { colors, spacing, typography, roundness } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const login = useAuthStore((state) => state.login);
  const showToast = useToastStore((state) => state.showToast);

  const email = params.email || 'your email';
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);

  const inputs = useRef<TextInput[]>([]);

  const handleChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    // Auto-focus next box on typing
    if (text.length > 0 && index < 5) {
      inputs.current[index + 1].focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Delete/Backspace moves focus back
    if (e.nativeEvent.key === 'Backspace' && code[index] === '' && index > 0) {
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
      inputs.current[index - 1].focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length < 6) {
      showToast('Please enter the full 6-digit code.', 'error');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/verify-email', { code: fullCode });
      
      const user = useAuthStore.getState().user;
      if (user) {
        useAuthStore.getState().updateProfile({ isVerified: true });
      }
      
      router.replace('/(tabs)');
    } catch (e: any) {
      const message = e.response?.data?.message || 'Invalid code. Please try again.';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await apiClient.post('/auth/resend-verification');
      showToast('Verification code resent to your email.', 'info');
    } catch (e) {
      showToast('Failed to resend code.', 'error');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingHorizontal: spacing.xl }]}>
      {/* Header Back Button */}
      <TouchableOpacity
        onPress={() => router.canGoBack() ? router.back() : router.replace('/(auth)/login')}
        style={[styles.backBtn, { backgroundColor: colors.surface }]}
      >
        <Ionicons name="arrow-back" size={20} color={colors.text} />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Verification Description */}
        <View style={styles.iconContainer}>
          <Ionicons name="shield-checkmark" size={48} color={colors.primary} />
        </View>

        <Text
          style={[
            styles.title,
            { color: colors.text, fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold },
          ]}
        >
          Verify Your Email
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
          We have sent a 6-digit verification code to {'\n'}
          <Text style={{ fontWeight: 'bold', color: colors.text }}>{email}</Text>
        </Text>

        {/* 6 Digit Box Inputs Grid */}
        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputs.current[index] = ref as any)}
              style={[
                styles.codeBox,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: code[index] ? colors.primary : colors.border,
                  color: colors.text,
                  fontSize: typography.sizes.xl,
                  borderRadius: roundness.md,
                },
              ]}
              maxLength={1}
              keyboardType="number-pad"
              value={digit}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              autoFocus={index === 0}
            />
          ))}
        </View>

        {/* Resend Link */}
        <View style={styles.resendContainer}>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>
            Didn't receive the code?{' '}
          </Text>
          <TouchableOpacity onPress={handleResend}>
            <Text
              style={{
                color: colors.primary,
                fontSize: typography.sizes.sm,
                fontWeight: typography.weights.bold,
              }}
            >
              Resend Code
            </Text>
          </TouchableOpacity>
        </View>

        {/* Verify Action Button */}
        <Button
          title="Verify & Continue"
          onPress={handleVerify}
          loading={loading}
          variant="gradient"
          style={styles.verifyBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  backBtn: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 40,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    marginBottom: 30,
  },
  codeBox: {
    width: 44,
    height: 52,
    borderWidth: 1.5,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  verifyBtn: {
    width: '100%',
    height: 52,
  },
});
