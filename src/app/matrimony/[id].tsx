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
import { useConfirmStore } from '../../store/confirmStore';
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
  const { data: profile, isLoading } = useMatrimonyProfileQuery(safeId);
  const expressInterest = useExpressInterestMutation();
  const likeMutation = useLikeProfileMutation();

  const [hasLiked, setHasLiked] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const heroRef = useRef<FlatList>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  const heroHeight = Math.min(480, Math.round(windowWidth * 1.15));

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

  const handleDelete = async () => {
    const ok = await useConfirmStore.getState().confirm({
      title: 'Delete profile?',
      message: 'This action cannot be undone and will permanently delete your matrimony profile.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDestructive: true,
      icon: 'trash-outline',
    });
    if (!ok) return;

    try {
      await apiClient.delete(`/matrimony/profiles/${safeId}`);
      router.replace('/matrimony' as any);
    } catch (e: any) {
      showToast(e.response?.data?.message ?? 'Failed to delete profile', 'error');
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

  if (!profile) {
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
          onPress={() => router.canGoBack() ? router.back() : router.replace('/matrimony' as any)}
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
        <View style={[styles.heroContainer, { width: windowWidth, height: heroHeight, backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}>
          {photos.length > 0 ? (
            <FlatList
              ref={heroRef}
              data={photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, i) => `${item}-${i}`}
              onMomentumScrollEnd={(e) => setActiveIdx(Math.round(e.nativeEvent.contentOffset.x / windowWidth))}
              renderItem={({ item }) => (
                <ExpoImage
                  source={{ uri: item }}
                  style={{ width: windowWidth, height: heroHeight }}
                  contentFit="cover"
                  transition={200}
                />
              )}
            />
          ) : (
            <View style={[styles.emptyHero, { height: heroHeight }]}>
              <View style={[styles.emptyHeroIconCircle, { backgroundColor: G + '14' }]}>
                <Ionicons name={profile.gender === 'FEMALE' ? 'woman' : 'man'} size={68} color={G} />
              </View>
              <Text style={[styles.emptyHeroText, { color: TEXT2 }]}>No photo available</Text>
            </View>
          )}

          {/* Scrim overlay */}
          <View style={styles.heroScrim} />

          {/* Photo Counter Pill top-right */}
          {photos.length > 1 && (
            <View style={styles.photoCountPill}>
              <Ionicons name="camera-outline" size={13} color="#FFF" />
              <Text style={styles.photoCountText}>{activeIdx + 1}/{photos.length}</Text>
            </View>
          )}

          {/* Match Score Badge top-left */}
          {profile.matchScore != null && (
            <View style={[styles.matchScoreBadge, { backgroundColor: G }]}>
              <Ionicons name="sparkles" size={12} color="#FFF" />
              <Text style={styles.matchScoreText}>{profile.matchScore}% Match</Text>
            </View>
          )}

          {/* Carousel Dots */}
          {photos.length > 1 && (
            <View style={styles.dotsRow}>
              {photos.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: i === activeIdx ? '#FFF' : 'rgba(255,255,255,0.45)',
                      width: i === activeIdx ? 18 : 6,
                    },
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* ── Photo Thumbnail Strip ────────────────────────────────────── */}
        {photos.length > 1 && (
          <View style={[styles.thumbStripContainer, { backgroundColor: SURF, borderBottomColor: BORDER }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbStrip}>
              {photos.map((photo, i) => (
                <TouchableOpacity
                  key={`${photo}-${i}`}
                  activeOpacity={0.8}
                  onPress={() => {
                    setActiveIdx(i);
                    heroRef.current?.scrollToIndex({ index: i, animated: true });
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
        <View style={[styles.contentCard, { backgroundColor: SURF, borderColor: BORDER, marginTop: 14 }]}>
          <View style={styles.nameHeaderRow}>
            <Text style={[styles.profileNameTitle, { color: TEXT }]} numberOfLines={1}>
              {profile.displayName}, <Text style={{ fontWeight: '500' }}>{profile.age}</Text>
            </Text>
            {profile.isVerified ? (
              <View style={[styles.verifiedPill, { backgroundColor: G + '15' }]}>
                <Ionicons name="shield-checkmark" size={13} color={G} />
                <Text style={[styles.verifiedPillText, { color: G }]}>Verified</Text>
              </View>
            ) : null}
          </View>

          {/* Location & Key Highlights Pills */}
          <View style={styles.keyHighlightsRow}>
            <View style={[styles.highlightPill, { backgroundColor: isDark ? '#27272A' : '#F4F4F5' }]}>
              <Ionicons name="location-outline" size={13} color={TEXT2} />
              <Text style={[styles.highlightPillText, { color: TEXT2 }]}>
                {profile.city ? `${profile.city}, ${profile.state}` : (profile.state || 'Location TBA')}
              </Text>
            </View>

            {profile.height ? (
              <View style={[styles.highlightPill, { backgroundColor: isDark ? '#27272A' : '#F4F4F5' }]}>
                <Ionicons name="resize-outline" size={13} color={TEXT2} />
                <Text style={[styles.highlightPillText, { color: TEXT2 }]}>{profile.height}</Text>
              </View>
            ) : null}

            {profile.occupation ? (
              <View style={[styles.highlightPill, { backgroundColor: isDark ? '#27272A' : '#F4F4F5' }]}>
                <Ionicons name="briefcase-outline" size={13} color={TEXT2} />
                <Text style={[styles.highlightPillText, { color: TEXT2 }]} numberOfLines={1}>{profile.occupation}</Text>
              </View>
            ) : null}
          </View>

          {/* About Me Callout */}
          {profile.aboutMe ? (
            <View style={[styles.aboutMeBox, { backgroundColor: isDark ? '#27272A50' : '#F9FAF8', borderColor: BORDER }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={G} style={{ marginBottom: 4 }} />
              <Text style={[styles.aboutMeText, { color: TEXT2 }]}>{profile.aboutMe}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Section: Personal & Cultural Background ─────────────────── */}
        <View style={[styles.contentCard, { backgroundColor: SURF, borderColor: BORDER }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconCircle, { backgroundColor: G + '14' }]}>
              <Ionicons name="person-outline" size={17} color={G} />
            </View>
            <Text style={[styles.sectionHeading, { color: TEXT }]}>Personal & Background</Text>
          </View>

          <DetailGridRow icon="calendar-outline" label="Age" value={`${profile.age} Years`} />
          <DetailGridRow icon="resize-outline" label="Height" value={profile.height || 'Not specified'} />
          <DetailGridRow icon="heart-outline" label="Marital Status" value={MARITAL_STATUS_LABELS[profile.maritalStatus] || profile.maritalStatus} />
          <DetailGridRow icon="prism-outline" label="Religion" value={profile.religion || 'Hindu'} />
          {profile.caste ? <DetailGridRow icon="layers-outline" label="Caste" value={profile.caste} /> : null}
          <DetailGridRow icon="language-outline" label="Mother Tongue" value={profile.motherTongue || 'Kannada'} />
        </View>

        {/* ── Section: Education & Career ─────────────────────────────── */}
        <View style={[styles.contentCard, { backgroundColor: SURF, borderColor: BORDER }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconCircle, { backgroundColor: '#3B82F614' }]}>
              <Ionicons name="school-outline" size={17} color="#3B82F6" />
            </View>
            <Text style={[styles.sectionHeading, { color: TEXT }]}>Education & Career</Text>
          </View>

          <DetailGridRow icon="school-outline" label="Education" value={EDUCATION_LABELS[profile.education] ?? profile.education} />
          {profile.educationDetails ? <DetailGridRow icon="document-text-outline" label="Field / Degree" value={profile.educationDetails} /> : null}
          <DetailGridRow icon="briefcase-outline" label="Occupation" value={profile.occupation || 'Not specified'} />
          {profile.annualIncome ? <DetailGridRow icon="cash-outline" label="Annual Income" value={profile.annualIncome} /> : null}
        </View>

        {/* ── Section: Family Details ─────────────────────────────────── */}
        {(profile.familyType || profile.fatherOccupation || profile.motherOccupation || profile.siblings != null) ? (
          <View style={[styles.contentCard, { backgroundColor: SURF, borderColor: BORDER }]}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconCircle, { backgroundColor: '#8B5CF614' }]}>
                <Ionicons name="people-outline" size={17} color="#8B5CF6" />
              </View>
              <Text style={[styles.sectionHeading, { color: TEXT }]}>Family Details</Text>
            </View>

            {profile.familyType ? <DetailGridRow icon="home-outline" label="Family Type" value={profile.familyType} /> : null}
            {profile.fatherOccupation ? <DetailGridRow icon="man-outline" label="Father's Profession" value={profile.fatherOccupation} /> : null}
            {profile.motherOccupation ? <DetailGridRow icon="woman-outline" label="Mother's Profession" value={profile.motherOccupation} /> : null}
            {profile.siblings != null ? <DetailGridRow icon="people-outline" label="Siblings" value={String(profile.siblings)} /> : null}
          </View>
        ) : null}

        {/* ── Section: Lifestyle & Hobbies ────────────────────────────── */}
        {(profile.diet || profile.hobbies?.length) ? (
          <View style={[styles.contentCard, { backgroundColor: SURF, borderColor: BORDER }]}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconCircle, { backgroundColor: '#F59E0B14' }]}>
                <Ionicons name="sparkles-outline" size={17} color="#F59E0B" />
              </View>
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
          <View style={[styles.contentCard, { backgroundColor: SURF, borderColor: BORDER }]}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconCircle, { backgroundColor: '#EC489914' }]}>
                <Ionicons name="heart-half-outline" size={17} color="#EC4899" />
              </View>
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
      </ScrollView>

      {/* ── Sticky Bottom Action Bar ──────────────────────────────────── */}
      <View style={[styles.bottomBar, { backgroundColor: SURF, borderTopColor: BORDER, paddingBottom: Math.max(16, insets.bottom + 8) }]}>
        {isOwnProfile ? (
          <View style={styles.bottomBarActionsRow}>
            <Button
              title="Edit Profile"
              icon="create-outline"
              variant="primary"
              size="lg"
              onPress={() => router.push('/matrimony/create-profile' as any)}
              style={{ flex: 1 }}
            />
            <Button
              title="Delete"
              icon="trash-outline"
              variant="destructive"
              size="lg"
              onPress={handleDelete}
            />
          </View>
        ) : (
          <View style={styles.bottomBarActionsRow}>
            {/* Like Heart Button */}
            <TouchableOpacity
              style={[
                styles.bottomLikeBtn,
                {
                  borderColor: hasLiked ? '#EF4444' : BORDER,
                  backgroundColor: hasLiked ? '#EF444415' : (isDark ? '#27272A' : '#F4F4F5'),
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
                  size={24}
                  color={hasLiked ? '#EF4444' : TEXT2}
                />
              )}
            </TouchableOpacity>

            {/* Express Interest Button */}
            <View style={{ flex: 1 }}>
              {profile.hasExpressedInterest ? (
                <Button
                  title="Interest Sent ✓"
                  icon="checkmark-circle"
                  variant="secondary"
                  size="lg"
                  disabled
                />
              ) : (
                <Button
                  title="Send Interest 💌"
                  icon="mail-outline"
                  variant="primary"
                  size="lg"
                  onPress={() => setShowModal(true)}
                />
              )}
            </View>
          </View>
        )}
      </View>

      {/* ── Express Interest Bottom Sheet Modal ───────────────────────── */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <View style={[styles.modalSheet, { backgroundColor: SURF }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.modalTitle, { color: TEXT }]}>Express Interest 💌</Text>
            <Text style={[styles.modalSub, { color: TEXT2 }]}>
              Send a personalized interest note to {profile.displayName}.
            </Text>

            {/* Quick Icebreaker Suggestions */}
            <View style={styles.quickSuggestionsWrap}>
              {QUICK_MESSAGES.map((msg, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.quickMessagePill, { backgroundColor: isDark ? '#27272A' : '#F4F4F5', borderColor: BORDER }]}
                  onPress={() => setMessage(msg)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.quickMessageText, { color: TEXT2 }]}>"{msg}"</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[
                styles.messageInput,
                {
                  backgroundColor: isDark ? '#27272A' : '#F9FAF8',
                  borderColor: BORDER,
                  color: TEXT,
                },
              ]}
              value={message}
              onChangeText={setMessage}
              placeholder="Write a custom message..."
              placeholderTextColor={TEXT3}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="secondary"
                size="md"
                onPress={() => setShowModal(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Send Interest"
                icon="send"
                variant="primary"
                size="md"
                loading={expressInterest.isPending}
                onPress={handleSendInterest}
                style={{ flex: 1.5 }}
              />
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
    height: 80,
    backgroundColor: 'rgba(0,0,0,0.18)',
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
    top: Platform.OS === 'ios' ? 56 : 46,
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
    top: Platform.OS === 'ios' ? 56 : 46,
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
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
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
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
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
    flexWrap: 'wrap',
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
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
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
    paddingHorizontal: 16,
    paddingTop: 12,
    zIndex: 50,
  },
  bottomBarActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bottomLikeBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    marginBottom: 14,
    lineHeight: 18,
  },
  quickSuggestionsWrap: {
    gap: 6,
    marginBottom: 12,
  },
  quickMessagePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickMessageText: {
    fontSize: 12,
    fontWeight: '500',
  },
  messageInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  // Not Found
  notFoundTitle: { fontSize: 20, fontWeight: '800', marginTop: 14 },
  notFoundSub: { fontSize: 14, textAlign: 'center', marginTop: 4 },
});
