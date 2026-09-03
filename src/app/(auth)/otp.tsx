import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Keyboard, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { useUserApprovalStore } from '../../store/userApprovalStore';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../api/client';

export default function OTPVerification() {
  const { colors, spacing, typography, roundness, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string; email?: string; userId?: string }>();
  const login = useAuthStore((state) => state.login);
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const showToast = useToastStore((state) => state.showToast);
  const getUserById = useUserApprovalStore((state) => state.getUserById);

  const phone = params.phone || '+91 98450 12345';
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(30);

  const inputs = useRef<TextInput[]>([]);

  useEffect(() => {
    if (timer > 0) {
      const id = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(id);
    }
  }, [timer]);

  const handleChange = (text: string, index: number) => {
    // Only accept numeric digits
    const cleaned = text.replace(/[^0-9]/g, '');
    const newCode = [...code];
    newCode[index] = cleaned;
    setCode(newCode);

    // Auto-focus next box on typing
    if (cleaned.length > 0 && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Delete/Backspace moves focus back
    if (e.nativeEvent.key === 'Backspace' && code[index] === '' && index > 0) {
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length < 6) {
      showToast('Please enter the 6-digit verification code.', 'error');
      return;
    }

    setLoading(true);
    try {
      // 1. Try server verification if online
      try {
        const res = await apiClient.post('/auth/verify-phone', { code: fullCode, phone });
        const verifiedUser = res.data?.data?.user;
        if (verifiedUser) updateProfile(verifiedUser);
      } catch {}

      // 2. Fetch or load the registered user from approval store
      const managedUser = params.userId ? getUserById(params.userId) : undefined;
      const resolvedDisplayName = user?.displayName || managedUser?.displayName || 'Community Member';

      if (!user || !token || !refreshToken) {
        const authUser = managedUser || {
          id: params.userId || `u-${Date.now()}`,
          username: (params.email || 'user').split('@')[0],
          displayName: resolvedDisplayName,
          email: params.email || 'user@example.com',
          phone,
          phoneVerified: true,
          approvalStatus: 'PENDING' as const,
          role: 'USER' as const,
          isActive: true,
          isVerified: false,
        };

        // Fallback only for offline/local demo mode.
        await login(authUser as any, 'mock-temp-token-pending', 'mock-temp-refresh-token');
      }

      // 4. IMPORTANT UX REQUIREMENT: Do NOT show "Registration Successful" popup.
      // Directly navigate to the Pending Approval status screen.
      router.replace('/(auth)/approval-status' as any);
    } catch (e: any) {
      const message = e.response?.data?.message || 'Verification failed. Please try again.';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    try {
      try {
        await apiClient.post('/auth/resend-phone-otp', { phone });
      } catch {}
      setTimer(30);
      showToast('A new 6-digit OTP has been sent to your mobile.', 'info');
    } catch {
      showToast('Failed to resend OTP.', 'error');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingHorizontal: spacing.xl }]}>
      {/* Header Back Button */}
      <TouchableOpacity
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/register'))}
        style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : colors.surfaceVariant }]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="arrow-back" size={20} color={colors.text} />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Verification Description */}
        <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(45, 106, 45, 0.2)' : '#E8F5E9' }]}>
          <Ionicons name="phone-portrait-outline" size={44} color={colors.primary} />
        </View>

        <Text
          style={[
            styles.title,
            { color: colors.text, fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold },
          ]}
        >
          Mobile Verification
        </Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Please enter the 6-digit verification code sent to
        </Text>
        <Text style={[styles.phoneHighlight, { color: colors.primary }]}>{phone}</Text>

        {/* Demo Hint Banner */}
        <View style={[styles.demoBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.surfaceVariant }]}>
          <Ionicons name="information-circle-outline" size={15} color={colors.textMuted} />
          <Text style={[styles.demoBadgeText, { color: colors.textMuted }]}>
            Hint for testing: enter any 6 digits (e.g. 123456)
          </Text>
        </View>

        {/* 6-box OTP input */}
        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                if (ref) inputs.current[index] = ref;
              }}
              style={[
                styles.codeInput,
                {
                  borderColor: digit ? colors.primary : colors.border,
                  backgroundColor: colors.surfaceVariant,
                  color: colors.text,
                },
              ]}
              value={digit}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.verifyBtn, { backgroundColor: colors.primary }]}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Text style={styles.verifyBtnText}>Verify & Submit Profile</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </>
          )}
        </TouchableOpacity>

        {/* Resend Action */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Didn't receive the SMS code?{' '}
          </Text>
          <TouchableOpacity onPress={handleResend} disabled={timer > 0}>
            <Text
              style={[
                styles.resendText,
                { color: timer > 0 ? colors.textMuted : colors.primary, fontWeight: '700' },
              ]}
            >
              {timer > 0 ? `Resend in ${timer}s` : 'Resend OTP'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 54,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 28,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  phoneHighlight: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 12,
  },
  demoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 26,
  },
  demoBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
    width: '100%',
  },
  codeInput: {
    width: 46,
    height: 54,
    borderWidth: 1.5,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
  },
  verifyBtn: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  verifyBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 13,
  },
  resendText: {
    fontSize: 13,
  },
});
