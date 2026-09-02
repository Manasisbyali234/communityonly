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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useToastStore } from '../../store/toastStore';
import { pickImage, PickedImage } from '../../utils/imagePicker';
import { useUserApprovalStore } from '../../store/userApprovalStore';
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
      .regex(/^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})$/, 'Format: YYYY-MM-DD or DD/MM/YYYY'),
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
    country: z.string().min(2, 'Country is required'),
    state: z.string().min(2, 'State is required'),
    district: z.string().min(2, 'District is required'),
    city: z.string().min(2, 'City / Town is required'),
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
  const { colors: C, spacing, typography: T, roundness, isDark } = useTheme();
  const router = useRouter();
  const { ref } = useLocalSearchParams<{ ref?: string }>();
  const showToast = useToastStore((state) => state.showToast);
  const registerPendingUser = useUserApprovalStore((s) => s.registerPendingUser);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    handleSubmit,
    trigger,
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

  const selectedDistrict = watch('district');
  const selectedGender = watch('gender');

  const handlePickPhoto = async () => {
    try {
      const img = await pickImage({ aspect: [1, 1] });
      if (img) {
        setProfilePhoto(img.localUri);
      }
    } catch {
      showToast('Could not select photo', 'error');
    }
  };

  const handleNextStep = async () => {
    if (step === 1) {
      const valid = await trigger([
        'displayName',
        'familyName',
        'dob',
        'gender',
        'phone',
        'email',
        'password',
        'confirmPassword',
      ]);
      if (!profilePhoto) {
        showToast('Please upload a profile photo (required)', 'error');
        return;
      }
      if (valid) setStep(2);
    } else if (step === 2) {
      const valid = await trigger(['country', 'state', 'district', 'city']);
      if (valid) setStep(3);
    }
  };

  const onSubmit = async (data: RegisterFormValues) => {
    if (!profilePhoto) {
      showToast('Please upload a profile photo', 'error');
      setStep(1);
      return;
    }

    setSubmitting(true);
    try {
      // 1. Format phone with standard format
      const rawPhone = data.phone.trim();
      const formattedPhone = rawPhone.startsWith('+') ? rawPhone : `+91 ${rawPhone}`;

      // 2. Register user in approval store with PENDING status
      const pendingUser = registerPendingUser({
        displayName: data.displayName.trim(),
        familyName: data.familyName.trim(),
        username: data.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        email: data.email.toLowerCase().trim(),
        phone: formattedPhone,
        avatarUrl: profilePhoto,
        dob: data.dob.trim(),
        gender: data.gender,
        country: data.country.trim(),
        state: data.state.trim(),
        district: data.district.trim(),
        city: data.city.trim(),
        nativePlace: data.nativePlace?.trim() || undefined,
        currentLocation: data.currentLocation?.trim() || data.city.trim(),
        occupation: data.occupation?.trim() || undefined,
        profession: data.profession?.trim() || undefined,
        company: data.company?.trim() || undefined,
        education: data.education?.trim() || undefined,
        skills: data.skills?.trim() || undefined,
        approvalStatus: 'PENDING',
        phoneVerified: false,
      });

      // Try server endpoint if online (non-blocking)
      try {
        await apiClient.post('/auth/register', {
          displayName: data.displayName,
          familyName: data.familyName,
          email: data.email,
          phone: formattedPhone,
          password: data.password,
          username: pendingUser.username,
          ...(ref ? { referredById: ref } : {}),
        });
      } catch {}

      // 3. Move directly to Mobile OTP verification
      router.push({
        pathname: '/(auth)/otp',
        params: {
          phone: formattedPhone,
          email: data.email,
          userId: pendingUser.id,
        },
      });
    } catch (e: any) {
      showToast(e.message || 'Registration failed. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: C.background }]}
    >
      {/* ── Top Bar ────────────────────────────────────────────── */}
      <View style={[styles.topBar, { borderBottomColor: C.borderSecondary }]}>
        <TouchableOpacity
          onPress={() => {
            if (step > 1) {
              setStep((s) => (s - 1) as any);
            } else if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(auth)/login');
            }
          }}
          style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : C.surfaceVariant }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <View style={styles.topBarTitleWrap}>
          <Text style={[styles.topBarTitle, { color: C.text }]}>Community Registration</Text>
          <Text style={[styles.topBarSub, { color: C.primary }]}>
            Step {step} of 3 • {step === 1 ? 'Basic Details' : step === 2 ? 'Location' : 'Professional'}
          </Text>
        </View>
        <View style={[styles.topMiniLogo, { backgroundColor: '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.15)' : C.border }]}>
          <ExpoImage source={require('../../../assets/images/logo.png')} style={styles.topMiniLogoImg} contentFit="contain" />
        </View>
      </View>

      {/* ── Step Progress Indicator ────────────────────────────── */}
      <View style={styles.progressContainer}>
        {[1, 2, 3].map((s) => (
          <View
            key={s}
            style={[
              styles.progressSegment,
              {
                backgroundColor: s <= step ? C.primary : isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
              },
            ]}
          />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Step 1: Basic Details ────────────────────────────── */}
        {step === 1 && (
          <View style={styles.stepBox}>
            <View style={styles.stepHeadingRow}>
              <View style={[styles.stepIconBadge, { backgroundColor: isDark ? 'rgba(46, 125, 50, 0.2)' : '#E8F5E9' }]}>
                <Ionicons name="person" size={20} color={C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stepHeading, { color: C.text }]}>Basic Information</Text>
                <Text style={[styles.stepNotice, { color: C.textMuted }]}>
                  Enter your official details for profile review and membership.
                </Text>
              </View>
            </View>

            {/* Profile Photo Picker */}
            <View style={styles.photoPickerContainer}>
              <TouchableOpacity
                onPress={handlePickPhoto}
                activeOpacity={0.85}
                style={[
                  styles.photoOuterRing,
                  {
                    backgroundColor: isDark ? 'rgba(46, 125, 50, 0.12)' : '#F0FDF4',
                    borderColor: profilePhoto ? C.primary : (isDark ? 'rgba(255,255,255,0.15)' : '#DCFCE7'),
                  },
                ]}
              >
                <View
                  style={[
                    styles.photoCircle,
                    {
                      borderColor: profilePhoto ? C.primary : (isDark ? 'rgba(255,255,255,0.12)' : C.border),
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F8FAFC',
                    },
                  ]}
                >
                  {profilePhoto ? (
                    <ExpoImage source={{ uri: profilePhoto }} style={styles.photoImg} contentFit="cover" />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <View style={[styles.cameraIconBox, { backgroundColor: isDark ? 'rgba(46, 125, 50, 0.25)' : '#DCFCE7' }]}>
                        <Ionicons name="camera" size={24} color={C.primary} />
                      </View>
                      <Text style={[styles.photoPlaceholderText, { color: C.text }]}>Add Photo *</Text>
                    </View>
                  )}
                </View>

                <View style={[styles.photoCornerBadge, { backgroundColor: C.primary, borderColor: C.background }]}>
                  <Ionicons name={profilePhoto ? 'pencil' : 'add'} size={14} color="#FFF" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.7} style={styles.photoHelperWrap}>
                <Text style={[styles.photoMainLabel, { color: C.text }]}>
                  {profilePhoto ? 'Profile Photo Selected' : 'Upload Profile Photo *'}
                </Text>
                <Text style={[styles.photoSubLabel, { color: C.textMuted }]}>
                  {profilePhoto ? 'Tap circle to choose another picture' : 'A clear front portrait is required for admin verification'}
                </Text>
              </TouchableOpacity>
            </View>

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
                  render={({ field: { onChange, value } }) => (
                    <View
                      style={[
                        styles.inputWrapper,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
                          borderColor: errors.dob ? C.error : C.border,
                        },
                      ]}
                    >
                      <Ionicons name="calendar-outline" size={18} color={C.primary} style={styles.inputLeftIcon} />
                      <TextInput
                        style={[styles.inputWithIcon, { color: C.text }]}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={C.textMuted}
                        value={value}
                        onChangeText={onChange}
                      />
                    </View>
                  )}
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
                  <Text style={[styles.phoneFlag, { marginRight: 4 }]}>🇮🇳</Text>
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
                      placeholder="Min. 8 chars, 1 uppercase, 1 number"
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
            </View>

            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: C.primary }]} onPress={handleNextStep}>
              <Text style={styles.primaryBtnText}>Next Step</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 2: Location Details ──────────────────────────── */}
        {step === 2 && (
          <View style={styles.stepBox}>
            <Text style={[styles.stepHeading, { color: C.text }]}>Location & Roots</Text>
            <Text style={[styles.stepNotice, { color: C.textMuted }]}>
              Help us connect you to your district and native village community.
            </Text>

            {/* Country & State */}
            <View style={styles.rowFields}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: C.text }]}>Country *</Text>
                <Controller
                  control={control}
                  name="country"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      style={[styles.input, { backgroundColor: C.surfaceVariant, color: C.text, borderColor: C.border }]}
                      value={value}
                      onChangeText={onChange}
                    />
                  )}
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: C.text }]}>State *</Text>
                <Controller
                  control={control}
                  name="state"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      style={[styles.input, { backgroundColor: C.surfaceVariant, color: C.text, borderColor: C.border }]}
                      value={value}
                      onChangeText={onChange}
                    />
                  )}
                />
              </View>
            </View>

            {/* District Quick Select */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: C.text }]}>District *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.districtsScroll}>
                {KARNATAKA_DISTRICTS.map((d) => {
                  const sel = selectedDistrict === d;
                  return (
                    <TouchableOpacity
                      key={d}
                      onPress={() => setValue('district', d)}
                      style={[
                        styles.districtChip,
                        {
                          backgroundColor: sel ? C.primary : isDark ? 'rgba(255,255,255,0.06)' : C.surfaceVariant,
                          borderColor: sel ? C.primary : C.border,
                        },
                      ]}
                    >
                      <Text style={[styles.districtChipText, { color: sel ? '#FFF' : C.text }]}>{d}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <Controller
                control={control}
                name="district"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={[styles.input, { marginTop: 8, backgroundColor: C.surfaceVariant, color: C.text, borderColor: errors.district ? C.error : C.border }]}
                    placeholder="Enter district"
                    placeholderTextColor={C.textMuted}
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
              {errors.district && <Text style={[styles.errorText, { color: C.error }]}>{errors.district.message}</Text>}
            </View>

            {/* City / Town */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: C.text }]}>City / Town *</Text>
              <Controller
                control={control}
                name="city"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={[styles.input, { backgroundColor: C.surfaceVariant, color: C.text, borderColor: errors.city ? C.error : C.border }]}
                    placeholder="e.g. Sullia, Madikeri, Puttur"
                    placeholderTextColor={C.textMuted}
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
              {errors.city && <Text style={[styles.errorText, { color: C.error }]}>{errors.city.message}</Text>}
            </View>

            {/* Native Place / Hometown (Optional) */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: C.text }]}>Native Place / Hometown (Optional)</Text>
              <Controller
                control={control}
                name="nativePlace"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={[styles.input, { backgroundColor: C.surfaceVariant, color: C.text, borderColor: C.border }]}
                    placeholder="e.g. Aranthod, Napoklu, Somwarpet"
                    placeholderTextColor={C.textMuted}
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
            </View>

            {/* Current Location */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: C.text }]}>Current Location (Optional)</Text>
              <Controller
                control={control}
                name="currentLocation"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={[styles.input, { backgroundColor: C.surfaceVariant, color: C.text, borderColor: C.border }]}
                    placeholder="e.g. Bengaluru, Mysuru, Dubai"
                    placeholderTextColor={C.textMuted}
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.secondaryBtn, { borderColor: C.border }]} onPress={() => setStep(1)}>
                <Ionicons name="arrow-back" size={16} color={C.text} />
                <Text style={[styles.secondaryBtnText, { color: C.text }]}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { flex: 1, backgroundColor: C.primary }]} onPress={handleNextStep}>
                <Text style={styles.primaryBtnText}>Next Step</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Step 3: Professional Details (Optional) ─────────────── */}
        {step === 3 && (
          <View style={styles.stepBox}>
            <Text style={[styles.stepHeading, { color: C.text }]}>Professional Details</Text>
            <Text style={[styles.stepNotice, { color: C.textMuted }]}>
              Optional details to help community members connect with your expertise.
            </Text>

            {/* Occupation */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: C.text }]}>Occupation</Text>
              <Controller
                control={control}
                name="occupation"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={[styles.input, { backgroundColor: C.surfaceVariant, color: C.text, borderColor: C.border }]}
                    placeholder="e.g. Software Engineer, Planter, Doctor, Teacher"
                    placeholderTextColor={C.textMuted}
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
            </View>

            {/* Profession / Industry */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: C.text }]}>Profession / Industry</Text>
              <Controller
                control={control}
                name="profession"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={[styles.input, { backgroundColor: C.surfaceVariant, color: C.text, borderColor: C.border }]}
                    placeholder="e.g. Information Technology, Agriculture, Healthcare"
                    placeholderTextColor={C.textMuted}
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
            </View>

            {/* Company / Organization */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: C.text }]}>Company / Organization</Text>
              <Controller
                control={control}
                name="company"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={[styles.input, { backgroundColor: C.surfaceVariant, color: C.text, borderColor: C.border }]}
                    placeholder="e.g. Infosys, Self-Employed, Coffee Board"
                    placeholderTextColor={C.textMuted}
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
            </View>

            {/* Education */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: C.text }]}>Education</Text>
              <Controller
                control={control}
                name="education"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={[styles.input, { backgroundColor: C.surfaceVariant, color: C.text, borderColor: C.border }]}
                    placeholder="e.g. B.E. Computer Science, MBBS, MBA, M.Sc."
                    placeholderTextColor={C.textMuted}
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
            </View>

            {/* Skills / Interests */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: C.text }]}>Skills / Interests</Text>
              <Controller
                control={control}
                name="skills"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={[styles.input, { backgroundColor: C.surfaceVariant, color: C.text, borderColor: C.border }]}
                    placeholder="e.g. Organic Farming, Badminton, Community Welfare"
                    placeholderTextColor={C.textMuted}
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
            </View>

            {/* Mobile Verification Notice */}
            <View style={[styles.noticeBox, { backgroundColor: isDark ? 'rgba(76, 175, 80, 0.12)' : '#E8F5E9', borderColor: C.primary + '30' }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={C.primary} />
              <Text style={[styles.noticeBoxText, { color: C.text }]}>
                Next step: We will send an SMS OTP to verify your mobile number. Your profile will then be submitted for Admin review.
              </Text>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.secondaryBtn, { borderColor: C.border }]} onPress={() => setStep(2)}>
                <Ionicons name="arrow-back" size={16} color={C.text} />
                <Text style={[styles.secondaryBtnText, { color: C.text }]}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, { flex: 1, backgroundColor: C.primary }]}
                onPress={handleSubmit(onSubmit)}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Verify Mobile & Register</Text>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

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
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitleWrap: {
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  topBarSub: {
    fontSize: 11,
    marginTop: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    height: 3,
    width: '100%',
    gap: 4,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 48,
  },
  stepBox: {
    gap: 14,
  },
  stepHeading: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 25,
  },
  stepNotice: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    marginBottom: 4,
  },
  topMiniLogo: {
    width: 32,
    height: 32,
    borderRadius: 9,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topMiniLogoImg: {
    width: '100%',
    height: '100%',
  },
  stepHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 4,
    marginBottom: 8,
  },
  stepIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPickerContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  photoOuterRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  photoCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 48,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoImg: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  cameraIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  photoPlaceholderText: {
    fontSize: 11,
    fontWeight: '700',
  },
  photoCornerBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoHelperWrap: {
    alignItems: 'center',
    marginTop: 10,
    gap: 2,
  },
  photoMainLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  photoSubLabel: {
    fontSize: 11.5,
    textAlign: 'center',
    maxWidth: 290,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  inputLeftIcon: {
    marginRight: 10,
  },
  inputWithIcon: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    padding: 0,
  },
  eyeBtn: {
    padding: 4,
    marginLeft: 6,
  },
  phoneFlag: {
    fontSize: 16,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  errorText: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 2,
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
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  phoneInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  phonePrefix: {
    width: 58,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phonePrefixText: {
    fontSize: 14,
    fontWeight: '700',
  },
  districtsScroll: {
    marginBottom: 4,
  },
  districtChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
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
    marginTop: 14,
  },
  primaryBtn: {
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    height: 50,
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
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
  },
  noticeBoxText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  loginLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginText: {
    fontSize: 13,
  },
  loginLink: {
    fontSize: 13,
    fontWeight: '700',
  },
});
