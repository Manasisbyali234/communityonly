import React, { useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Animated,
  Alert,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { useToastStore } from '../../../store/toastStore';
import { useUserQuery, useUserPostsQuery } from '../../../api/feed';
import PostCard from '../../../components/feed/PostCard';
import CommentSheet from '../../../components/feed/CommentSheet';
import ForwardSheet from '../../../components/feed/ForwardSheet';
import Skeleton from '../../../components/feedback/Skeleton';
import Button from '../../../components/common/Button';
import Avatar from '../../../components/common/Avatar';
import { useAuthStore } from '../../../store/authStore';
import { useConnectionStatusQuery, useSendConnectionRequestMutation } from '../../../api/connections';
import { shareUrl } from '../../../utils/shareUtils';
import { Share } from 'react-native';

const { width: SW } = Dimensions.get('window');
const COVER_HEIGHT = 175;

type ProfileTab = 'posts' | 'about';
const TABS: { id: ProfileTab; label: string; icon: string }[] = [
  { id: 'posts', label: 'Posts', icon: 'grid-outline' },
  { id: 'about', label: 'About', icon: 'person-outline' },
];

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [bioExpanded, setBioExpanded] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [commentSheetVisible, setCommentSheetVisible] = useState(false);
  const [selectedForwardPostId, setSelectedForwardPostId] = useState<string | null>(null);
  const [forwardSheetVisible, setForwardSheetVisible] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const showToast = useToastStore((state) => state.showToast);

  const { data: user, isLoading: userLoading } = useUserQuery(id);
  const { data: userPosts = [], isLoading: postsLoading } = useUserPostsQuery(id);
  const currentUser = useAuthStore((s) => s.user);
  const isOwnProfile = currentUser?.id === user?.id;
  const { data: connStatus = 'NONE' } = useConnectionStatusQuery(id, currentUser?.id);
  const sendRequest = useSendConnectionRequestMutation();

  const handleConnect = () => {
    if (connStatus !== 'NONE' || sendRequest.isPending) return;
    sendRequest.mutate(id, {
      onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to send request', 'error'),
    });
  };

  const handleShare = useCallback(async () => {
    if (!user) return;
    const base = Platform.OS === 'web' && typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}` : '';
    const link = `${base}/user/${user.id}`;
    const ok = await shareUrl(`Check out ${user.displayName}'s profile on GowdaCommunity! ${link}`, link);
    showToast(ok ? 'Link copied to clipboard!' : 'Could not share profile', ok ? 'success' : 'error');
  }, [user, showToast]);

  const G = colors.primary;
  const BG = colors.background;
  const SURF = colors.surface;
  const BORDER = colors.border;
  const TEXT = colors.text;
  const TEXT2 = colors.textSecondary;
  const TEXT3 = colors.textMuted;

  const navBgOpacity = scrollY.interpolate({
    inputRange: [80, 140],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  if (userLoading) {
    return (
      <View style={[styles.root, { backgroundColor: BG, paddingTop: insets.top }]}>
        <View style={[styles.navbar, { borderBottomColor: BORDER }]}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.navIconBtn}>
            <Ionicons name="arrow-back" size={24} color={TEXT} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: TEXT }]}>Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <Skeleton width="100%" height={175} borderRadius={16} />
          <View style={{ marginLeft: 16, marginTop: -46 }}>
            <Skeleton width={98} height={98} borderRadius={49} />
          </View>
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            <Skeleton width="50%" height={24} borderRadius={6} />
            <Skeleton width="35%" height={16} borderRadius={6} />
            <Skeleton width="75%" height={14} borderRadius={6} />
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: BG, paddingTop: insets.top }]}>
        <Ionicons name="person-circle-outline" size={72} color={TEXT3} />
        <Text style={[styles.notFoundTitle, { color: TEXT }]}>Member Not Found</Text>
        <Text style={[styles.notFoundSub, { color: TEXT3 }]}>This profile may have been removed.</Text>
        <Button
          title="Go Back"
          variant="primary"
          size="md"
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
        />
      </View>
    );
  }

  const memberSinceYear = new Date(user.joinedAt || user.createdAt || new Date().toISOString()).getFullYear();

  return (
    <View style={[styles.root, { backgroundColor: BG, paddingTop: insets.top }]}>

      {/* ── Animated App Bar ─────────────────────────────────────────────── */}
      <Animated.View style={[styles.navbar, { borderBottomColor: BORDER }]}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: SURF, opacity: navBgOpacity }]} />
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.navIconBtn}>
          <Ionicons name="arrow-back" size={24} color={TEXT} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: TEXT }]} numberOfLines={1}>{user.displayName}</Text>
        <View style={styles.navRight}>
          <TouchableOpacity style={styles.navIconBtn} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={22} color={TEXT} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navIconBtn}
            onPress={() => Alert.alert('Profile options', undefined, [
              { text: 'Share profile', onPress: handleShare },
              { text: 'Cancel', style: 'cancel' },
            ])}
          >
            <Ionicons name="ellipsis-vertical" size={22} color={TEXT} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(96, insets.bottom + 82) }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* ── Cover Hero ─────────────────────────────────────────────── */}
        <View style={[styles.coverContainer, { height: SW >= 768 ? 280 : COVER_HEIGHT }]}>
          {user.coverImage || user.bannerUrl ? (
            <Image
              source={{ uri: user.coverImage || user.bannerUrl }}
              style={styles.coverImage}
              contentFit="cover"
              contentPosition="center"
              transition={200}
            />
          ) : (
            <View style={[styles.coverImage, { backgroundColor: colors.primaryContainer || '#E2E8F0' }]} />
          )}
          <View style={styles.coverGradientOverlay} />
        </View>

        {/* ── Profile Masthead ─────────────────────────────────────────── */}
        <View style={styles.profileMasthead}>
          <View style={styles.mastheadTopRow}>
            {/* Avatar overlapping cover on left */}
            <View style={[styles.avatarBorderWrapper, { borderColor: BG, backgroundColor: BG }]}>
              <Avatar url={user.avatarUrl} name={user.displayName} size={92} />
            </View>

            {/* Actions group on right */}
            <View style={styles.topActionGroup}>
              {!isOwnProfile && (
                <>
                  <Button
                    title={connStatus === 'ACCEPTED' ? 'Connected' : connStatus === 'PENDING_SENT' ? 'Pending' : 'Connect'}
                    icon={connStatus === 'ACCEPTED' ? 'checkmark-circle' : connStatus === 'PENDING_SENT' ? 'time-outline' : 'person-add'}
                    variant={connStatus === 'ACCEPTED' ? 'secondary' : 'primary'}
                    size="sm"
                    loading={sendRequest.isPending}
                    disabled={connStatus !== 'NONE' || sendRequest.isPending}
                    onPress={handleConnect}
                  />
                  <Pressable
                    accessibilityLabel="Message user"
                    style={({ pressed }) => [
                      styles.iconUtilityButton,
                      { borderColor: BORDER, backgroundColor: pressed ? colors.elevation1 : SURF },
                    ]}
                    onPress={() => router.push(`/chat/new?participantId=${user.id}` as any)}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={17} color={TEXT} />
                  </Pressable>
                </>
              )}
              <Pressable
                accessibilityLabel="Share profile"
                style={({ pressed }) => [
                  styles.iconUtilityButton,
                  { borderColor: BORDER, backgroundColor: pressed ? colors.elevation1 : SURF },
                ]}
                onPress={handleShare}
              >
                <Ionicons name="share-social-outline" size={17} color={TEXT} />
              </Pressable>
            </View>
          </View>

          {/* Identity Info */}
          <View style={styles.identityBlock}>
            <View style={styles.nameBadgeRow}>
              <Text style={[styles.profileName, { color: TEXT }]}>{user.displayName}</Text>
              {user.isVerified && (
                <View style={[styles.verifiedBadge, { backgroundColor: G }]}>
                  <Ionicons name="checkmark-sharp" size={10} color="#FFF" />
                </View>
              )}
            </View>

            <Text style={[styles.usernameText, { color: TEXT3 }]}>@{user.username}</Text>

            <View style={styles.metaPillsRow}>
              <View style={[styles.badgePill, { backgroundColor: G + '15' }]}>
                <Ionicons name="sparkles" size={11} color={G} />
                <Text style={[styles.badgePillText, { color: G }]}>{user.occupation || 'Member'}</Text>
              </View>
              {user.village ? (
                <View style={[styles.badgePill, { backgroundColor: isDark ? '#27272A' : '#F4F4F5' }]}>
                  <Ionicons name="location-outline" size={11} color={TEXT3} />
                  <Text style={[styles.badgePillText, { color: TEXT3 }]}>{user.village}</Text>
                </View>
              ) : null}
            </View>

            {user.bio ? (
              <>
                <Text style={[styles.bioText, { color: TEXT2 }]} numberOfLines={bioExpanded ? undefined : 2}>
                  {user.bio}
                </Text>
                {!bioExpanded && user.bio.length > 85 && (
                  <TouchableOpacity onPress={() => setBioExpanded(true)}>
                    <Text style={[styles.expandBioText, { color: G }]}>Show more</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : null}
          </View>

          {/* Stats Bar with Colorful Icons */}
          <View style={[styles.statsCardWrapper, { backgroundColor: SURF, borderColor: BORDER }]}>
            {[
              {
                label: 'Followers',
                value: (user.followersCount || 0).toString(),
                icon: 'people',
                color: G,
                bg: G + '14',
              },
              {
                label: 'Following',
                value: (user.followingCount || 0).toString(),
                icon: 'person-add',
                color: '#3B82F6',
                bg: '#3B82F614',
              },
              {
                label: 'Communities',
                value: (user.communitiesCount || 0).toString(),
                icon: 'globe',
                color: '#8B5CF6',
                bg: '#8B5CF614',
              },
              {
                label: 'Helped',
                value: (user.helpCount || 0).toString(),
                icon: 'heart',
                color: '#DC2626',
                bg: '#DC262614',
              },
              {
                label: 'Events Attended',
                value: (user.attendedEventCount || 0).toString(),
                icon: 'calendar',
                color: '#0891B2',
                bg: '#0891B214',
              },
              {
                label: 'Member',
                value: memberSinceYear.toString(),
                icon: 'ribbon',
                color: '#F59E0B',
                bg: '#F59E0B14',
              },
            ].map((stat, index, arr) => (
              <View
                key={stat.label}
                style={[
                  styles.statBlock,
                  index % 3 !== 2 && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: BORDER },
                ]}
              >
                <View style={[styles.statIconBadge, { backgroundColor: stat.bg }]}>
                  <Ionicons name={stat.icon as any} size={15} color={stat.color} />
                </View>
                <Text style={[styles.statValue, { color: TEXT }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: TEXT3 }]}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Segmented Tab Bar (Pill style matching profile.tsx) ─────── */}
        <View style={styles.tabBarSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  style={[
                    styles.tabPill,
                    active
                      ? [styles.tabPillActive, { backgroundColor: G }]
                      : [styles.tabPillInactive, { backgroundColor: SURF, borderColor: BORDER }],
                  ]}
                >
                  <Ionicons name={tab.icon as any} size={14} color={active ? '#FFF' : TEXT3} />
                  <Text style={[styles.tabLabel, { color: active ? '#FFF' : TEXT2, fontWeight: active ? '700' : '500' }]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Tab Content ──────────────────────────────────────────────── */}
        <View style={styles.contentArea}>

          {/* POSTS TAB */}
          {activeTab === 'posts' && (
            postsLoading ? (
              <View style={{ gap: 12 }}>
                {[1, 2].map((i) => (
                  <View key={i} style={[styles.modernCard, { backgroundColor: SURF, borderColor: BORDER }]}>
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                      <Skeleton width={44} height={44} borderRadius={22} />
                      <View style={{ flex: 1, gap: 8 }}>
                        <Skeleton width="45%" height={14} borderRadius={6} />
                        <Skeleton width="25%" height={10} borderRadius={6} />
                      </View>
                    </View>
                    <Skeleton width="100%" height={200} borderRadius={14} />
                  </View>
                ))}
              </View>
            ) : userPosts.length > 0 ? (
              <View style={{ gap: 12 }}>
                {userPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    horizontalGutter={0}
                    onCommentPress={(postId) => {
                      setSelectedPostId(postId);
                      setCommentSheetVisible(true);
                    }}
                    onForwardPress={(postId) => {
                      setSelectedForwardPostId(postId);
                      setForwardSheetVisible(true);
                    }}
                  />
                ))}
              </View>
            ) : (
              <View style={[styles.modernCard, styles.emptyCard, { backgroundColor: SURF, borderColor: BORDER }]}>
                <View style={[styles.emptyIconCircle, { backgroundColor: G + '12' }]}>
                  <Ionicons name="document-text-outline" size={32} color={G} />
                </View>
                <Text style={[styles.emptyTitle, { color: TEXT }]}>No Posts Yet</Text>
                <Text style={[styles.emptySubtitle, { color: TEXT3 }]}>
                  {user.displayName} hasn't shared any updates with the network yet.
                </Text>
              </View>
            )
          )}

          {/* ABOUT TAB */}
          {activeTab === 'about' && (
            <View style={{ gap: 14 }}>
              {/* Card 1: Personal & Heritage */}
              <View style={[styles.modernCard, { backgroundColor: SURF, borderColor: BORDER }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                  <Ionicons name="person-circle-outline" size={18} color={G} />
                  <Text style={[styles.cardSectionHeader, { color: TEXT, marginBottom: 0 }]}>Personal Details</Text>
                </View>

                {/* Native Place */}
                <View style={[styles.detailItemRow, { borderBottomColor: BORDER, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                  <View style={[styles.detailIconContainer, { backgroundColor: G + '14' }]}>
                    <Ionicons name="location" size={16} color={G} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailLabel, { color: TEXT3 }]}>Native Place / Village</Text>
                    <Text style={[styles.detailValue, { color: user.village ? TEXT : TEXT3 }]}>
                      {user.village || 'Not specified'}
                    </Text>
                  </View>
                </View>

                {/* Profession / Occupation */}
                <View style={[styles.detailItemRow, { borderBottomColor: BORDER, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                  <View style={[styles.detailIconContainer, { backgroundColor: '#3B82F614' }]}>
                    <Ionicons name="briefcase" size={16} color="#3B82F6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailLabel, { color: TEXT3 }]}>Profession / Occupation</Text>
                    <Text style={[styles.detailValue, { color: user.occupation ? TEXT : TEXT3 }]}>
                      {user.occupation || 'Not specified'}
                    </Text>
                  </View>
                </View>

                {/* Languages */}
                <View style={[styles.detailItemRow, { borderBottomColor: BORDER, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                  <View style={[styles.detailIconContainer, { backgroundColor: '#8B5CF614' }]}>
                    <Ionicons name="language" size={16} color="#8B5CF6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailLabel, { color: TEXT3 }]}>Languages Known</Text>
                    {user.languages ? (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                        {user.languages.split(',').map((lang, idx) => (
                          <View key={idx} style={[styles.aboutPill, { backgroundColor: isDark ? '#27272A' : '#F4F4F5' }]}>
                            <Text style={[styles.aboutPillText, { color: TEXT2 }]}>{lang.trim()}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={[styles.detailValue, { color: TEXT3 }]}>Not specified</Text>
                    )}
                  </View>
                </View>

                {/* Interests */}
                <View style={styles.detailItemRow}>
                  <View style={[styles.detailIconContainer, { backgroundColor: '#F59E0B14' }]}>
                    <Ionicons name="sparkles" size={16} color="#F59E0B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailLabel, { color: TEXT3 }]}>Interests & Passions</Text>
                    {user.interests ? (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                        {user.interests.split(',').map((interest, idx) => (
                          <View key={idx} style={[styles.aboutPill, { backgroundColor: G + '12' }]}>
                            <Text style={[styles.aboutPillText, { color: G }]}>{interest.trim()}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={[styles.detailValue, { color: TEXT3 }]}>Not specified</Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Card 2: Community Engagement Matrix */}
              <View style={[styles.modernCard, { backgroundColor: SURF, borderColor: BORDER }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                  <Ionicons name="stats-chart-outline" size={17} color={G} />
                  <Text style={[styles.cardSectionHeader, { color: TEXT, marginBottom: 0 }]}>Community Activity</Text>
                </View>

                <View style={styles.metricsGrid}>
                  <View style={[styles.metricCard, { backgroundColor: isDark ? '#27272A50' : '#F9FAF8', borderColor: BORDER }]}>
                    <View style={[styles.metricIconBg, { backgroundColor: G + '14' }]}>
                      <Ionicons name="globe" size={16} color={G} />
                    </View>
                    <Text style={[styles.metricValue, { color: TEXT }]}>{user.communitiesCount ?? 0}</Text>
                    <Text style={[styles.metricLabel, { color: TEXT3 }]}>Communities</Text>
                  </View>

                  <View style={[styles.metricCard, { backgroundColor: isDark ? '#27272A50' : '#F9FAF8', borderColor: BORDER }]}>
                    <View style={[styles.metricIconBg, { backgroundColor: '#8B5CF614' }]}>
                      <Ionicons name="people" size={16} color="#8B5CF6" />
                    </View>
                    <Text style={[styles.metricValue, { color: TEXT }]}>{user.followersCount ?? 0}</Text>
                    <Text style={[styles.metricLabel, { color: TEXT3 }]}>Followers</Text>
                  </View>

                  <View style={[styles.metricCard, { backgroundColor: isDark ? '#27272A50' : '#F9FAF8', borderColor: BORDER }]}>
                    <View style={[styles.metricIconBg, { backgroundColor: '#3B82F614' }]}>
                      <Ionicons name="person-add" size={16} color="#3B82F6" />
                    </View>
                    <Text style={[styles.metricValue, { color: TEXT }]}>{user.followingCount ?? 0}</Text>
                    <Text style={[styles.metricLabel, { color: TEXT3 }]}>Following</Text>
                  </View>

                  <View style={[styles.metricCard, { backgroundColor: isDark ? '#27272A50' : '#F9FAF8', borderColor: BORDER }]}>
                    <View style={[styles.metricIconBg, { backgroundColor: '#F59E0B14' }]}>
                      <Ionicons name="ribbon" size={16} color="#F59E0B" />
                    </View>
                    <Text style={[styles.metricValue, { color: TEXT }]}>
                      {(user.joinedAt || user.createdAt)
                        ? new Date(user.joinedAt || user.createdAt!).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                        : '2026'}
                    </Text>
                    <Text style={[styles.metricLabel, { color: TEXT3 }]}>Member Since</Text>
                  </View>
                </View>
              </View>

              {/* Card 3: Membership Status */}
              <View style={[styles.modernCard, { backgroundColor: SURF, borderColor: BORDER }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <Ionicons name="shield-checkmark-outline" size={17} color={G} />
                  <Text style={[styles.cardSectionHeader, { color: TEXT, marginBottom: 0 }]}>Membership Status</Text>
                </View>

                <View style={styles.detailItemRow}>
                  <View style={[styles.detailIconContainer, { backgroundColor: G + '14' }]}>
                    <Ionicons name="shield-checkmark" size={16} color={G} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailLabel, { color: TEXT3 }]}>Verification</Text>
                    <Text style={[styles.detailValue, { color: G, fontWeight: '700' }]}>
                      {user.isVerified ? '✓ Verified Community Member' : 'Active Community Member'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <CommentSheet
        postId={selectedPostId}
        visible={commentSheetVisible}
        onClose={() => setCommentSheetVisible(false)}
      />

      <ForwardSheet
        postId={selectedForwardPostId}
        visible={forwardSheetVisible}
        onClose={() => setForwardSheetVisible(false)}
        onNativeShare={async () => {
          try {
            await Share.share({ message: `Check out ${user.displayName}'s post!` });
          } catch (_) {}
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },

  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: 12,
  },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navIconBtn: { padding: 8 },

  // Cover
  coverContainer: { position: 'relative', width: '100%', overflow: 'hidden' },
  coverImage: { width: '100%', height: '100%' },
  coverGradientOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },

  // Masthead
  profileMasthead: { paddingHorizontal: 16, marginBottom: 12 },
  mastheadTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: -46,
    marginBottom: 12,
  },
  avatarBorderWrapper: {
    width: 98,
    height: 98,
    borderRadius: 49,
    borderWidth: 3,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  topActionGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  iconUtilityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },

  // Identity
  identityBlock: { marginBottom: 16 },
  nameBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  profileName: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  usernameText: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaPillsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  badgePillText: { fontSize: 11.5, fontWeight: '600' },
  bioText: { fontSize: 13.5, lineHeight: 19 },
  expandBioText: { fontSize: 12, fontWeight: '700', marginTop: 3 },

  // Stats Card
  statsCardWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  statBlock: {
    width: '33.333%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  statIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  statLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 1,
  },

  // Segmented Tabs
  tabBarSection: { marginBottom: 12 },
  tabScroll: { paddingHorizontal: 16, gap: 8 },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7.5,
    borderRadius: 20,
  },
  tabPillActive: {},
  tabPillInactive: { borderWidth: StyleSheet.hairlineWidth },
  tabLabel: { fontSize: 12.5 },

  // Cards & Rows
  contentArea: { paddingHorizontal: 16 },
  modernCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  cardSectionHeader: { fontSize: 15, fontWeight: '700', marginBottom: 14, letterSpacing: -0.2 },

  // Details Tab
  detailItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  detailIconContainer: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  detailLabel: { fontSize: 11.5, fontWeight: '500' },
  detailValue: { fontSize: 14, fontWeight: '600', marginTop: 1 },

  // About Tab Enhancements
  aboutPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  aboutPillText: { fontSize: 11.5, fontWeight: '600' },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '48%',
    flexGrow: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  metricIconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  metricValue: { fontSize: 15.5, fontWeight: '800' },
  metricLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },

  // Empty States
  emptyCard: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyIconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 18 },

  notFoundTitle: { fontSize: 22, fontWeight: '800', marginTop: 16 },
  notFoundSub: { fontSize: 15, marginTop: 6, marginBottom: 24 },
});
