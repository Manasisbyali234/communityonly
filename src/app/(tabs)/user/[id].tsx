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
  useWindowDimensions,
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
import { useUserJoinedEventsQuery } from '../../../api/event';
import { BottomSheet } from '../../../components/common/BottomSheet';
import { confirmAction } from '../../../store/confirmStore';
import { Share } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SW } = Dimensions.get('window');
const COVER_HEIGHT = 175;

type ProfileTab = 'posts' | 'events' | 'about';
const TABS: { id: ProfileTab; label: string; icon: string }[] = [
  { id: 'posts', label: 'Posts', icon: 'grid-outline' },
  { id: 'events', label: 'Events', icon: 'calendar-outline' },
  { id: 'about', label: 'About', icon: 'person-outline' },
];

export default function UserProfileScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleBack = () => {
    if (from === 'notifications') {
      router.replace('/(tabs)/notifications' as any);
    } else if (from === 'events') {
      router.replace('/(tabs)/explore?tab=events' as any);
    } else if (from === 'feed') {
      router.replace('/(tabs)' as any);
    } else {
      router.replace('/(tabs)/explore?tab=members' as any);
    }
  };

  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [bioExpanded, setBioExpanded] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [commentSheetVisible, setCommentSheetVisible] = useState(false);
  const [selectedForwardPostId, setSelectedForwardPostId] = useState<string | null>(null);
  const [forwardSheetVisible, setForwardSheetVisible] = useState(false);
  const [optionsMenuVisible, setOptionsMenuVisible] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const showToast = useToastStore((state) => state.showToast);

  const { data: user, isLoading: userLoading } = useUserQuery(id);
  const { data: userPosts = [], isLoading: postsLoading } = useUserPostsQuery(id);
  const { data: joinedEvents = [], isLoading: eventsLoading } = useUserJoinedEventsQuery(id);
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

  const { width: screenWidth } = useWindowDimensions();
  const statItemWidth = (screenWidth - 32) / 3.5;

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
          <TouchableOpacity onPress={handleBack} style={styles.navIconBtn}>
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
          onPress={handleBack}
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
        <TouchableOpacity onPress={handleBack} style={styles.navIconBtn}>
          <Ionicons name="arrow-back" size={24} color={TEXT} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: TEXT }]} numberOfLines={1}>{user.displayName}</Text>
        <View style={styles.navRight}>
          <TouchableOpacity style={styles.navIconBtn} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={22} color={TEXT} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navIconBtn}
            onPress={() => setOptionsMenuVisible(true)}
            accessibilityLabel="Profile options"
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

            <View style={[styles.metaPillsRow, !user.bio && { marginBottom: 0 }]}>
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

          {/* Stats Bar with Colorful Icons (Scrollable in one row) */}
          <View style={[styles.statsCardContainer, { backgroundColor: SURF, borderColor: BORDER }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statsScrollContent}
            >
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
                    { width: statItemWidth },
                    index < arr.length - 1 && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: BORDER },
                  ]}
                >
                  <View style={[styles.statIconBadge, { backgroundColor: stat.bg }]}>
                    <Ionicons name={stat.icon as any} size={15} color={stat.color} />
                  </View>
                  <Text style={[styles.statValue, { color: TEXT }]}>{stat.value}</Text>
                  <Text style={[styles.statLabel, { color: TEXT3 }]} numberOfLines={1} ellipsizeMode="tail">
                    {stat.label}
                  </Text>
                </View>
              ))}
            </ScrollView>
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
                      ? [styles.tabPillActive, { backgroundColor: 'rgb(45, 106, 45)' }]
                      : [styles.tabPillInactive, { backgroundColor: SURF, borderColor: BORDER }],
                  ]}
                >
                  {active && (
                    <LinearGradient
                      colors={['rgb(76, 175, 80)', 'rgb(45, 106, 45)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  )}
                  <Ionicons name={tab.icon as any} size={16} color={active ? '#FFF' : TEXT3} />
                  <Text style={[styles.tabLabel, { color: active ? '#FFF' : TEXT2, fontWeight: active ? '700' : '600' }]}>
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

          {/* EVENTS TAB */}
          {activeTab === 'events' && (
            eventsLoading ? (
              <View style={{ gap: 12 }}>
                {[1, 2].map((item) => <Skeleton key={item} width="100%" height={98} borderRadius={16} />)}
              </View>
            ) : joinedEvents.length > 0 ? (
              <View style={{ gap: 12 }}>
                {joinedEvents.map((event) => (
                  <TouchableOpacity
                    key={event.id}
                    style={[styles.modernCard, styles.joinedEventCard, { backgroundColor: SURF, borderColor: BORDER }]}
                    onPress={() => router.push(`/events/${event.id}` as any)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.eventIconWrap, { backgroundColor: '#0891B214' }]}>
                      <Ionicons name="calendar" size={22} color="#0891B2" />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={[styles.joinedEventTitle, { color: TEXT }]} numberOfLines={2}>{event.title}</Text>
                      <View style={styles.joinedEventMeta}>
                        <Ionicons name="time-outline" size={13} color={TEXT3} />
                        <Text style={[styles.joinedEventMetaText, { color: TEXT3 }]}>
                          {new Date(event.startsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>
                      </View>
                      {event.location ? (
                        <View style={styles.joinedEventMeta}>
                          <Ionicons name="location-outline" size={13} color={TEXT3} />
                          <Text style={[styles.joinedEventMetaText, { color: TEXT3 }]} numberOfLines={1}>{event.location}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={TEXT3} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={[styles.modernCard, styles.emptyCard, { backgroundColor: SURF, borderColor: BORDER }]}>
                <View style={[styles.emptyIconCircle, { backgroundColor: '#0891B214' }]}>
                  <Ionicons name="calendar-outline" size={32} color="#0891B2" />
                </View>
                <Text style={[styles.emptyTitle, { color: TEXT }]}>No Events Joined Yet</Text>
                <Text style={[styles.emptySubtitle, { color: TEXT3 }]}>{user.displayName} has not joined any events yet.</Text>
              </View>
            )
          )}

          {/* ABOUT TAB */}
          {activeTab === 'about' && (
            <View style={{ gap: 14 }}>
              {/* Card 1: Personal & Heritage (Two Column Grid) */}
              <View style={[styles.modernCard, { backgroundColor: SURF, borderColor: BORDER }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <Ionicons name="person-circle-outline" size={18} color={G} />
                  <Text style={[styles.cardSectionHeader, { color: TEXT, marginBottom: 0 }]}>Personal Details</Text>
                </View>

                <View style={styles.twoColumnGrid}>
                  {/* Native Place */}
                  <View style={[styles.detailTile, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F9FAFB', borderColor: BORDER }]}>
                    <View style={styles.detailTileHeader}>
                      <View style={[styles.detailTileIcon, { backgroundColor: G + '14' }]}>
                        <Ionicons name="location" size={13} color={G} />
                      </View>
                      <Text style={[styles.detailTileLabel, { color: TEXT3 }]} numberOfLines={1}>Native Place</Text>
                    </View>
                    <Text style={[styles.detailTileValue, { color: user.village ? TEXT : TEXT3 }]} numberOfLines={1}>
                      {user.village || 'Not specified'}
                    </Text>
                  </View>

                  {/* Profession / Occupation */}
                  <View style={[styles.detailTile, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F9FAFB', borderColor: BORDER }]}>
                    <View style={styles.detailTileHeader}>
                      <View style={[styles.detailTileIcon, { backgroundColor: '#3B82F614' }]}>
                        <Ionicons name="briefcase" size={13} color="#3B82F6" />
                      </View>
                      <Text style={[styles.detailTileLabel, { color: TEXT3 }]} numberOfLines={1}>Profession</Text>
                    </View>
                    <Text style={[styles.detailTileValue, { color: user.occupation ? TEXT : TEXT3 }]} numberOfLines={1}>
                      {user.occupation || 'Not specified'}
                    </Text>
                  </View>

                  {/* Languages */}
                  <View style={[styles.detailTile, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F9FAFB', borderColor: BORDER }]}>
                    <View style={styles.detailTileHeader}>
                      <View style={[styles.detailTileIcon, { backgroundColor: '#8B5CF614' }]}>
                        <Ionicons name="language" size={13} color="#8B5CF6" />
                      </View>
                      <Text style={[styles.detailTileLabel, { color: TEXT3 }]} numberOfLines={1}>Languages</Text>
                    </View>
                    {user.languages ? (
                      <View style={styles.tilePillsWrap}>
                        {user.languages.split(',').map((lang, idx) => (
                          <View key={idx} style={[styles.aboutPill, { backgroundColor: isDark ? '#27272A' : '#F4F4F5' }]}>
                            <Text style={[styles.aboutPillText, { color: TEXT2 }]}>{lang.trim()}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={[styles.detailTileValue, { color: TEXT3 }]}>Not specified</Text>
                    )}
                  </View>

                  {/* Interests */}
                  <View style={[styles.detailTile, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F9FAFB', borderColor: BORDER }]}>
                    <View style={styles.detailTileHeader}>
                      <View style={[styles.detailTileIcon, { backgroundColor: '#F59E0B14' }]}>
                        <Ionicons name="sparkles" size={13} color="#F59E0B" />
                      </View>
                      <Text style={[styles.detailTileLabel, { color: TEXT3 }]} numberOfLines={1}>Interests</Text>
                    </View>
                    {user.interests ? (
                      <View style={styles.tilePillsWrap}>
                        {user.interests.split(',').map((interest, idx) => (
                          <View key={idx} style={[styles.aboutPill, { backgroundColor: G + '12' }]}>
                            <Text style={[styles.aboutPillText, { color: G }]}>{interest.trim()}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={[styles.detailTileValue, { color: TEXT3 }]}>Not specified</Text>
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
                      <Ionicons name="globe" size={14} color={G} />
                    </View>
                    <Text style={[styles.metricValue, { color: TEXT }]} numberOfLines={1}>{user.communitiesCount ?? 0}</Text>
                    <Text style={[styles.metricLabel, { color: TEXT3 }]} numberOfLines={1}>Communities</Text>
                  </View>

                  <View style={[styles.metricCard, { backgroundColor: isDark ? '#27272A50' : '#F9FAF8', borderColor: BORDER }]}>
                    <View style={[styles.metricIconBg, { backgroundColor: '#8B5CF614' }]}>
                      <Ionicons name="people" size={14} color="#8B5CF6" />
                    </View>
                    <Text style={[styles.metricValue, { color: TEXT }]} numberOfLines={1}>{user.followersCount ?? 0}</Text>
                    <Text style={[styles.metricLabel, { color: TEXT3 }]} numberOfLines={1}>Followers</Text>
                  </View>

                  <View style={[styles.metricCard, { backgroundColor: isDark ? '#27272A50' : '#F9FAF8', borderColor: BORDER }]}>
                    <View style={[styles.metricIconBg, { backgroundColor: '#3B82F614' }]}>
                      <Ionicons name="person-add" size={14} color="#3B82F6" />
                    </View>
                    <Text style={[styles.metricValue, { color: TEXT }]} numberOfLines={1}>{user.followingCount ?? 0}</Text>
                    <Text style={[styles.metricLabel, { color: TEXT3 }]} numberOfLines={1}>Following</Text>
                  </View>

                  <View style={[styles.metricCard, { backgroundColor: isDark ? '#27272A50' : '#F9FAF8', borderColor: BORDER }]}>
                    <View style={[styles.metricIconBg, { backgroundColor: '#F59E0B14' }]}>
                      <Ionicons name="ribbon" size={14} color="#F59E0B" />
                    </View>
                    <Text style={[styles.metricValue, { color: TEXT }]} numberOfLines={1} adjustsFontSizeToFit>
                      {(user.joinedAt || user.createdAt)
                        ? new Date(user.joinedAt || user.createdAt!).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                        : '2026'}
                    </Text>
                    <Text style={[styles.metricLabel, { color: TEXT3 }]} numberOfLines={1}>Member Since</Text>
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

      {/* Modern Profile Options Bottom Sheet */}
      <BottomSheet
        visible={optionsMenuVisible}
        onClose={() => setOptionsMenuVisible(false)}
        title="Profile Options"
      >
        <View style={styles.optionsSheetContent}>
          {/* User Quick Info Tile */}
          <View style={[styles.optionsUserTile, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F4F4F5', borderColor: BORDER }]}>
            <Avatar
              url={user?.avatarUrl}
              name={user?.displayName || 'User'}
              size={44}
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.optionsUserName, { color: TEXT }]} numberOfLines={1}>
                {user?.displayName}
              </Text>
              <Text style={[styles.optionsUserHandle, { color: TEXT3 }]} numberOfLines={1}>
                @{user?.username} {user?.occupation ? `· ${user.occupation}` : ''}
              </Text>
            </View>
          </View>

          {/* Action List */}
          <View style={styles.optionsList}>
            {/* Share Profile */}
            <TouchableOpacity
              style={[styles.optionsItem, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}
              onPress={() => {
                setOptionsMenuVisible(false);
                setTimeout(handleShare, 200);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.optionsIconWrap, { backgroundColor: G + '15' }]}>
                <Ionicons name="share-social-outline" size={20} color={G} />
              </View>
              <View style={styles.optionsTextWrap}>
                <Text style={[styles.optionsItemTitle, { color: TEXT }]}>Share Profile</Text>
                <Text style={[styles.optionsItemSub, { color: TEXT3 }]}>Share profile via link or social apps</Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={TEXT3} />
            </TouchableOpacity>

            {/* Send Message (if not own profile) */}
            {!isOwnProfile && (
              <TouchableOpacity
                style={[styles.optionsItem, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}
                onPress={() => {
                  setOptionsMenuVisible(false);
                  router.push(`/chat/new?participantId=${user.id}` as any);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.optionsIconWrap, { backgroundColor: '#3B82F615' }]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={20} color="#3B82F6" />
                </View>
                <View style={styles.optionsTextWrap}>
                  <Text style={[styles.optionsItemTitle, { color: TEXT }]}>Send Direct Message</Text>
                  <Text style={[styles.optionsItemSub, { color: TEXT3 }]}>Start a private conversation</Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color={TEXT3} />
              </TouchableOpacity>
            )}

            {/* Copy Profile Link */}
            <TouchableOpacity
              style={[styles.optionsItem, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}
              onPress={async () => {
                setOptionsMenuVisible(false);
                const base = Platform.OS === 'web' && typeof window !== 'undefined'
                  ? `${window.location.protocol}//${window.location.host}` : 'https://gowdaconnect.com';
                const link = `${base}/user/${user.id}`;
                const ok = await shareUrl(link, link);
                showToast(ok ? 'Profile link copied!' : 'Could not copy link', ok ? 'success' : 'error');
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.optionsIconWrap, { backgroundColor: '#8B5CF615' }]}>
                <Ionicons name="link-outline" size={20} color="#8B5CF6" />
              </View>
              <View style={styles.optionsTextWrap}>
                <Text style={[styles.optionsItemTitle, { color: TEXT }]}>Copy Profile Link</Text>
                <Text style={[styles.optionsItemSub, { color: TEXT3 }]}>Copy link to clipboard</Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={TEXT3} />
            </TouchableOpacity>

            {/* Report Profile (if not own profile) */}
            {!isOwnProfile && (
              <TouchableOpacity
                style={[styles.optionsItem, { borderBottomColor: 'transparent' }]}
                onPress={async () => {
                  setOptionsMenuVisible(false);
                  const confirmed = await confirmAction({
                    title: `Report @${user.username}?`,
                    message: 'Our moderation team will review this profile for any community guideline violations.',
                    confirmText: 'Report User',
                    cancelText: 'Cancel',
                    isDestructive: true,
                    icon: 'flag-outline',
                  });
                  if (confirmed) {
                    showToast('Report submitted. Thank you for keeping the community safe.', 'success');
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.optionsIconWrap, { backgroundColor: '#EF444415' }]}>
                  <Ionicons name="flag-outline" size={20} color="#EF4444" />
                </View>
                <View style={styles.optionsTextWrap}>
                  <Text style={[styles.optionsItemTitle, { color: '#EF4444' }]}>Report Profile</Text>
                  <Text style={[styles.optionsItemSub, { color: TEXT3 }]}>Flag inappropriate content or suspicious activity</Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color={TEXT3} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </BottomSheet>
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
  profileMasthead: { paddingHorizontal: 16, marginBottom: 10 },
  mastheadTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: -46,
    marginBottom: 8,
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
  identityBlock: { marginBottom: 10 },
  nameBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 1 },
  profileName: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  usernameText: { fontSize: 13, fontWeight: '500', marginBottom: 4 },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaPillsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgePillText: { fontSize: 11.5, fontWeight: '600' },
  bioText: { fontSize: 13.5, lineHeight: 18.5 },
  expandBioText: { fontSize: 12, fontWeight: '700', marginTop: 2 },

  // Stats Card
  statsCardContainer: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
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
  statsScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statBlock: {
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  statLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },

  // Segmented Tabs
  tabBarSection: { marginTop: 6, marginBottom: 16 },
  tabScroll: { paddingHorizontal: 16, gap: 10 },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 9.5,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  tabPillActive: {},
  tabPillInactive: { borderWidth: StyleSheet.hairlineWidth },
  tabLabel: { fontSize: 13.5 },

  // Cards & Rows
  contentArea: { paddingHorizontal: 16 },
  modernCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  joinedEventCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  eventIconWrap: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  joinedEventTitle: { fontSize: 15, fontWeight: '800', lineHeight: 20 },
  joinedEventMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  joinedEventMetaText: { flexShrink: 1, fontSize: 12.5, fontWeight: '500' },
  cardSectionHeader: { fontSize: 15, fontWeight: '700', marginBottom: 14, letterSpacing: -0.2 },

  // Details Tab (Two Column Grid)
  twoColumnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  detailTile: {
    width: '48%',
    flexGrow: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'flex-start',
  },
  detailTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  detailTileIcon: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTileLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
  },
  detailTileValue: {
    fontSize: 13.5,
    fontWeight: '700',
    marginTop: 2,
  },
  tilePillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 3,
  },
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
    alignItems: 'stretch',
    gap: 6,
  },
  metricCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  metricValue: { fontSize: 13.5, fontWeight: '800', textAlign: 'center' },
  metricLabel: { fontSize: 9.5, fontWeight: '600', marginTop: 2, textAlign: 'center' },

  // Empty States
  emptyCard: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyIconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 18 },

  // Profile Options Bottom Sheet
  optionsSheetContent: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 4 },
  optionsUserTile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  optionsUserName: { fontSize: 15, fontWeight: '700' },
  optionsUserHandle: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  optionsList: { borderRadius: 14, overflow: 'hidden' },
  optionsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionsIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionsTextWrap: { flex: 1, marginRight: 8 },
  optionsItemTitle: { fontSize: 14.5, fontWeight: '600' },
  optionsItemSub: { fontSize: 11.5, marginTop: 1 },

  notFoundTitle: { fontSize: 22, fontWeight: '800', marginTop: 16 },
  notFoundSub: { fontSize: 15, marginTop: 6, marginBottom: 24 },
});
