import React from 'react';
import { StyleSheet, Text, View, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTheme } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useAdminStore } from '../../store/adminStore';
import { useToastStore } from '../../store/toastStore';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { apiClient } from '../../api/client';
import axios from 'axios';
import { getApiBaseUrl } from '../../api/config';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const { colors, spacing, typography, palette, roundness } = useTheme();
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const adminLogin = useAdminStore((state) => state.login);
  const showToast = useToastStore((state) => state.showToast);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      const res = await apiClient.post('/auth/login', { email: data.email, password: data.password });
      const { user, accessToken, refreshToken } = res.data.data;
      await login(user, accessToken, refreshToken);

      if (user.role?.toUpperCase() === 'ADMIN') {
        try {
          // Use plain axios — no auth header needed, /admin-auth/login is public
          const adminRes = await axios.post(`${getApiBaseUrl()}/admin-auth/login`, { email: data.email, password: data.password });
          const { token, admin, expiresAt } = adminRes.data.data;
          adminLogin(admin, token, expiresAt);
        } catch (e: any) {
          showToast(e.response?.data?.message ?? 'Admin session failed', 'error');
          return;
        }
        router.replace('/(admin)/dashboard' as any);
      } else {
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      showToast(e.response?.data?.message ?? e.message ?? 'Login failed. Please check credentials.', 'error');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.keyboardView, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Branding Logo Area */}
        <View style={styles.logoContainer}>
          <LinearGradient
            colors={[palette.gradientStart, palette.gradientMiddle, palette.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.logoIcon, { borderRadius: roundness.xl }]}
          >
            <Ionicons name="sparkles" size={32} color={palette.white} />
          </LinearGradient>
          <Text
            style={[
              styles.logoText,
              { color: colors.text, fontSize: typography.sizes.xxxl, fontWeight: typography.weights.black },
            ]}
          >
            COMMUNITY
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
            Sign in to connect and collaborate
          </Text>
        </View>

        {/* Input Fields Form */}
        <View style={styles.formContainer}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email Address"
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

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                placeholder="Enter your password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry
                leftIcon="lock-closed-outline"
                error={errors.password?.message}
              />
            )}
          />

          {/* Forgot Password Link */}
          <TouchableOpacity
            onPress={() => router.push('/(auth)/forgot-password')}
            style={styles.forgotBtn}
          >
            <Text
              style={[
                styles.forgotText,
                { color: colors.primary, fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
              ]}
            >
              Forgot Password?
            </Text>
          </TouchableOpacity>

          {/* Submit Button */}
          <Button
            title="Sign In"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            variant="gradient"
            style={styles.submitBtn}
          />
        </View>

        {/* Register / Sign Up Navigation Link */}
        <View style={styles.footerContainer}>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>
            Don't have an account?{' '}
          </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text
              style={{
                color: colors.primary,
                fontSize: typography.sizes.sm,
                fontWeight: typography.weights.bold,
              }}
            >
              Sign Up
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoIcon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    letterSpacing: 2,
  },
  subtitle: {
    marginTop: 4,
    fontWeight: '500',
  },
  formContainer: {
    width: '100%',
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    textAlign: 'right',
  },
  submitBtn: {
    height: 52,
    marginTop: 8,
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
});
