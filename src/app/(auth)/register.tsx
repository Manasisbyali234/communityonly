import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useToastStore } from '../../store/toastStore';
import * as ImagePicker from 'expo-image-picker';
import { pickImage, PickedImage, appendPickedFile } from '../../utils/imagePicker';
import { useUserApprovalStore } from '../../store/userApprovalStore';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../api/client';

const KARNATAKA_DISTRICTS = [
  'Dakshina Kannada',
  'Kodagu',
  'Hassan',
  'Mandya',
  'Mysuru',
  'Bengaluru Urban',
  'Bengaluru Rural',
  'Chikkamagaluru',
  'Shivamogga',
  'Tumakuru',
  'Chamarajanagar',
  'Udupi',
];

const GENDERS: Array<'Male' | 'Female' | 'Other'> = ['Male', 'Female', 'Other'];

const registerSchema = z
  .object({
    // Basic Details
    displayName: z.string().min(2, 'Full name is required (min 2 chars)').max(50),
    familyName: z.string().min(2, 'Family name / Okka is required').max(50),
    dob: z
      .string()
      .min(4, 'Date of Birth is required')
      .regex(/^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})$/, 'Format: YYYY-MM-DD or DD/MM/YYYY')
      .refine((val) => {
        const date = new Date(val.includes('/') ? val.split('/').reverse().join('-') : val);
        if (isNaN(date.getTime())) return false;
        const today = new Date();
        const age = today.getFullYear() - date.getFullYear() -
          (today < new Date(today.getFullYear(), date.getMonth(), date.getDate()) ? 1 : 0);
        return age >= 18;
      }, 'You must be at least 18 years old to register'),
    gender: z.enum(['Male', 'Female', 'Other']),
    phone: z
      .string()
      .min(10, 'Enter a valid 10-digit mobile number')
      .regex(/^[0-9+\-\s()]{10,15}$/, 'Invalid mobile number format'),
    email: z.string().email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string(),

    // Location Details
    country: z.string().optional(),
    state: z.string().optional(),
    district: z.string().optional(),
    city: z.string().optional(),
    nativePlace: z.string().optional(),
    currentLocation: z.string().optional(),

    // Professional Details (Optional)
    occupation: z.string().optional(),
    profession: z.string().optional(),
    company: z.string().optional(),
    education: z.string().optional(),
    skills: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, typography: T, roundness, isDark } = useTheme();
  const router = useRouter();
  const { ref } = useLocalSearchParams<{ ref?: string }>();
  const showToast = useToastStore((state) => state.showToast);
  const registerPendingUser = useUserApprovalStore((s) => s.registerPendingUser);
  const login = useAuthStore((state) => state.login);

  // Registration is intentionally a single identity step. The remaining
  // profile details are collected after approval in Edit Profile.
  const [profilePhoto, setProfilePhoto] = useState<PickedImage | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDobPicker, setShowDobPicker] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: '',
      familyName: '',
      dob: '',
      gender: 'Male',
      phone: '',
      email: '',
      password: '',
      confirmPassword: '',
      country: 'India',
      state: 'Karnataka',
      district: 'Dakshina Kannada',
      city: '',
      nativePlace: '',
      currentLocation: '',
      occupation: '',
      profession: '',
      company: '',
      education: '',
      skills: '',
    },
    mode: 'onTouched',
  });

  const selectedGender = watch('gender');
  const passwordVal = watch('password') || '';
  const hasMinLen = passwordVal.length >= 8;
  const hasUpper = /[A-Z]/.test(passwordVal);
  const hasNumber = /[0-9]/.test(passwordVal);

  const [showPhotoSourceSheet, setShowPhotoSourceSheet] = useState(false);

  const handlePickPhoto = () => setShowPhotoSourceSheet(true);

  const handlePickFromGallery = async () => {
    setShowPhotoSourceSheet(false);
    try {
      const img = await pickImage({ aspect: [1, 1] });
      if (img) setProfilePhoto(img);
    } catch {
      showToast('Could not select photo', 'error');
    }
  };

  const handlePickFromCamera = async () => {
    setShowPhotoSourceSheet(false);
    if (Platform.OS === 'web') { showToast('Camera not supported on web', 'error'); return; }
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { showToast('Camera permission required', 'error'); return; }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.85 });
      if (!result.canceled && result.assets?.[0]) setProfilePhoto({ localUri: result.assets[0].uri, filename: 'avatar.jpg', mimeType: 'image/jpeg' });
    } catch {
      showToast('Could not open camera', 'error');
    }
  };

  const onSubmit = async (data: RegisterFormValues) => {
    if (!profilePhoto) {
      showToast('Please upload a profile photo', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const rawPhone = data.phone.trim();
      const formattedPhone = rawPhone.startsWith('+') ? rawPhone : `+91 ${rawPhone}`;
      const username = data.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const profileData = {
        displayName: data.displayName.trim(),
        familyName: data.familyName.trim(),
        username,
        email: data.email.toLowerCase().trim(),
        phone: formattedPhone,
        dob: data.dob.trim(),
        gender: data.gender,
      };

      // 1. Register
      const res = await apiClient.post('/auth/register', {
        ...profileData,
        password: data.password,
        ...(ref ? { referredById: ref } : {}),
      });
      const { user: serverUser, accessToken, refreshToken } = res.data.data;
      await login(serverUser, accessToken, refreshToken);

      // 2. Upload profile photo
      let uploadedAvatarUrl: string | null = null;
      try {
        const formData = new FormData();
        await appendPickedFile(formData, profilePhoto);
        const uploadRes = await apiClient.post('/media/upload-profile-photo', formData, {
          headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${accessToken}` },
          timeout: 60000,
        });
        uploadedAvatarUrl = uploadRes.data?.data?.url ?? uploadRes.data?.data?.avatarUrl ?? null;
        if (uploadedAvatarUrl) {
          // rawUrl passed so normalizeUser in authStore applies toProxyUrl exactly once
          useAuthStore.getState().updateProfile({ avatarUrl: uploadedAvatarUrl });
        }
      } catch (uploadErr: any) {
        console.warn('[register] profile photo upload failed:', uploadErr?.response?.data || uploadErr?.message);
      }

      // Fallback: if upload failed, use local URI directly (bypass normalizeUser to avoid proxy-wrapping a file:// URI)
      if (!uploadedAvatarUrl) {
        useAuthStore.setState((s) => ({
          user: s.user ? { ...s.user, avatarUrl: profilePhoto.localUri } : s.user,
        }));
      }

      const avatarForStore = uploadedAvatarUrl || profilePhoto.localUri;
      registerPendingUser({
        ...profileData,
        id: serverUser.id,
        avatarUrl: avatarForStore,
        approvalStatus: 'PENDING',
        phoneVerified: false,
      });

      router.push({
        pathname: '/(auth)/otp',
        params: { phone: formattedPhone, email: data.email, userId: serverUser.id },
      });
    } catch (e: any) {
      showToast(e.response?.data?.message || e.message || 'Registration failed. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: C.background }]}
    >
      {/* Hero Header */}
      <View style={[styles.hero, { backgroundColor: C.primary, paddingTop: Math.max(insets.top, 20) + 8 }]}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(auth)/login')}
          style={styles.heroBackBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.heroRow}>
          <View style={styles.heroLogoWrap}>
            <ExpoImage source={require('../../../assets/images/logo.png')} style={styles.heroLogo} contentFit="contain" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Create Account</Text>
            <Text style={styles.heroSub}>Join the community — fill in your details below</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formBox}>
          {/* Section: Personal Info */}
          <View style={[styles.sectionHeader, { backgroundColor: isDark ? 'rgba(46,125,50,0.15)' : '#F0FDF4', borderColor: C.primary + '30' }]}>
            <View style={[styles.sectionIconBadge, { backgroundColor: C.primary }]}>
              <Ionicons name="person" size={16} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: C.text }]}>Personal Information</Text>
              <Text style={[styles.sectionSub, { color: C.textMuted }]}>Required for identity verification</Text>
            </View>
          </View>

            {/* Profile Photo Picker */}
            <TouchableOpacity
              onPress={handlePickPhoto}
              activeOpacity={0.85}
              style={[
                styles.photoCard,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FAFAFA',
                  borderColor: profilePhoto ? C.primary : (isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0'),
                  borderStyle: profilePhoto ? 'solid' : 'dashed',
                },
              ]}
            >
              {profilePhoto ? (
                <ExpoImage source={{ uri: profilePhoto.localUri }} style={styles.photoCardImg} contentFit="cover" />
              ) : (
                <View style={[styles.photoCardPlaceholder, { backgroundColor: isDark ? 'rgba(46,125,50,0.15)' : '#F0FDF4' }]}>
                  <Ionicons name="camera" size={28} color={C.primary} />
                </View>
              )}
              <View style={styles.photoCardInfo}>
                <Text style={[styles.photoCardTitle, { color: C.text }]}>
                  {profilePhoto ? '✓ Photo Selected' : 'Upload Profile Photo *'}
                </Text>
                <Text style={[styles.photoCardSub, { color: C.textMuted }]}>
                  {profilePhoto ? 'Tap to change photo' : 'Clear front portrait required for verification'}
                </Text>
              </View>
              <View style={[styles.photoCardChevron, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9' }]}>
                <Ionicons name={profilePhoto ? 'pencil' : 'cloud-upload-outline'} size={18} color={C.primary} />
              </View>
            </TouchableOpacity>

            {/* Full Name */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: C.text }]}>Full Name *</Text>
              <Controller
                control={control}
                name="displayName"
                render={({ field: { onChange, value } }) => (
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
                        borderColor: errors.displayName ? C.error : C.border,
                      },
                    ]}
                  >
                    <Ionicons name="person-outline" size={18} color={C.primary} style={styles.inputLeftIcon} />
                    <TextInput
                      style={[styles.inputWithIcon, { color: C.text }]}
                      placeholder="e.g. Yashwin Gowda"
                      placeholderTextColor={C.textMuted}
                      value={value}
                      onChangeText={onChange}
                    />
                  </View>
                )}
              />
              {errors.displayName && <Text style={[styles.errorText, { color: C.error }]}>{errors.displayName.message}</Text>}
            </View>

            {/* Family Name */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: C.text }]}>Family Name / Okka *</Text>
              <Controller
                control={control}
                name="familyName"
                render={({ field: { onChange, value } }) => (
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
                        borderColor: errors.familyName ? C.error : C.border,
                      },
                    ]}
                  >
                    <Ionicons name="people-outline" size={18} color={C.primary} style={styles.inputLeftIcon} />
                    <TextInput
                      style={[styles.inputWithIcon, { color: C.text }]}
                      placeholder="e.g. Mundodi / Kodendera / Chekkera"
                      placeholderTextColor={C.textMuted}
                      value={value}
                      onChangeText={onChange}
                    />
                  </View>
                )}
              />
              {errors.familyName && <Text style={[styles.errorText, { color: C.error }]}>{errors.familyName.message}</Text>}
            </View>

            {/* DOB & Gender Row */}
            <View style={styles.rowFields}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: C.text }]}>Date of Birth *</Text>
                <Controller
                  control={control}
                  name="dob"
                  render={({ field: { onChange, value } }) => {
                    const parsedDate = value && !isNaN(new Date(value).getTime())
                      ? new Date(value + (value.includes('T') ? '' : 'T12:00:00'))
                      : new Date(2000, 0, 1);

                    return (
                      <>
                        <TouchableOpacity
                          activeOpacity={0.75}
                          onPress={() => setShowDobPicker(true)}
                          style={[
                            styles.inputWrapper,
                            {
                              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
                              borderColor: errors.dob ? C.error : C.border,
                            },
                          ]}
                        >
                          <Ionicons name="calendar-outline" size={18} color={C.primary} style={styles.inputLeftIcon} />
                          <Text
                            style={[
                              styles.inputWithIconText,
                              { color: value ? C.text : C.textMuted },
                            ]}
                          >
                            {value || 'YYYY-MM-DD'}
                          </Text>
                        </TouchableOpacity>

                        {showDobPicker && (
                          <DateTimePicker
                            value={parsedDate}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 18))}
                            minimumDate={new Date(1920, 0, 1)}
                            onChange={(event, selectedDate) => {
                              if (Platform.OS !== 'ios') {
                                setShowDobPicker(false);
                              }
                              if (selectedDate && event.type !== 'dismissed') {
                                const yyyy = selectedDate.getFullYear();
                                const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
                                const dd = String(selectedDate.getDate()).padStart(2, '0');
                                onChange(`${yyyy}-${mm}-${dd}`);
                              }
                            }}
                          />
                        )}

                        {showDobPicker && Platform.OS === 'ios' && (
                          <TouchableOpacity
                            style={[styles.dateDoneBtn, { backgroundColor: C.primary }]}
                            onPress={() => setShowDobPicker(false)}
                          >
                            <Text style={styles.dateDoneBtnText}>Done</Text>
                          </TouchableOpacity>
                        )}
                      </>
                    );
                  }}
                />
                {errors.dob && <Text style={[styles.errorText, { color: C.error }]}>{errors.dob.message}</Text>}
              </View>
            </View>

            {/* Gender Selection */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: C.text }]}>Gender *</Text>
              <View style={styles.pillsRow}>
                {GENDERS.map((g) => {
                  const selected = selectedGender === g;
                  const iconName = g === 'Male' ? 'male-outline' : g === 'Female' ? 'female-outline' : 'person-outline';
                  return (
                    <TouchableOpacity
                      key={g}
                      onPress={() => setValue('gender', g)}
                      style={[
                        styles.genderPill,
                        {
                          backgroundColor: selected
                            ? C.primary
                            : (isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC'),
                          borderColor: selected ? C.primary : C.border,
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={iconName as any}
                        size={16}
                        color={selected ? '#FFF' : C.textSecondary}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={[styles.genderPillText, { color: selected ? '#FFF' : C.text, fontWeight: selected ? '700' : '600' }]}>
                        {g}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Mobile Number */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: C.text }]}>Mobile Number *</Text>
              <View style={styles.phoneInputRow}>
                <View style={[styles.phonePrefix, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9', borderColor: C.border }]}>
                  <Text style={styles.phoneFlag}>🇮🇳</Text>
                  <Text style={[styles.phonePrefixText, { color: C.text }]}>+91</Text>
                </View>
                <Controller
                  control={control}
                  name="phone"
                  render={({ field: { onChange, value } }) => (
                    <View
                      style={[
                        styles.inputWrapper,
                        {
                          flex: 1,
                          backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
                          borderColor: errors.phone ? C.error : C.border,
                        },
                      ]}
                    >
                      <Ionicons name="call-outline" size={18} color={C.primary} style={styles.inputLeftIcon} />
                      <TextInput
                        style={[styles.inputWithIcon, { color: C.text }]}
                        placeholder="98450 12345"
                        placeholderTextColor={C.textMuted}
                        keyboardType="phone-pad"
                        value={value}
                        onChangeText={onChange}
                      />
                    </View>
                  )}
                />
              </View>
              {errors.phone && <Text style={[styles.errorText, { color: C.error }]}>{errors.phone.message}</Text>}
            </View>

            {/* Email Address */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: C.text }]}>Email Address *</Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, value } }) => (
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
                        borderColor: errors.email ? C.error : C.border,
                      },
                    ]}
                  >
                    <Ionicons name="mail-outline" size={18} color={C.primary} style={styles.inputLeftIcon} />
                    <TextInput
                      style={[styles.inputWithIcon, { color: C.text }]}
                      placeholder="yashwin@example.com"
                      placeholderTextColor={C.textMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={value}
                      onChangeText={onChange}
                    />
                  </View>
                )}
              />
              {errors.email && <Text style={[styles.errorText, { color: C.error }]}>{errors.email.message}</Text>}
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: C.text }]}>Password *</Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, value } }) => (
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
                        borderColor: errors.password ? C.error : C.border,
                      },
                    ]}
                  >
                    <Ionicons name="lock-closed-outline" size={18} color={C.primary} style={styles.inputLeftIcon} />
                    <TextInput
                      style={[styles.inputWithIcon, { color: C.text }]}
                      placeholder="Create a password"
                      placeholderTextColor={C.textMuted}
                      secureTextEntry={!showPassword}
                      value={value}
                      onChangeText={onChange}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword((p) => !p)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.eyeBtn}
                    >
                      <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color={C.textMuted} />
                    </TouchableOpacity>
                  </View>
                )}
              />
              {errors.password && <Text style={[styles.errorText, { color: C.error }]}>{errors.password.message}</Text>}
            </View>

            {/* Confirm Password */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: C.text }]}>Confirm Password *</Text>
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, value } }) => (
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
                        borderColor: errors.confirmPassword ? C.error : C.border,
                      },
                    ]}
                  >
                    <Ionicons name="shield-checkmark-outline" size={18} color={C.primary} style={styles.inputLeftIcon} />
                    <TextInput
                      style={[styles.inputWithIcon, { color: C.text }]}
                      placeholder="Re-enter your password"
                      placeholderTextColor={C.textMuted}
                      secureTextEntry={!showConfirmPassword}
                      value={value}
                      onChangeText={onChange}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword((p) => !p)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.eyeBtn}
                    >
                      <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color={C.textMuted} />
                    </TouchableOpacity>
                  </View>
                )}
              />
              {errors.confirmPassword && <Text style={[styles.errorText, { color: C.error }]}>{errors.confirmPassword.message}</Text>}

              {/* Password Rules shown below confirm password */}
              <View style={styles.passwordRulesBox}>
                <View style={styles.passwordRuleItem}>
                  <Ionicons
                    name={hasMinLen ? 'checkmark-circle' : 'ellipse-outline'}
                    size={13}
                    color={hasMinLen ? '#16A34A' : C.textMuted}
                  />
                  <Text style={[styles.passwordRuleText, { color: hasMinLen ? '#16A34A' : C.textMuted }]}>
                    Minimum 8 characters
                  </Text>
                </View>
                <View style={styles.passwordRuleItem}>
                  <Ionicons
                    name={hasUpper ? 'checkmark-circle' : 'ellipse-outline'}
                    size={13}
                    color={hasUpper ? '#16A34A' : C.textMuted}
                  />
                  <Text style={[styles.passwordRuleText, { color: hasUpper ? '#16A34A' : C.textMuted }]}>
                    At least 1 uppercase letter (A-Z)
                  </Text>
                </View>
                <View style={styles.passwordRuleItem}>
                  <Ionicons
                    name={hasNumber ? 'checkmark-circle' : 'ellipse-outline'}
                    size={13}
                    color={hasNumber ? '#16A34A' : C.textMuted}
                  />
                  <Text style={[styles.passwordRuleText, { color: hasNumber ? '#16A34A' : C.textMuted }]}>
                    At least 1 number (0-9)
                  </Text>
                </View>
              </View>
            </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: C.primary }]}
            onPress={handleSubmit(onSubmit)}
            disabled={submitting}
          >
            {submitting ? <ActivityIndicator size="small" color="#FFF" /> : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                <Text style={styles.primaryBtnText}>Verify Mobile & Register</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={[styles.noticeBox, { backgroundColor: isDark ? 'rgba(76,175,80,0.12)' : '#E8F5E9', borderColor: C.primary + '30' }]}>
            <Ionicons name="shield-checkmark-outline" size={18} color={C.primary} />
            <Text style={[styles.noticeBoxText, { color: C.textMuted }]}>An SMS OTP will be sent to verify your mobile. Your profile will be submitted for Admin review.</Text>
          </View>
        </View>

        {/* Photo Source Sheet */}
        <Modal visible={showPhotoSourceSheet} transparent animationType="slide" onRequestClose={() => setShowPhotoSourceSheet(false)}>
          <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setShowPhotoSourceSheet(false)}>
            <View style={[styles.sheetContainer, { backgroundColor: C.surface ?? '#FFF' }]}>
              <View style={[styles.sheetHandle, { backgroundColor: C.border }]} />
              <Text style={[styles.sheetTitle, { color: C.text }]}>Add Profile Photo</Text>
              <TouchableOpacity style={[styles.sheetOption, { borderBottomColor: C.border }]} onPress={handlePickFromCamera}>
                <View style={[styles.sheetIconWrap, { backgroundColor: C.primary + '14' }]}>
                  <Ionicons name="camera" size={22} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sheetOptionTitle, { color: C.text }]}>Take Photo</Text>
                  <Text style={[styles.sheetOptionSub, { color: C.textMuted }]}>Use your camera</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sheetOption, { borderBottomColor: C.border }]} onPress={handlePickFromGallery}>
                <View style={[styles.sheetIconWrap, { backgroundColor: '#3B82F614' }]}>
                  <Ionicons name="images" size={22} color="#3B82F6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sheetOptionTitle, { color: C.text }]}>Choose from Gallery</Text>
                  <Text style={[styles.sheetOptionSub, { color: C.textMuted }]}>Pick from your photos</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetCancel} onPress={() => setShowPhotoSourceSheet(false)}>
                <Text style={[styles.sheetCancelText, { color: C.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Login Link */}
        <View style={styles.loginLinkRow}>
          <Text style={[styles.loginText, { color: C.textMuted }]}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={[styles.loginLink, { color: C.primary }]}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Hero
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  heroBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroLogoWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  heroLogo: { width: 44, height: 44 },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 48,
  },
  formBox: { gap: 14 },
  // Section header card
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 4,
  },
  sectionIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sectionSub: {
    fontSize: 12,
    marginTop: 1,
  },
  // Photo card
  photoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  photoCardImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  photoCardPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCardInfo: { flex: 1 },
  photoCardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  photoCardSub: {
    fontSize: 12,
    marginTop: 2,
  },
  photoCardChevron: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Fields
  fieldGroup: { gap: 6 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  inputLeftIcon: { marginRight: 10 },
  inputWithIcon: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    padding: 0,
  },
  inputWithIconText: {
    flex: 1,
    fontSize: 14,
  },
  dateDoneBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  dateDoneBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  eyeBtn: { padding: 4, marginLeft: 6 },
  passwordRulesBox: {
    paddingHorizontal: 4,
    paddingVertical: 8,
    marginTop: 2,
    gap: 5,
  },
  passwordRuleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  passwordRuleText: {
    fontSize: 12,
    fontWeight: '500',
  },
  phoneFlag: { fontSize: 16 },
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  errorText: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderPill: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phonePrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
  },
  phonePrefixText: {
    fontSize: 14,
    fontWeight: '700',
  },
  districtsScroll: { marginBottom: 4 },
  districtChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  districtChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#16A34A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    height: 52,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  noticeBoxText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
  },
  loginLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    paddingVertical: 8,
  },
  loginText: { fontSize: 14 },
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
  },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheetContainer: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingBottom: 36, paddingTop: 12 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 16, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  sheetOption: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1 },
  sheetIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sheetOptionTitle: { fontSize: 15, fontWeight: '700' },
  sheetOptionSub: { fontSize: 12, marginTop: 2 },
  sheetCancel: { marginTop: 12, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  sheetCancelText: { fontSize: 15, fontWeight: '600' },
});
