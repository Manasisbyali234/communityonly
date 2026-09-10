import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Platform,
  Alert,
  Animated,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import {
  useMatrimonyProfileQuery,
  useExpressInterestMutation,
  useLikeProfileMutation,
  MARITAL_STATUS_LABELS,
  EDUCATION_LABELS,
} from '../../api/matrimony';
import { useTheme } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { apiClient } from '../../api/client';
import Button from '../../components/common/Button';
import Skeleton from '../../components/feedback/Skeleton';
import { shareUrl } from '../../utils/shareUtils';

const QUICK_MESSAGES = [
  'Hi, I came across your profile and would love to connect!',
  'Hi, our preferences align well. Looking forward to knowing you better.',
  'Namaskara, I am interested in your profile and would like to talk.',
];

export default function MatrimonyProfileDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const { user } = useAuthStore();
  const showToast = useToastStore((s) => s.showToast);

  const safeId = id && id !== 'undefined' ? id : '';
  const { data: profile, isLoading, isError } = useMatrimonyProfileQuery(safeId);
  const expressInterest = useExpressInterestMutation();
  const likeMutation = useLikeProfileMutation();

  const [hasLiked, setHasLiked] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteReasonOther, setDeleteReasonOther] = useState('');
  const [deletingProfile, setDeletingProfile] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const heroRef = useRef<FlatList>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  const isWide = windowWidth >= 768;
  const contentWidth = isWide ? Math.min(windowWidth, 680) : windowWidth;
  const heroHeight = isWide ? 420 : Math.min(340, Math.round(windowWidth * 0.85));

  const G = colors.primary;
  const BG = colors.background;
  const SURF = colors.surface;
  const BORDER = colors.border;
  const TEXT = colors.text;
  const TEXT2 = colors.textSecondary;
  const TEXT3 = colors.textMuted;

  const isOwnProfile = !!user && !!profile && profile.userId === user.id;

  useEffect(() => {
    setHasLiked(profile?.hasLiked ?? false);
  }, [profile?.hasLiked]);

  const DELETE_REASONS = [
    'Got married / Found a match',
    'Not interested anymore',
    'Privacy concerns',
    'Too many unwanted messages',
    'Profile information is outdated',
    'Other',
  ];

  const handleDelete = () => setShowDeleteModal(true);

  const handleConfirmDelete = async () => {
    if (!deleteReason) { showToast('Please select a reason for deleting.', 'error'); return; }
    const finalReason = deleteReason === 'Other' ? deleteReasonOther.trim() : deleteReason;
    if (deleteReason === 'Other' && !finalReason) { showToast('Please describe your reason.', 'error'); return; }
    setDeletingProfile(true);
    try {
      await apiClient.delete(`/matrimony/profiles/${safeId}`, { data: { reason: finalReason } });
      setShowDeleteModal(false);
      router.replace('/matrimony' as any);
    } catch (e: any) {
      showToast(e.response?.data?.message ?? 'Failed to delete profile', 'error');
    } finally {
      setDeletingProfile(false);
    }
  };

  const handleLike = async () => {
    if (hasLiked || likeMutation.isPending) return;
    try {
      const result = await likeMutation.mutateAsync(safeId);
      setHasLiked(true);
      if (result.matched && result.conversationId) {
        showToast("It's a Match! 💍 Start chatting now.", 'success');
        router.push(`/chat/${result.conversationId}` as any);
      }
    } catch (e: any) {
      showToast(e.response?.data?.message ?? 'Failed to like profile', 'error');
    }
  };

  const handleSendInterest = async () => {
    if (expressInterest.isPending) return;
    try {
      await expressInterest.mutateAsync({
        toProfileId: safeId,
        message: message.trim() || undefined,
      });
      setShowModal(false);
      showToast('Interest sent successfully! 💌', 'success');
    } catch (e: any) {
      setShowModal(false);
      showToast(e.response?.data?.message ?? 'Failed to send interest', 'error');
    }
  };

  const handleShare = useCallback(async () => {
    if (!profile) return;
    const base = Platform.OS === 'web' && typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}` : '';
    const link = `${base}/matrimony/${profile.id}`;
    const ok = await shareUrl(`Check out ${profile.displayName}'s Matrimony Profile on GowdaCommunity: ${link}`, link);
    showToast(ok ? 'Profile link copied!' : 'Could not share profile', ok ? 'success' : 'error');
  }, [profile, showToast]);

  const navBgOpacity = scrollY.interpolate({
    inputRange: [heroHeight - 120, heroHeight - 50],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  if (isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: BG, paddingTop: insets.top }]}>
        <View style={[styles.navBar, { borderBottomColor: BORDER }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.floatingNavBtn}>
            <Ionicons name="arrow-back" size={22} color={TEXT} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: TEXT }]}>Profile Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <Skeleton width="100%" height={320} borderRadius={20} />
          <Skeleton width="60%" height={26} borderRadius={8} />
          <Skeleton width="40%" height={16} borderRadius={6} />
          <Skeleton width="100%" height={140} borderRadius={16} />
          <Skeleton width="100%" height={140} borderRadius={16} />
        </ScrollView>
      </View>
    );
  }

  if (!profile || isError) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: BG, paddingTop: insets.top }]}>
        <Ionicons name="heart-dislike-outline" size={64} color={TEXT3} />
        <Text style={[styles.notFoundTitle, { color: TEXT }]}>Profile Not Found</Text>
        <Text style={[styles.notFoundSub, { color: TEXT3 }]}>This matrimony profile may have been removed or deactivated.</Text>
        <Button
          title="Back to Matrimony"
          variant="primary"
          size="md"
          onPress={() => router.replace('/matrimony' as any)}
          style={{ marginTop: 16 }}
        />
      </View>
    );
  }

  const photos = profile.photos?.length ? profile.photos : (profile.avatarUrl ? [profile.avatarUrl] : []);

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      {/* ── Top Floating Navigation Bar ───────────────────────────────── */}
      <Animated.View style={[styles.navBar, { paddingTop: insets.top + 6, height: insets.top + 54 }]}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: SURF, opacity: navBgOpacity, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER }]} />
        <TouchableOpacity
          onPress={() => router.replace('/matrimony' as any)}
          style={styles.floatingNavBtn}
        >
          <Ionicons name="arrow-back" size={22} color={TEXT} />
        </TouchableOpacity>

        <Animated.Text style={[styles.navTitle, { color: TEXT, opacity: navBgOpacity }]} numberOfLines={1}>
          {profile.displayName}, {profile.age}
        </Animated.Text>

        <View style={styles.navRightGroup}>
          <TouchableOpacity style={styles.floatingNavBtn} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={20} color={TEXT} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(110, insets.bottom + 90) }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* ── Hero Photo Carousel ─────────────────────────────────────── */}
        <View style={[styles.heroContainer, { width: windowWidth, height: heroHeight, backgroundColor: isDark ? '#1a1a2e' : '#F3F4F6' }]}>
          {photos.length > 0 ? (
            <FlatList
              ref={heroRef}
              data={photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, i) => `${item}-${i}`}
              getItemLayout={(_data, index) => ({ length: contentWidth, offset: contentWidth * index, index })}
              onMomentumScrollEnd={(e) => setActiveIdx(Math.round(e.nativeEvent.contentOffset.x / contentWidth))}
              renderItem={({ item }) => (
                <ExpoImage
                  source={{ uri: item }}
                  style={{ width: contentWidth, height: heroHeight }}
                  contentFit="cover"
                  transition={300}
                />
              )}
            />
          ) : (
            <LinearGradient
              colors={[G + 'CC', G + '66']}
              style={[styles.emptyHero, { height: heroHeight }]}
            >
              <View style={[styles.emptyHeroIconCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name={profile.gender === 'FEMALE' ? 'woman' : 'man'} size={72} color="#FFF" />
              </View>
              <Text style={[styles.emptyHeroText, { color: 'rgba(255,255,255,0.85)' }]}>No photo available</Text>
            </LinearGradient>
          )}

          {/* Deep gradient scrim for text legibility */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.72)']}
            style={styles.heroScrim}
          />

          {/* Name + age overlaid at bottom of hero */}
          <View style={styles.heroOverlayBottom}>
            <View style={styles.heroNameRow}>
              <Text style={styles.heroName} numberOfLines={1}>
                {profile.displayName}, <Text style={{ fontWeight: '400' }}>{profile.age}</Text>
              </Text>
              {profile.isVerified && (
                <View style={styles.heroVerifiedBadge}>
                  <Ionicons name="shield-checkmark" size={14} color="#FFF" />
                </View>
              )}
            </View>
            {(profile.city || profile.state) && (
              <View style={styles.heroLocationRow}>
                <Ionicons name="location" size={13} color="rgba(255,255,255,0.85)" />
                <Text style={styles.heroLocationText}>
                  {profile.city ? `${profile.city}, ${profile.state}` : profile.state}
                </Text>
              </View>
            )}
            {/* Dots */}
            {photos.length > 1 && (
              <View style={styles.dotsRow}>
                {photos.map((_, i) => (
                  <View key={i} style={[styles.dot, { backgroundColor: i === activeIdx ? '#FFF' : 'rgba(255,255,255,0.4)', width: i === activeIdx ? 20 : 6 }]} />
                ))}
              </View>
            )}
          </View>

          {/* Photo Counter Pill top-right */}
          {photos.length > 1 && (
            <View style={[styles.photoCountPill, { top: insets.top + 10 }]}>
              <Ionicons name="camera-outline" size={13} color="#FFF" />
              <Text style={styles.photoCountText}>{activeIdx + 1}/{photos.length}</Text>
            </View>
          )}

          {/* Match Score Badge top-left */}
          {profile.matchScore != null && (
            <LinearGradient
              colors={[G, G + 'CC']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.matchScoreBadge, { top: insets.top + 10 }]}
            >
              <Ionicons name="sparkles" size={12} color="#FFF" />
              <Text style={styles.matchScoreText}>{profile.matchScore}% Match</Text>
            </LinearGradient>
          )}
        </View>

        {/* ── Photo Thumbnail Strip ────────────────────────────────────── */}
        {photos.length > 1 && (
          <View style={[styles.thumbStripContainer, { backgroundColor: SURF, borderBottomColor: BORDER }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.thumbStrip, isWide && { paddingHorizontal: (windowWidth - contentWidth) / 2 + 16 }]}>
              {photos.map((photo, i) => (
                <TouchableOpacity
                  key={`${photo}-${i}`}
                  activeOpacity={0.8}
                  onPress={() => {
                    setActiveIdx(i);
                    heroRef.current?.scrollToOffset({ offset: contentWidth * i, animated: true });
                  }}
                >
                  <ExpoImage
                    source={{ uri: photo }}
                    style={[
                      styles.thumbImg,
                      {
                        borderColor: i === activeIdx ? G : BORDER,
                        borderWidth: i === activeIdx ? 2.5 : 1,
                      },
                    ]}
                    contentFit="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Masthead Identity Card ──────────────────────────────────── */}
        <View style={[styles.contentCard, { backgroundColor: SURF, borderColor: BORDER, marginTop: 14, marginHorizontal: isWide ? (windowWidth - contentWidth) / 2 + 16 : 16 }]}>
          {/* Quick-glance highlight pills — single scrollable row */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.keyHighlightsRow}>
            {profile.height ? (
              <View style={[styles.highlightPill, { backgroundColor: G + '12', borderColor: G + '30', borderWidth: 1 }]}>
                <Ionicons name="resize-outline" size={13} color={G} />
                <Text style={[styles.highlightPillText, { color: G }]}>{profile.height}</Text>
              </View>
            ) : null}
            {profile.occupation ? (
              <View style={[styles.highlightPill, { backgroundColor: '#3B82F612', borderColor: '#3B82F630', borderWidth: 1, maxWidth: 160 }]}>
                <Ionicons name="briefcase-outline" size={13} color="#3B82F6" />
                <Text style={[styles.highlightPillText, { color: '#3B82F6' }]} numberOfLines={1}>{profile.occupation}</Text>
              </View>
            ) : null}
            {profile.maritalStatus ? (
              <View style={[styles.highlightPill, { backgroundColor: '#EC489912', borderColor: '#EC489930', borderWidth: 1 }]}>
                <Ionicons name="heart-outline" size={13} color="#EC4899" />
                <Text style={[styles.highlightPillText, { color: '#EC4899' }]} numberOfLines={1}>{MARITAL_STATUS_LABELS[profile.maritalStatus] || profile.maritalStatus}</Text>
              </View>
            ) : null}
            {profile.motherTongue ? (
              <View style={[styles.highlightPill, { backgroundColor: '#F59E0B12', borderColor: '#F59E0B30', borderWidth: 1 }]}>
                <Ionicons name="language-outline" size={13} color="#F59E0B" />
                <Text style={[styles.highlightPillText, { color: '#F59E0B' }]} numberOfLines={1}>{profile.motherTongue}</Text>
              </View>
            ) : null}
          </ScrollView>

          {/* About Me */}
          {profile.aboutMe ? (
            <View style={[styles.aboutMeBox, { backgroundColor: isDark ? G + '10' : G + '08', borderColor: G + '25' }]}>
              <Text style={[styles.aboutMeLabel, { color: G }]}>About Me</Text>
              <Text style={[styles.aboutMeText, { color: TEXT2 }]}>{profile.aboutMe}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Section: Personal & Cultural Background ─────────────────── */}
        <View style={[styles.contentCard, { backgroundColor: SURF, borderColor: BORDER, marginHorizontal: isWide ? (windowWidth - contentWidth) / 2 + 16 : 16 }]}>
          <View style={styles.sectionHeaderRow}>
            <LinearGradient colors={[G, G + 'AA']} style={styles.sectionIconCircle}>
              <Ionicons name="person-outline" size={17} color="#FFF" />
            </LinearGradient>
            <Text style={[styles.sectionHeading, { color: TEXT }]}>Personal & Background</Text>
          </View>

          <DetailGridRow icon="calendar-outline" label="Age" value={`${profile.age} Years`} />
          <DetailGridRow icon="resize-outline" label="Height" value={profile.height || 'Not specified'} />
          <DetailGridRow icon="heart-outline" label="Marital Status" value={MARITAL_STATUS_LABELS[profile.maritalStatus] || profile.maritalStatus} />
          <DetailGridRow icon="water-outline" label="Blood Group" value={profile.bloodGroup} />
          <DetailGridRow icon="restaurant-outline" label="Eating Habits" value={profile.eatingHabits} />
          <DetailGridRow icon="accessibility-outline" label="Disability" value={profile.disability} />
          <DetailGridRow icon="prism-outline" label="Religion" value={profile.religion || 'Hindu'} />
          {profile.caste ? <DetailGridRow icon="layers-outline" label="Caste" value={profile.caste} /> : null}
          <DetailGridRow icon="language-outline" label="Mother Tongue" value={profile.motherTongue || 'Kannada'} />
        </View>

        {/* ── Section: Education & Career ─────────────────────────────── */}
        <View style={[styles.contentCard, { backgroundColor: SURF, borderColor: BORDER, marginHorizontal: isWide ? (windowWidth - contentWidth) / 2 + 16 : 16 }]}>
          <View style={styles.sectionHeaderRow}>
            <LinearGradient colors={['#3B82F6', '#60A5FA']} style={styles.sectionIconCircle}>
              <Ionicons name="school-outline" size={17} color="#FFF" />
            </LinearGradient>
            <Text style={[styles.sectionHeading, { color: TEXT }]}>Education & Career</Text>
          </View>

          <DetailGridRow icon="school-outline" label="Education" value={EDUCATION_LABELS[profile.education] ?? profile.education} />
          {profile.educationDetails ? <DetailGridRow icon="document-text-outline" label="Field / Degree" value={profile.educationDetails} /> : null}
          {profile.educationField ? <DetailGridRow icon="book-outline" label="Education Field" value={profile.educationField} /> : null}
          <DetailGridRow icon="briefcase-outline" label="Occupation" value={profile.occupation || 'Not specified'} />
          {profile.designation ? <DetailGridRow icon="ribbon-outline" label="Designation" value={profile.designation} /> : null}
          {profile.workingWith ? <DetailGridRow icon="business-outline" label="Working With" value={profile.workingWith} /> : null}
          {profile.workLocation ? <DetailGridRow icon="location-outline" label="Work Location" value={profile.workLocation} /> : null}
          {profile.annualIncome ? <DetailGridRow icon="cash-outline" label="Annual Income" value={profile.annualIncome} /> : null}
        </View>

        {/* ── Section: Family Details ─────────────────────────────────── */}
        {(profile.familyType || profile.familyValue || profile.familyLocation || profile.fatherName || profile.fatherOccupation || profile.motherName || profile.motherOccupation || profile.brothers != null || profile.sisters != null || profile.ancestralOrigin) ? (
          <View style={[styles.contentCard, { backgroundColor: SURF, borderColor: BORDER, marginHorizontal: isWide ? (windowWidth - contentWidth) / 2 + 16 : 16 }]}>
            <View style={styles.sectionHeaderRow}>
              <LinearGradient colors={['#8B5CF6', '#A78BFA']} style={styles.sectionIconCircle}>
                <Ionicons name="people-outline" size={17} color="#FFF" />
              </LinearGradient>
              <Text style={[styles.sectionHeading, { color: TEXT }]}>Family Details</Text>
            </View>

            {profile.familyType ? <DetailGridRow icon="home-outline" label="Family Type" value={profile.familyType} /> : null}
            {profile.familyValue ? <DetailGridRow icon="heart-outline" label="Family Values" value={profile.familyValue} /> : null}
            {profile.familyLocation ? <DetailGridRow icon="location-outline" label="Family Location" value={profile.familyLocation} /> : null}
            {profile.ancestralOrigin ? <DetailGridRow icon="map-outline" label="Ancestral Origin" value={profile.ancestralOrigin} /> : null}
            {profile.fatherName ? <DetailGridRow icon="man-outline" label="Father's Name" value={profile.fatherName} /> : null}
            {profile.fatherStatus ? <DetailGridRow icon="man-outline" label="Father's Status" value={profile.fatherStatus} /> : null}
            {profile.fatherOccupation ? <DetailGridRow icon="briefcase-outline" label="Father's Profession" value={profile.fatherOccupation} /> : null}
            {profile.motherName ? <DetailGridRow icon="woman-outline" label="Mother's Name" value={profile.motherName} /> : null}
            {profile.motherStatus ? <DetailGridRow icon="woman-outline" label="Mother's Status" value={profile.motherStatus} /> : null}
            {profile.motherOccupation ? <DetailGridRow icon="briefcase-outline" label="Mother's Profession" value={profile.motherOccupation} /> : null}
            {profile.brothers != null ? <DetailGridRow icon="people-outline" label="Brothers" value={`${profile.brothers} (${profile.brothersMarried ?? 0} married)`} /> : null}
            {profile.sisters != null ? <DetailGridRow icon="people-outline" label="Sisters" value={`${profile.sisters} (${profile.sistersMarried ?? 0} married)`} /> : null}
          </View>
        ) : null}

        {/* ── Section: Lifestyle & Hobbies ────────────────────────────── */}
        {(profile.diet || profile.hobbies?.length) ? (
          <View style={[styles.contentCard, { backgroundColor: SURF, borderColor: BORDER, marginHorizontal: isWide ? (windowWidth - contentWidth) / 2 + 16 : 16 }]}>
            <View style={styles.sectionHeaderRow}>
              <LinearGradient colors={['#F59E0B', '#FBBF24']} style={styles.sectionIconCircle}>
                <Ionicons name="sparkles-outline" size={17} color="#FFF" />
              </LinearGradient>
              <Text style={[styles.sectionHeading, { color: TEXT }]}>Lifestyle & Interests</Text>
            </View>

            {profile.diet ? <DetailGridRow icon="restaurant-outline" label="Diet Preference" value={profile.diet} /> : null}

            {profile.hobbies?.length ? (
              <View style={{ marginTop: 6 }}>
                <Text style={[styles.hobbiesSectionLabel, { color: TEXT3 }]}>Hobbies & Passions</Text>
                <View style={styles.hobbiesWrap}>
                  {profile.hobbies.map((h, i) => (
                    <View key={i} style={[styles.hobbyChip, { backgroundColor: G + '12' }]}>
                      <Text style={[styles.hobbyText, { color: G }]}>{h}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ── Section: Partner Preferences ────────────────────────────── */}
        {(profile.partnerMinAge || profile.partnerReligion || profile.partnerCaste || profile.partnerEducation || profile.partnerCity) ? (
          <View style={[styles.contentCard, { backgroundColor: SURF, borderColor: BORDER, marginHorizontal: isWide ? (windowWidth - contentWidth) / 2 + 16 : 16 }]}>
            <View style={styles.sectionHeaderRow}>
              <LinearGradient colors={['#EC4899', '#F472B6']} style={styles.sectionIconCircle}>
                <Ionicons name="heart-half-outline" size={17} color="#FFF" />
              </LinearGradient>
              <Text style={[styles.sectionHeading, { color: TEXT }]}>Partner Preferences</Text>
            </View>

            {(profile.partnerMinAge || profile.partnerMaxAge) ? (
              <DetailGridRow icon="calendar-outline" label="Preferred Age" value={`${profile.partnerMinAge ?? 'Any'} – ${profile.partnerMaxAge ?? 'Any'} Yrs`} />
            ) : null}
            {profile.partnerReligion ? <DetailGridRow icon="prism-outline" label="Preferred Religion" value={profile.partnerReligion} /> : null}
            {profile.partnerCaste ? <DetailGridRow icon="layers-outline" label="Preferred Caste" value={profile.partnerCaste} /> : null}
            {profile.partnerEducation ? <DetailGridRow icon="school-outline" label="Preferred Education" value={profile.partnerEducation} /> : null}
            {profile.partnerCity ? <DetailGridRow icon="location-outline" label="Preferred Location" value={profile.partnerCity} /> : null}
          </View>
        ) : null}

        {/* ── Section: Astrology ─────────────────────────────────────────── */}
        {(profile.raashi || profile.nakshathra || profile.gotra || profile.dosham || profile.gana || profile.bali || profile.birthTime || profile.placeOfBirth) ? (
          <View style={[styles.contentCard, { backgroundColor: SURF, borderColor: BORDER, marginHorizontal: isWide ? (windowWidth - contentWidth) / 2 + 16 : 16 }]}>
            <View style={styles.sectionHeaderRow}>
              <LinearGradient colors={['#F59E0B', '#FBBF24']} style={styles.sectionIconCircle}>
                <Ionicons name="star-outline" size={17} color="#FFF" />
              </LinearGradient>
              <Text style={[styles.sectionHeading, { color: TEXT }]}>Astrology & Horoscope</Text>
            </View>
            {profile.birthTime ? <DetailGridRow icon="time-outline" label="Birth Time" value={profile.birthTime} /> : null}
            {profile.placeOfBirth ? <DetailGridRow icon="location-outline" label="Place of Birth" value={profile.placeOfBirth} /> : null}
            {profile.raashi ? <DetailGridRow icon="planet-outline" label="Raashi" value={profile.raashi} /> : null}
            {profile.nakshathra ? <DetailGridRow icon="sparkles-outline" label="Nakshathra" value={profile.nakshathra} /> : null}
            {profile.gana ? <DetailGridRow icon="prism-outline" label="Gana" value={profile.gana} /> : null}
            {profile.gotra ? <DetailGridRow icon="git-branch-outline" label="Gotra" value={profile.gotra} /> : null}
            {profile.dosham ? <DetailGridRow icon="warning-outline" label="Dosham" value={profile.dosham} /> : null}
            {profile.bali ? <DetailGridRow icon="checkmark-circle-outline" label="Bali" value={profile.bali} /> : null}
          </View>
        ) : null}
      </ScrollView>

      {/* ── Sticky Bottom Action Bar ──────────────────────────────────── */}
      <View style={[styles.bottomBar, { backgroundColor: SURF, borderTopColor: BORDER, paddingBottom: Math.max(20, insets.bottom + 10), paddingHorizontal: isWide ? (windowWidth - contentWidth) / 2 + 16 : 16 }]}>
        {isOwnProfile ? (
          <View style={styles.bottomBarActionsRow}>
            <TouchableOpacity
              style={[styles.actionBtnPrimary, { flex: 1, overflow: 'hidden' }]}
              onPress={() => router.push('/matrimony/create-profile' as any)}
              activeOpacity={0.85}
            >
              <LinearGradient colors={[G, G + 'CC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
              <Ionicons name="create-outline" size={18} color="#FFF" />
              <Text style={styles.actionBtnPrimaryText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtnOutline, { borderColor: '#EF4444' }]}
              onPress={handleDelete}
              activeOpacity={0.85}
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.bottomBarActionsRow}>
            <TouchableOpacity
              style={[
                styles.actionBtnOutline,
                {
                  borderColor: hasLiked ? '#EF4444' : BORDER,
                  backgroundColor: hasLiked ? '#FEF2F2' : (isDark ? '#1F2937' : '#F9FAFB'),
                },
              ]}
              onPress={handleLike}
              disabled={likeMutation.isPending || hasLiked}
              activeOpacity={0.8}
            >
              {likeMutation.isPending ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <Ionicons
                  name={hasLiked ? 'heart' : 'heart-outline'}
                  size={22}
                  color={hasLiked ? '#EF4444' : TEXT2}
                />
              )}
            </TouchableOpacity>

            {profile.hasExpressedInterest ? (
              <View style={[styles.actionBtnSent, { backgroundColor: isDark ? '#1F2937' : '#F0FDF4', borderColor: G, flex: 1 }]}>
                <Ionicons name="checkmark-circle" size={18} color={G} />
                <Text style={[styles.actionBtnSentText, { color: G }]}>Interest Sent</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.actionBtnPrimary, { flex: 1, overflow: 'hidden' }]}
                onPress={() => setShowModal(true)}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[G, G + 'BB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                <Ionicons name="mail-outline" size={18} color="#FFF" />
                <Text style={styles.actionBtnPrimaryText}>Send Interest 💌</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* ── Delete Profile Modal ─────────────────────────────────────── */}
      <Modal visible={showDeleteModal} transparent animationType="slide" onRequestClose={() => setShowDeleteModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowDeleteModal(false)}>
          <View style={[styles.modalSheet, { backgroundColor: SURF, maxWidth: 560, width: '100%', alignSelf: 'center' }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeaderRow}>
              <View style={[styles.modalIconCircle, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: TEXT }]}>Delete Profile</Text>
                <Text style={[styles.modalSub, { color: TEXT2 }]}>This cannot be undone. Please tell us why.</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDeleteModal(false)} style={[styles.modalCloseBtn, { backgroundColor: isDark ? '#27272A' : '#F3F4F6' }]}>
                <Ionicons name="close" size={18} color={TEXT2} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.quickSuggestLabel, { color: TEXT3 }]}>Reason for deleting</Text>
            <View style={{ gap: 7, marginBottom: 14 }}>
              {DELETE_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.quickMessagePill,
                    {
                      backgroundColor: deleteReason === reason ? '#FEE2E2' : (isDark ? '#1F2937' : '#F9FAFB'),
                      borderColor: deleteReason === reason ? '#EF4444' : BORDER,
                    },
                  ]}
                  onPress={() => setDeleteReason(reason)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={deleteReason === reason ? 'radio-button-on' : 'radio-button-off'}
                    size={16}
                    color={deleteReason === reason ? '#EF4444' : TEXT3}
                  />
                  <Text style={[styles.quickMessageText, { color: deleteReason === reason ? '#EF4444' : TEXT2 }]}>{reason}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {deleteReason === 'Other' && (
              <TextInput
                style={[styles.messageInput, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: BORDER, color: TEXT }]}
                value={deleteReasonOther}
                onChangeText={setDeleteReasonOther}
                placeholder="Please describe your reason..."
                placeholderTextColor={TEXT3}
                multiline
                numberOfLines={3}
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: BORDER, backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: TEXT2 }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtnPrimary, { flex: 1.5, overflow: 'hidden', backgroundColor: '#EF4444' }]}
                onPress={handleConfirmDelete}
                disabled={deletingProfile}
                activeOpacity={0.85}
              >
                {deletingProfile
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <><Ionicons name="trash-outline" size={16} color="#FFF" /><Text style={styles.actionBtnPrimaryText}>Delete Profile</Text></>
                }
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Express Interest Bottom Sheet Modal ───────────────────────── */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowModal(false)}>
          <View style={[styles.modalSheet, { backgroundColor: SURF, maxWidth: 560, width: '100%', alignSelf: 'center' }]}>
            <View style={styles.sheetHandle} />

            {/* Header row */}
            <View style={styles.modalHeaderRow}>
              <View style={[styles.modalIconCircle, { backgroundColor: G + '15' }]}>
                <Ionicons name="mail-outline" size={20} color={G} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: TEXT }]}>Express Interest</Text>
                <Text style={[styles.modalSub, { color: TEXT2 }]}>Send a note to {profile.displayName}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowModal(false)} style={[styles.modalCloseBtn, { backgroundColor: isDark ? '#27272A' : '#F3F4F6' }]}>
                <Ionicons name="close" size={18} color={TEXT2} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.quickSuggestLabel, { color: TEXT3 }]}>Quick messages</Text>
            <View style={styles.quickSuggestionsWrap}>
              {QUICK_MESSAGES.map((msg, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.quickMessagePill,
                    {
                      backgroundColor: message === msg ? G + '12' : (isDark ? '#1F2937' : '#F9FAFB'),
                      borderColor: message === msg ? G : BORDER,
                    },
                  ]}
                  onPress={() => setMessage(msg)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chatbubble-outline" size={12} color={message === msg ? G : TEXT3} />
                  <Text style={[styles.quickMessageText, { color: message === msg ? G : TEXT2 }]} numberOfLines={2}>{msg}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.messageInput, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: BORDER, color: TEXT }]}
              value={message}
              onChangeText={setMessage}
              placeholder="Or write a custom message..."
              placeholderTextColor={TEXT3}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: BORDER, backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}
                onPress={() => setShowModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: TEXT2 }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtnPrimary, { flex: 1.5, overflow: 'hidden' }]}
                onPress={handleSendInterest}
                disabled={expressInterest.isPending}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[G, G + 'BB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                {expressInterest.isPending
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <><Ionicons name="send" size={16} color="#FFF" /><Text style={styles.actionBtnPrimaryText}>Send Interest</Text></>
                }
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ── Reusable Component for Info Rows ─────────────────────────────────────────
function DetailGridRow({ icon, label, value }: { icon: string; label: string; value?: string | null }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.detailRow, { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
        <Ionicons name={icon as any} size={15} color={colors.textMuted} />
        <Text style={[styles.detailRowLabel, { color: colors.textSecondary }]}>{label}</Text>
      </View>
      <Text style={[styles.detailRowValue, { color: colors.text }]} numberOfLines={1}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },

  // Top App Bar
  navBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  floatingNavBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  navTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginHorizontal: 10,
  },
  navRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Hero Carousel
  heroContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  heroScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '65%',
  },
  heroOverlayBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingBottom: 18,
    gap: 6,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -0.5,
    flex: 1,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroVerifiedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroLocationText: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    fontWeight: '500',
  },
  emptyHero: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyHeroIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHeroText: {
    fontSize: 14,
    fontWeight: '600',
  },
  photoCountPill: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 14,
  },
  photoCountText: {
    color: '#FFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  matchScoreBadge: {
    position: 'absolute',
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 14,
  },
  matchScoreText: {
    color: '#FFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },

  // Thumbnails
  thumbStripContainer: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumbStrip: {
    paddingHorizontal: 16,
    gap: 8,
  },
  thumbImg: {
    width: 54,
    height: 54,
    borderRadius: 10,
  },

  // Content Cards
  contentCard: {
    marginBottom: 12,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    gap: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  nameHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  profileNameTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    flex: 1,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedPillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  keyHighlightsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  highlightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  highlightPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  aboutMeBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  aboutMeLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  aboutMeText: {
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: '400',
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  // Detail Row
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    gap: 10,
  },
  detailRowLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  detailRowValue: {
    fontSize: 13.5,
    fontWeight: '700',
    textAlign: 'right',
    flex: 1,
    flexShrink: 1,
  },

  // Hobbies
  hobbiesSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  hobbiesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  hobbyChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  hobbyText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Sticky Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
    zIndex: 50,
  },
  bottomBarActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 14,
    paddingHorizontal: 20,
    ...Platform.select({
      ios: { shadowColor: '#2D6A2D', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },
  actionBtnPrimaryText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  actionBtnOutline: {
    width: 50,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnSent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 20,
  },
  actionBtnSentText: {
    fontSize: 15,
    fontWeight: '700',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 22,
    paddingBottom: Platform.OS === 'ios' ? 44 : 30,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.12)',
    alignSelf: 'center',
    marginBottom: 18,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  modalIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  modalSub: {
    fontSize: 12.5,
    marginTop: 2,
    lineHeight: 17,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickSuggestLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  quickSuggestionsWrap: {
    gap: 7,
    marginBottom: 14,
  },
  quickMessagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickMessageText: {
    fontSize: 12.5,
    fontWeight: '500',
    flex: 1,
    lineHeight: 17,
  },
  messageInput: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 13,
    fontSize: 14,
    minHeight: 84,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 14.5,
    fontWeight: '600',
  },

  // Not Found
  notFoundTitle: { fontSize: 20, fontWeight: '800', marginTop: 14 },
  notFoundSub: { fontSize: 14, textAlign: 'center', marginTop: 4 },
});
