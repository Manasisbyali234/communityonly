import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Modal,
  LayoutAnimation,
  UIManager,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { Image as ExpoImage } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useTheme } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { useConfirmStore } from '../../store/confirmStore';
import { apiClient, API_BASE_URL } from '../../api/client';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Avatar from '../../components/common/Avatar';
import { pickImage, uploadProfilePhoto, uploadCoverPhoto, PickedImage } from '../../utils/imagePicker';
import { useUserApprovalStore, resolveUserApproval } from '../../store/userApprovalStore';

const BASE = API_BASE_URL.replace('/api/v1', '');
const toAbsUrl = (url?: string | null) =>
  url && url.startsWith('/') ? `${BASE}${url}` : url;

const profileSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(30, 'Name must be under 30 characters'),
  familyName: z.string().max(50, 'Family name must be under 50 characters').optional(),
  bio: z.string().max(160, 'Bio must be under 160 characters').optional(),
  avatarUrl: z.string().url('Enter a valid image URL').or(z.literal('')).optional(),
  village: z.string().max(50, 'Village must be under 50 characters').optional(),
  occupation: z.string().max(50, 'Occupation must be under 50 characters').optional(),
  languages: z.string().max(100, 'Languages must be under 100 characters').optional(),
  interests: z.string().max(100, 'Interests must be under 100 characters').optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const LANGUAGE_SUGGESTIONS = ['Kannada', 'English', 'Kodava', 'Tulu', 'Hindi', 'Tamil'];
const INTEREST_SUGGESTIONS = ['Agriculture', 'Community Service', 'Culture & Arts', 'Sports', 'Business', 'Technology', 'Education'];

