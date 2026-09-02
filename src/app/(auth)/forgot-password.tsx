import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useToastStore } from '../../store/toastStore';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { apiClient } from '../../api/client';

const forgotSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

export default function ForgotPassword() {
  const { colors, spacing, typography, palette, roundness, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const showToast = useToastStore((state) => state.showToast);

  const [isSent, setIsSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotFormValues) => {
    try {
      await apiClient.post('/auth/forgot-password', { email: data.email });
      setSubmittedEmail(data.email);
      setIsSent(true);
      showToast('Reset instructions sent to your email.', 'success');
      startCooldown();
    } catch (e: any) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message ?? '';
      if (status === 404 || msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('not registered')) {
        showToast('Email is not registered.', 'error');
      } else {
        showToast('Something went wrong. Try again.', 'error');
      }
    }
  };

  const startCooldown = () => {
    setResendCooldown(30);
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !submittedEmail) return;
    try {
      await apiClient.post('/auth/forgot-password', { email: submittedEmail });
      showToast('Reset instructions resent.', 'success');
      startCooldown();
    } catch {
      showToast('Failed to resend. Please try again later.', 'error');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.keyboardView, { backgroundColor: colors.background }]}
    >
      {/* ── Top Header Navigation ─────────────────────────────────── */}
      <View style={[styles.topNav, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/login'))}
          style={[
            styles.backBtn,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.12)' : colors.border,
            },
          ]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.topLogoWrap}>
          <View
            style={[
              styles.topMiniLogo,
              {
                backgroundColor: '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.15)' : colors.border,
              },
            ]}
          >
            <Image
              source={require('../../../assets/images/logo.png')}
              style={styles.topMiniLogoImg}
              contentFit="contain"
            />
          </View>
          <Text style={[styles.topBrandText, { color: colors.text }]}>Gowda Sangama</Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.xl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!isSent ? (
          <>
            {/* Hero Graphic / Icon */}
            <View style={styles.heroSection}>
              <View
                style={[
                  styles.outerRing,
                  {
                    backgroundColor: isDark ? 'rgba(46, 125, 50, 0.16)' : '#E8F5E9',
                    borderColor: isDark ? 'rgba(74, 222, 128, 0.25)' : '#C8E6C9',
                  },
                ]}
              >
                <LinearGradient
                  colors={[palette.gradientStart, palette.gradientMiddle, palette.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.innerCircle}
                >
                  <Ionicons name="key" size={22} color="#FFFFFF" />
                </LinearGradient>
                <View
                  style={[
                    styles.shieldBadge,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <Ionicons name="shield-checkmark" size={11} color="#16A34A" />
                </View>
              </View>

              <Text
                style={[
                  styles.title,
                  { color: colors.text, fontSize: 20, fontWeight: '700' },
                ]}
              >
                Forgot Password?
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  { color: colors.textSecondary, fontSize: 12.5 },
                ]}
              >
                Enter your registered email address to receive password reset instructions.
              </Text>
            </View>

            {/* Form Input Card */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
                  borderRadius: roundness.lg,
                },
              ]}
            >
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Registered Email Address"
                    placeholder="you@example.com"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    leftIcon="mail-outline"
                    error={errors.email?.message}
                  />
                )}
              />

              <View
                style={[
                  styles.securityPill,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
                  },
                ]}
              >
                <Ionicons name="lock-closed-outline" size={15} color={colors.primary} />
                <Text style={[styles.securityText, { color: colors.textMuted }]}>
                  A secure one-time reset link will be sent to this email.
                </Text>
              </View>

              <Button
                title="Send Reset Link"
                onPress={handleSubmit(onSubmit)}
                loading={isSubmitting}
                variant="gradient"
                style={styles.submitBtn}
              />
            </View>
          </>
        ) : (
          /* Success Confirmation View */
          <View
            style={[
              styles.card,
              styles.successCard,
              {
                backgroundColor: colors.surface,
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
                borderRadius: roundness.lg,
              },
            ]}
          >
            <View
              style={[
                styles.outerRing,
                {
                  backgroundColor: isDark ? 'rgba(46, 125, 50, 0.16)' : '#E8F5E9',
                  borderColor: '#A5D6A7',
                },
              ]}
            >
              <LinearGradient
                colors={['#16A34A', '#2E7D32']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.innerCircle}
              >
                <Ionicons name="mail-open" size={22} color="#FFFFFF" />
              </LinearGradient>
            </View>

            <Text style={[styles.title, { color: colors.text, fontSize: 20, fontWeight: '700' }]}>
              Check Your Email
            </Text>

            <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: 12.5 }]}>
              We have sent password reset instructions to:
            </Text>

            <View
              style={[
                styles.emailBadge,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="mail" size={15} color={colors.primary} />
              <Text style={[styles.emailBadgeText, { color: colors.text }]}>{submittedEmail}</Text>
            </View>

            <Text style={[styles.instructionText, { color: colors.textMuted }]}>
              Please check your inbox and spam folder. Click the link in the email to set a new password.
            </Text>

            <Button
              title="Back to Sign In"
              onPress={() => router.replace('/(auth)/login')}
              variant="gradient"
              style={styles.submitBtn}
            />

            <TouchableOpacity
              onPress={handleResend}
              disabled={resendCooldown > 0}
              style={[styles.resendBtn, resendCooldown > 0 && { opacity: 0.6 }]}
            >
              <Text style={[styles.resendText, { color: colors.primary }]}>
                {resendCooldown > 0
                  ? `Resend email in ${resendCooldown}s`
                  : "Didn't receive the email? Resend"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Footer Link ─────────────────────────────────────────── */}
        <View style={styles.footerContainer}>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>
            Remember your password?{' '}
          </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text
              style={{
                color: colors.primary,
                fontSize: typography.sizes.sm,
                fontWeight: '700',
              }}
            >
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  topLogoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topMiniLogo: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  topMiniLogoImg: {
    width: '100%',
    height: '100%',
  },
  topBrandText: {
    fontSize: 12.5,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  outerRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#16A34A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  innerCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 5,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 290,
  },
  card: {
    width: '100%',
    padding: 20,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  successCard: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  securityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 16,
  },
  securityText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  submitBtn: {
    height: 52,
    width: '100%',
  },
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    marginBottom: 14,
  },
  emailBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  instructionText: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    maxWidth: 290,
  },
  resendBtn: {
    marginTop: 16,
    paddingVertical: 8,
  },
  resendText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    paddingBottom: 16,
  },
});
