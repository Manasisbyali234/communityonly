import React from 'react';
import { StyleSheet, Text, View, KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTheme } from '../../theme';
import { useToastStore } from '../../store/toastStore';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../api/client';

const forgotSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

export default function ForgotPassword() {
  const { colors, spacing, typography } = useTheme();
  const router = useRouter();
  const showToast = useToastStore((state) => state.showToast);

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
      showToast('Reset instructions sent to your email.', 'success');
      router.replace('/(auth)/login');
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.keyboardView, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Back Button */}
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(auth)/login')}
          style={[styles.backBtn, { backgroundColor: colors.surface }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>

        {/* Content Details */}
        <View style={styles.headerContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="key-outline" size={48} color={colors.primary} />
          </View>
          <Text
            style={[
              styles.title,
              { color: colors.text, fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold },
            ]}
          >
            Forgot Password
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
            Enter your registered email address below. We'll send you instructions to reset your password.
          </Text>
        </View>

        {/* Form Input */}
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

          {/* Submit Action */}
          <Button
            title="Send Reset Link"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            variant="gradient"
            style={styles.submitBtn}
          />
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
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
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
    maxWidth: 290,
  },
  formContainer: {
    width: '100%',
  },
  submitBtn: {
    height: 52,
    marginTop: 16,
  },
});