export default function EditProfile() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { user, updateProfile } = useAuthStore();
  const showToast = useToastStore((state) => state.showToast);
  const getUserById = useUserApprovalStore((s) => s.getUserById);
  const resubmitUser = useUserApprovalStore((s) => s.resubmitUser);
  const { isApproved, status: currentStatus, managedUser: managed } = resolveUserApproval(user);
  const isRejectedOrPending = currentStatus === 'REJECTED' || currentStatus === 'PENDING' || currentStatus === 'RESUBMITTED';
  const rejectionReason = managed?.rejectionReason || user?.rejectionReason;

  const handleBack = () => {
    if (from === 'approval-status' || isRejectedOrPending) {
      router.replace('/(auth)/approval-status' as any);
    } else if (from === 'settings' || from === '/(tabs)/settings') {
      router.replace('/(tabs)/settings' as any);
    } else if (from === 'profile' || from === '/(tabs)/profile') {
      router.replace('/(tabs)/profile' as any);
    } else if (from) {
      const target = from.startsWith('/') ? from : `/(tabs)/${from}`;
      router.replace(target as any);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/profile' as any);
    }
  };

  const G = colors.primary;
  const BG = colors.background;
  const SURF = colors.surface;
  const BORDER = colors.border;
  const TEXT = colors.text;
  const TEXT2 = colors.textSecondary;
  const TEXT3 = colors.textMuted;

  // Sync latest profile from server on mount
  useEffect(() => {
    apiClient.get('/users/me').then((res) => {
      const fresh = res.data?.data ?? res.data;
      if (fresh) updateProfile(fresh);
    }).catch(() => {});
  }, [updateProfile]);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.displayName || '',
      familyName: (managed?.familyName || (user as any)?.familyName) || '',
      bio: user?.bio || '',
      avatarUrl: user?.avatarUrl || '',
      village: user?.village || '',
      occupation: user?.occupation || '',
      languages: user?.languages || '',
      interests: user?.interests || '',
    },
  });

  const bioValue = watch('bio') || '';
  const currentLanguages = watch('languages') || '';
  const currentInterests = watch('interests') || '';

  // Accordion state - keep one section expanded at a time
  const [expandedSection, setExpandedSection] = useState<'basic' | 'roots' | 'interests' | null>('basic');

  const toggleSection = (section: 'basic' | 'roots' | 'interests') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  // Automatically expand the section with validation errors
  useEffect(() => {
    if (errors.displayName || errors.bio) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpandedSection('basic');
    } else if (errors.village || errors.occupation) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpandedSection('roots');
    } else if (errors.languages || errors.interests) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpandedSection('interests');
    }
  }, [errors]);

  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  const [pickedImage, setPickedImage] = useState<PickedImage | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [localCoverUri, setLocalCoverUri] = useState<string | null>(null);
  const [pickedCover, setPickedCover] = useState<PickedImage | null>(null);
  const [coverRemoved, setCoverRemoved] = useState(false);

  const [showPhotoOptions, setShowPhotoOptions] = useState(false);

  const handlePickFromGallery = async () => {
    setShowPhotoOptions(false);
    setPhotoError(null);
    try {
      const picked = await pickImage();
      if (picked) {
        setLocalAvatarUri(picked.localUri);
        setPickedImage(picked);
      }
    } catch {
      setPhotoError('Failed to select photo. Please try a valid image.');
    }
  };

  const handlePickFromCamera = async () => {
    setShowPhotoOptions(false);
    setPhotoError(null);
    if (Platform.OS === 'web') {
      setPhotoError('Camera is not supported on web. Please choose from gallery.');
      return;
    }
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setPhotoError('Camera permission is required. Please enable it in device settings.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
        cameraType: ImagePicker.CameraType.front,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const mime = asset.mimeType ?? 'image/jpeg';
        const ext = mime.split('/')[1] ?? 'jpg';
        const name = asset.fileName ?? `avatar_${Date.now()}.${ext}`;
        setLocalAvatarUri(asset.uri);
        setPickedImage({ localUri: asset.uri, filename: name, mimeType: mime });
      }
    } catch {
      setPhotoError('Failed to open camera. Please check camera permissions in settings.');
    }
  };

  const handlePickCover = async () => {
    try {
      const picked = await pickImage();
      if (picked) {
        setLocalCoverUri(picked.localUri);
        setPickedCover(picked);
        setCoverRemoved(false);
      }
    } catch (_) {}
  };

  const handleRemoveCover = () => {
    setLocalCoverUri(null);
    setPickedCover(null);
    setCoverRemoved(true);
  };

  const handleAddLanguageSuggestion = (lang: string) => {
    const list = currentLanguages ? currentLanguages.split(',').map((s) => s.trim()).filter(Boolean) : [];
    if (!list.includes(lang)) {
      list.push(lang);
      setValue('languages', list.join(', '), { shouldValidate: true });
    }
  };

  const handleAddInterestSuggestion = (interest: string) => {
    const list = currentInterests ? currentInterests.split(',').map((s) => s.trim()).filter(Boolean) : [];
    if (!list.includes(interest)) {
      list.push(interest);
      setValue('interests', list.join(', '), { shouldValidate: true });
    }
  };

  const removeLanguage = (language: string) => {
    setValue('languages', currentLanguages.split(',').map((s) => s.trim()).filter((s) => s && s !== language).join(', '), { shouldValidate: true });
  };

  const removeInterest = (interest: string) => {
    setValue('interests', currentInterests.split(',').map((s) => s.trim()).filter((s) => s && s !== interest).join(', '), { shouldValidate: true });
  };

  const onSubmit = async (data: ProfileFormValues) => {
    const ok = await useConfirmStore.getState().confirm({
      title: 'Save profile changes?',
      message: 'Your updated profile information will be saved.',
      confirmText: 'Save',
      cancelText: 'Cancel',
      isDestructive: false,
      icon: 'person-outline',
    });
    if (!ok) return;

    try {
      let avatarUrl: string | undefined = data.avatarUrl || undefined;
      if (pickedImage) {
        const uploaded = await uploadProfilePhoto(pickedImage);
        if (uploaded) {
          avatarUrl = toAbsUrl(uploaded) ?? undefined;
        } else {
          showToast('Photo upload failed, saving other changes.', 'error');
        }
      }

      let coverImage: string | null | undefined = undefined;
      if (pickedCover) {
        const uploaded = await uploadCoverPhoto(pickedCover);
        if (uploaded) {
          coverImage = toAbsUrl(uploaded);
        }
      } else if (coverRemoved) {
        coverImage = null;
      }

      const res = await apiClient.put('/users/me', {
        displayName: data.displayName,
        bio: data.bio || undefined,
        avatarUrl: avatarUrl || undefined,
        ...(coverImage !== undefined ? { coverImage } : {}),
        village: data.village || undefined,
        occupation: data.occupation || undefined,
        languages: data.languages || undefined,
        interests: data.interests || undefined,
      });

      const updated = res.data?.data ?? res.data;
      if (avatarUrl) updated.avatarUrl = avatarUrl;
      if (coverImage !== undefined) updated.coverImage = coverImage;
      updateProfile(updated);

      if (isRejectedOrPending || from === 'approval-status') {
        if (user?.id) {
          resubmitUser(user.id, {
            displayName: data.displayName,
            familyName: data.familyName,
            bio: data.bio || undefined,
            avatarUrl: avatarUrl || undefined,
            village: data.village || undefined,
            occupation: data.occupation || undefined,
            languages: data.languages || undefined,
            interests: data.interests || undefined,
          });
        }
        updateProfile({ approvalStatus: 'RESUBMITTED' });
        showToast('Profile resubmitted for Admin review', 'success');
        router.replace('/(auth)/approval-status' as any);
        return;
      }

      showToast('Profile updated successfully', 'success');
      if (from === 'settings' || from === '/(tabs)/settings') {
        router.replace('/(tabs)/settings' as any);
      } else {
        router.replace('/(tabs)/profile');
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to update profile. Try again.';
      showToast(msg, 'error');
      console.error('Edit profile error:', e?.response?.data ?? e);
    }
  };

  if (!user) return null;

  const currentCoverUri = localCoverUri || (!coverRemoved ? user.coverImage : null);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.keyboardView, { backgroundColor: BG }]}
    >
      {/* ── Top Navbar ──────────────────────────────────────────────── */}
      <View style={[styles.navbar, { paddingTop: insets.top + 6, backgroundColor: SURF, borderBottomColor: BORDER }]}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.navBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: TEXT }]}>
          {isRejectedOrPending ? 'Resubmit Profile' : 'Edit Profile'}
        </Text>
        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          style={styles.saveHeaderBtn}
        >
          <Text style={[styles.saveHeaderBtnText, { color: G }]}>
            {isRejectedOrPending ? 'Resubmit' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(100, insets.bottom + 40) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Rejection Feedback Banner */}
        {currentStatus === 'REJECTED' && (
          <View style={[styles.rejectionNotice, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2', borderColor: '#FCA5A5' }]}>
            <Ionicons name="alert-circle" size={22} color="#DC2626" />
            <View style={{ flex: 1 }}>
              <Text style={styles.rejectionNoticeTitle}>Rejection Feedback from Administrator</Text>
              <Text style={[styles.rejectionNoticeDesc, { color: TEXT }]}>
                "{rejectionReason || 'Please review your profile details and resubmit for approval.'}"
              </Text>
              <Text style={[styles.rejectionNoticeHint, { color: TEXT3 }]}>
                Update the highlighted fields below and tap "Resubmit for Approval".
              </Text>
            </View>
          </View>
        )}

        {/* ── Cover & Avatar Header Masthead ──────────────────────────── */}
        <View style={styles.mastheadSection}>
          {/* Cover Container */}
          <View style={styles.coverBox}>
            {currentCoverUri ? (
              <ExpoImage
                source={{ uri: currentCoverUri }}
                style={styles.coverImg}
                contentFit="cover"
              />
            ) : (
              <TouchableOpacity onPress={handlePickCover} style={[styles.coverFallback, { backgroundColor: G + '15' }]}>
                <Ionicons name="image-outline" size={32} color={G} />
                <Text style={[styles.coverFallbackText, { color: G }]}>Add Cover Photo</Text>
              </TouchableOpacity>
            )}

            {/* Action Icons Group (Icon-only) */}
            <View style={styles.coverActionIconsRow}>
              {currentCoverUri ? (
                <TouchableOpacity
                  onPress={handleRemoveCover}
                  activeOpacity={0.8}
                  style={[styles.coverIconBtn, { backgroundColor: 'rgba(239, 68, 68, 0.85)' }]}
                >
                  <Ionicons name="trash-outline" size={16} color="#FFF" />
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                onPress={handlePickCover}
                activeOpacity={0.8}
                style={[styles.coverIconBtn, { backgroundColor: 'rgba(0, 0, 0, 0.65)' }]}
              >
                <Ionicons name="camera" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Overlapping Avatar Container */}
          <View style={styles.avatarOverlapContainer}>
            <TouchableOpacity onPress={() => setShowPhotoOptions(true)} activeOpacity={0.85} style={styles.avatarWrap}>
              <Avatar
                url={localAvatarUri ?? user.avatarUrl}
                name={user.displayName}
                size={92}
              />
              <View style={[styles.avatarCameraBadge, { backgroundColor: G }]}>
                <Ionicons name="camera" size={15} color="#FFF" />
              </View>
            </TouchableOpacity>
            {photoError ? (
              <Text style={styles.errorBannerText}>{photoError}</Text>
            ) : null}
          </View>
        </View>

        {/* ── Form Section Accordion Groups ───────────────────────────── */}
        <View style={styles.formContainer}>
          {/* Group 1: Basic Identity Accordion */}
          <View style={[styles.accordionCard, { backgroundColor: SURF }]}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => toggleSection('basic')}
              style={styles.accordionHeader}
            >
              <View style={styles.accordionHeaderLeft}>
                <View style={[styles.accordionIconWrap, { backgroundColor: G + '15' }]}>
                  <Ionicons name="person-outline" size={18} color={G} />
                </View>
                <View style={styles.accordionTitleWrap}>
                  <Text style={[styles.accordionTitle, { color: TEXT }]}>Basic Details</Text>
                  <Text style={[styles.accordionSubtitle, { color: TEXT3 }]} numberOfLines={1}>
                    {watch('displayName') || user?.displayName || 'Name & Bio'}
                  </Text>
                </View>
              </View>
              <View style={[styles.accordionChevronWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                <Ionicons
                  name={expandedSection === 'basic' ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={expandedSection === 'basic' ? G : TEXT3}
                />
              </View>
            </TouchableOpacity>

            {expandedSection === 'basic' && (
              <View style={styles.accordionBody}>
                <Controller
                  control={control}
                  name="displayName"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Full Name *"
                      placeholder="Enter your full name"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      leftIcon="person-outline"
                      error={errors.displayName?.message}
                      containerStyle={styles.fieldItem}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="familyName"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Family Name / Okka *"
                      placeholder="e.g. Mundodi / Kodendera"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      leftIcon="people-outline"
                      error={errors.familyName?.message}
                      containerStyle={styles.fieldItem}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="bio"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View style={styles.fieldItem}>
                      <Input
                        label="Bio"
                        placeholder="Share a short bio about yourself..."
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        multiline
                        numberOfLines={3}
                        leftIcon="document-text-outline"
                        error={errors.bio?.message}
                        containerStyle={{ minHeight: 90, marginBottom: 0 }}
                      />
                      <Text style={[styles.charCounter, { color: bioValue.length > 150 ? '#EF4444' : TEXT3 }]}>
                        {bioValue.length}/160
                      </Text>
                    </View>
                  )}
                />
              </View>
            )}
          </View>

          {/* Group 2: Community & Roots Accordion */}
          <View style={[styles.accordionCard, { backgroundColor: SURF }]}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => toggleSection('roots')}
              style={styles.accordionHeader}
            >
              <View style={styles.accordionHeaderLeft}>
                <View style={[styles.accordionIconWrap, { backgroundColor: G + '15' }]}>
                  <Ionicons name="home-outline" size={18} color={G} />
                </View>
                <View style={styles.accordionTitleWrap}>
                  <Text style={[styles.accordionTitle, { color: TEXT }]}>Community & Roots</Text>
                  <Text style={[styles.accordionSubtitle, { color: TEXT3 }]} numberOfLines={1}>
                    {[watch('village') || user?.village, watch('occupation') || user?.occupation].filter(Boolean).join(' • ') || 'Native place & profession'}
                  </Text>
                </View>
              </View>
              <View style={[styles.accordionChevronWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                <Ionicons
                  name={expandedSection === 'roots' ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={expandedSection === 'roots' ? G : TEXT3}
                />
              </View>
            </TouchableOpacity>

            {expandedSection === 'roots' && (
              <View style={styles.accordionBody}>
                <Controller
                  control={control}
                  name="village"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Native Place / Village"
                      placeholder="e.g. Somwarpet, Kodagu"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      leftIcon="location-outline"
                      error={errors.village?.message}
                      containerStyle={styles.fieldItem}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="occupation"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Profession / Occupation"
                      placeholder="e.g. Planter, Software Engineer"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      leftIcon="briefcase-outline"
                      error={errors.occupation?.message}
                      containerStyle={styles.fieldItem}
                    />
                  )}
                />
              </View>
            )}
          </View>

          {/* Group 3: Languages & Interests Accordion */}
          <View style={[styles.accordionCard, { backgroundColor: SURF }]}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => toggleSection('interests')}
              style={styles.accordionHeader}
            >
              <View style={styles.accordionHeaderLeft}>
                <View style={[styles.accordionIconWrap, { backgroundColor: G + '15' }]}>
                  <Ionicons name="sparkles-outline" size={18} color={G} />
                </View>
                <View style={styles.accordionTitleWrap}>
                  <Text style={[styles.accordionTitle, { color: TEXT }]}>Languages & Interests</Text>
                  <Text style={[styles.accordionSubtitle, { color: TEXT3 }]} numberOfLines={1}>
                    {[
                      currentLanguages ? `${currentLanguages.split(',').filter(Boolean).length} languages` : '',
                      currentInterests ? `${currentInterests.split(',').filter(Boolean).length} interests` : '',
                    ].filter(Boolean).join(' • ') || 'Languages & passions'}
                  </Text>
                </View>
              </View>
              <View style={[styles.accordionChevronWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                <Ionicons
                  name={expandedSection === 'interests' ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={expandedSection === 'interests' ? G : TEXT3}
                />
              </View>
            </TouchableOpacity>

            {expandedSection === 'interests' && (
              <View style={styles.accordionBody}>
                <Controller
                  control={control}
                  name="languages"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View style={styles.fieldItem}>
                      <Input
                        label="Languages Known"
                        placeholder="e.g. Kannada, English, Kodava"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        leftIcon="language-outline"
                        error={errors.languages?.message}
                        containerStyle={{ marginBottom: 0 }}
                      />
                      {/* Quick suggestion tags */}
                      <View style={styles.suggestionRow}>
                        <Text style={[styles.suggestionLabel, { color: TEXT3 }]}>Suggestions:</Text>
                        {LANGUAGE_SUGGESTIONS.map((lang) => (
                          <TouchableOpacity
                            key={lang}
                            onPress={() => handleAddLanguageSuggestion(lang)}
                            style={[styles.suggestionPill, { backgroundColor: isDark ? '#27272A' : '#F4F4F5' }]}
                          >
                            <Text style={[styles.suggestionText, { color: TEXT2 }]}>+ {lang}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      {currentLanguages ? (
                        <View style={styles.selectedRow}>
                          {currentLanguages.split(',').map((language) => language.trim()).filter(Boolean).map((language) => (
                            <TouchableOpacity key={language} onPress={() => removeLanguage(language)} style={[styles.selectedPill, { backgroundColor: G + '16', borderColor: G + '35' }]} accessibilityLabel={`Remove ${language}`}>
                              <Text style={[styles.selectedPillText, { color: G }]}>{language}</Text>
                              <Ionicons name="close-circle" size={16} color={G} />
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  )}
                />

                <Controller
                  control={control}
                  name="interests"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View style={styles.fieldItem}>
                      <Input
                        label="Interests & Passions"
                        placeholder="e.g. Agriculture, Community, Sports"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        leftIcon="heart-outline"
                        error={errors.interests?.message}
                        containerStyle={{ marginBottom: 0 }}
                      />
                      {/* Quick suggestion tags */}
                      <View style={styles.suggestionRow}>
                        <Text style={[styles.suggestionLabel, { color: TEXT3 }]}>Suggestions:</Text>
                        {INTEREST_SUGGESTIONS.map((interest) => (
                          <TouchableOpacity
                            key={interest}
                            onPress={() => handleAddInterestSuggestion(interest)}
                            style={[styles.suggestionPill, { backgroundColor: isDark ? '#27272A' : '#F4F4F5' }]}
                          >
                            <Text style={[styles.suggestionText, { color: TEXT2 }]}>+ {interest}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      {currentInterests ? (
                        <View style={styles.selectedRow}>
                          {currentInterests.split(',').map((interest) => interest.trim()).filter(Boolean).map((interest) => (
                            <TouchableOpacity key={interest} onPress={() => removeInterest(interest)} style={[styles.selectedPill, { backgroundColor: G + '16', borderColor: G + '35' }]} accessibilityLabel={`Remove ${interest}`}>
                              <Text style={[styles.selectedPillText, { color: G }]}>{interest}</Text>
                              <Ionicons name="close-circle" size={16} color={G} />
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  )}
                />
              </View>
            )}
          </View>

          {/* ── Main Save Button CTA ─────────────────────────────────── */}
          <Button
            title={isRejectedOrPending ? 'Resubmit for Approval' : 'Update Changes'}
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            variant="primary"
            size="lg"
            style={styles.saveBtn}
          />
        </View>
      </ScrollView>

      {/* ── Photo Picker Bottom Sheet Modal ───────────────────────────── */}
      <Modal
        visible={showPhotoOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhotoOptions(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPhotoOptions(false)}
        >
          <View style={[styles.photoSheet, { backgroundColor: SURF }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.photoSheetTitle, { color: TEXT }]}>Change Profile Picture</Text>
            <TouchableOpacity style={[styles.photoSheetBtn, { borderColor: BORDER }]} onPress={handlePickFromCamera}>
              <View style={[styles.photoSheetIconBox, { backgroundColor: G + '14' }]}>
                <Ionicons name="camera-outline" size={20} color={G} />
              </View>
              <Text style={[styles.photoSheetBtnText, { color: TEXT }]}>Take Photo with Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.photoSheetBtn, { borderColor: BORDER }]} onPress={handlePickFromGallery}>
              <View style={[styles.photoSheetIconBox, { backgroundColor: '#3B82F614' }]}>
                <Ionicons name="images-outline" size={20} color="#3B82F6" />
              </View>
              <Text style={[styles.photoSheetBtnText, { color: TEXT }]}>Choose from Photo Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.photoSheetCancel, { borderColor: BORDER }]} onPress={() => setShowPhotoOptions(false)}>
              <Text style={[styles.photoSheetCancelText, { color: TEXT2 }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  // Top App Bar
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
  },
  navBtn: { padding: 6 },
  navTitle: { fontSize: 17, fontWeight: '700' },
  saveHeaderBtn: { paddingVertical: 6, paddingHorizontal: 10 },
  saveHeaderBtnText: { fontSize: 15, fontWeight: '700' },

  // Masthead Section
  mastheadSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 8,
  },
  coverBox: {
    width: '100%',
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  coverImg: {
    width: '100%',
    height: '100%',
  },
  coverFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  coverFallbackText: {
    fontSize: 13,
    fontWeight: '700',
  },
  coverActionIconsRow: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
  },
  coverIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  // Avatar Overlap
  avatarOverlapContainer: {
    alignItems: 'center',
    marginTop: -44,
  },
  avatarWrap: {
    position: 'relative',
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#FFF',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6 },
      android: { elevation: 4 },
    }),
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeAvatarLink: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  changeAvatarText: {
    fontSize: 13,
    fontWeight: '700',
  },
  errorBannerText: {
    color: '#EF4444',
    fontSize: 11.5,
    marginTop: 4,
  },

  // Form Container
  formContainer: {
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 12,
  },
  accordionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  accordionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionTitleWrap: {
    flex: 1,
  },
  accordionTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  accordionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  accordionChevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionBody: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 16,
    gap: 10,
  },
  fieldItem: {
    marginBottom: 0,
  },
  charCounter: {
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
    marginRight: 4,
    fontWeight: '500',
  },

  // Suggestions
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  suggestionLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  suggestionPill: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  suggestionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  selectedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  selectedPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 16, paddingHorizontal: 9, paddingVertical: 5 },
  selectedPillText: { fontSize: 12, fontWeight: '600' },

  // Save CTA
  saveBtn: {
    marginTop: 8,
    marginBottom: 20,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  photoSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  photoSheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  photoSheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  photoSheetIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoSheetBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  photoSheetCancel: {
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  photoSheetCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  rejectionNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  rejectionNoticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 4,
  },
  rejectionNoticeDesc: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  rejectionNoticeHint: {
    fontSize: 11,
  },
});
