import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Share,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PostCard from '../../components/feed/PostCard';
import CommentSheet from '../../components/feed/CommentSheet';
import ForwardSheet from '../../components/feed/ForwardSheet';
import { useTheme } from '../../theme';
import { useToastStore } from '../../store/toastStore';
import { useUserPostsQuery } from '../../api/feed';
import { useNotificationsQuery, useUnreadCountQuery, useUnreadChatCountQuery, useChatSocket, useNotificationSocket, useChatsQuery } from '../../api/chat';
import { useAuthStore } from '../../store/authStore';
import { useEventsQuery, useMyEventsQuery } from '../../api/event';
import { apiClient } from '../../api/client';
import { useMyConnectionCountQuery, useConnectionSocket } from '../../api/connections';
import { shareAppLink } from '../../utils/shareUtils';
import { useUserJobApplicationsQuery } from '../../api/jobs';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import EventParticipantsSheet from '../../components/feed/EventParticipantsSheet';

type ProfileTab = 'posts' | 'updates' | 'events' | 'family' | 'about';

const COVER_HEIGHT = 190;

const TABS: { id: ProfileTab; label: string; icon: string }[] = [
  { id: 'posts', label: 'Posts', icon: 'grid-outline' },
  { id: 'about', label: 'About', icon: 'person-outline' },
  { id: 'events', label: 'Events', icon: 'calendar-outline' },
  { id: 'family', label: 'Family', icon: 'people-outline' },
  { id: 'updates', label: 'Updates', icon: 'megaphone-outline' },
];

function UpdatesTab() {
  const { colors } = useTheme();
  const { data: notifications = [], isLoading } = useNotificationsQuery();
  const SURF = colors.surface;
  const BORDER = colors.border;
  const TEXT = colors.text;
  const TEXT3 = colors.textMuted;
  const G = colors.primary;

  const getIcon = (type: string): { icon: string; color: string } => {
    switch (type) {
      case 'LIKE': return { icon: 'heart', color: '#EF4444' };
      case 'COMMENT': return { icon: 'chatbubble', color: '#3B82F6' };
      case 'FOLLOW': return { icon: 'person-add', color: G };
      case 'COMMUNITY_JOIN': return { icon: 'people', color: G };
      case 'EVENT_REMINDER': return { icon: 'calendar', color: '#F59E0B' };
      case 'MENTION': return { icon: 'at', color: '#8B5CF6' };
      default: return { icon: 'notifications', color: G };
    }
  };

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <View style={[styles.modernCard, { backgroundColor: SURF, borderColor: BORDER }]}>
      <Text style={[styles.cardSectionHeader, { color: TEXT }]}>Community Activity</Text>
      {isLoading && (
        <Text style={{ color: TEXT3, textAlign: 'center', paddingVertical: 24, fontSize: 13 }}>Loading activity...</Text>
      )}
      {!isLoading && notifications.length === 0 && (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="notifications-off-outline" size={36} color={TEXT3} />
          <Text style={{ color: TEXT3, textAlign: 'center', fontSize: 13, marginTop: 8 }}>No updates yet.</Text>
        </View>
      )}
      {notifications.map((n, i) => {
        const { icon, color } = getIcon(n.type);
        return (
          <View
            key={n.id}
            style={[
              styles.modernUpdateRow,
              { borderBottomColor: BORDER, borderBottomWidth: i < notifications.length - 1 ? StyleSheet.hairlineWidth : 0 },
            ]}
          >
            <View style={[styles.updateIconRing, { backgroundColor: color + '14' }]}>
              <Ionicons name={icon as any} size={17} color={color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.updateText, { color: TEXT }]}>{n.body || n.type}</Text>
              <Text style={[styles.updateTime, { color: TEXT3 }]}>{formatTime(n.createdAt)}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function ProfileScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: SW } = useWindowDimensions();

  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [bioExpanded, setBioExpanded] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const { user, updateProfile } = useAuthStore();
  const { data: posts = [], isLoading: postsLoading } = useUserPostsQuery(user?.id || '');
  const { data: unreadCount = 0 } = useUnreadCountQuery();
  const { data: conversations = [] } = useChatsQuery();
  const unreadChatCount = useMemo(
    () => conversations.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0),
    [conversations]
  );
  const { data: connectionCount } = useMyConnectionCountQuery(user?.id || '');
  useConnectionSocket(user?.id);
  const { data: jobApplications = [] } = useUserJobApplicationsQuery(user?.id || '');

  useChatSocket();
  useNotificationSocket();

  useEffect(() => {
    apiClient.get('/users/me').then((res) => {
      const fresh = res.data?.data ?? res.data;
      if (fresh) updateProfile(fresh);
    }).catch(() => {});
  }, []);

  const { data: allEvents = [] } = useEventsQuery();
  const { data: myCreatedEvents = [] } = useMyEventsQuery();
  const myEvents = myCreatedEvents.length > 0
    ? myCreatedEvents
    : allEvents.filter((e: any) => e.creatorId === user?.id);

  const [forwardSheetVisible, setForwardSheetVisible] = useState(false);
  const [selectedForwardPostId, setSelectedForwardPostId] = useState<string | null>(null);
  const [commentSheetVisible, setCommentSheetVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [participantsSheetVisible, setParticipantsSheetVisible] = useState(false);
  const [selectedParticipantEvent, setSelectedParticipantEvent] = useState<{ id: string; title: string; count: number } | null>(null);
  const showToast = useToastStore((state) => state.showToast);

  const handleCommentPress = (postId: string) => {
    setSelectedPostId(postId);
    setCommentSheetVisible(true);
  };

  const handleForwardPress = (postId: string) => {
    setSelectedForwardPostId(postId);
    setForwardSheetVisible(true);
  };

  const handleShare = useCallback(async () => {
    const ok = await shareAppLink(user?.displayName || 'A friend', user?.id);
    showToast(
      ok ? 'App link copied! Share it to invite friends.' : 'Could not share',
      ok ? 'success' : 'error'
    );
  }, [user, showToast]);

  const handleInviteFamily = useCallback(async () => {
    const ok = await shareAppLink(user?.displayName || 'A friend', user?.id);
    showToast(
      ok ? 'Invite link shared!' : 'Could not send invite',
      ok ? 'success' : 'error'
    );
  }, [user, showToast]);

  const G = colors.primary;
  const BG = colors.background;
  const SURF = colors.surface;
  const BORDER = colors.border;
  const TEXT = colors.text;
  const TEXT2 = colors.textSecondary;
  const TEXT3 = colors.textMuted;

  const navBgOpacity = scrollY.interpolate({
    inputRange: [90, 160],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const navTitleOpacity = scrollY.interpolate({
    inputRange: [120, 170],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      {/* ── Top Bar Overlay ────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.navbar,
          {
            paddingTop: insets.top,
            height: insets.top + 54,
            borderBottomColor: BORDER,
          },
        ]}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: SURF,
              opacity: navBgOpacity,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: BORDER,
            },
          ]}
        />
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          style={[styles.floatingActionBtn, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.85)' }]}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={TEXT} />
        </TouchableOpacity>

        <Animated.Text style={[styles.navTitle, { color: TEXT, opacity: navTitleOpacity }]} numberOfLines={1}>
          {user?.displayName || 'Profile'}
        </Animated.Text>

        <View style={styles.navRight}>
          <TouchableOpacity
            style={[styles.floatingActionBtn, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.85)' }]}
            onPress={() => router.push('/notifications' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={19} color={TEXT} />
            {unreadCount > 0 && (
              <View style={[styles.bellBadge, { backgroundColor: colors.secondary || '#EF4444' }]}>
                <Text style={styles.bellBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.floatingActionBtn, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.85)' }]}
            onPress={() => router.push('/chat' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={19} color={TEXT} />
            {unreadChatCount > 0 && (
              <View style={[styles.bellBadge, { backgroundColor: '#EF4444' }]}>
                <Text style={styles.bellBadgeText}>{unreadChatCount > 99 ? '99+' : unreadChatCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.floatingActionBtn, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.85)' }]}
            onPress={() => router.push('/settings' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={19} color={TEXT} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(96, insets.bottom + 82) }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        {/* ── Cover Hero ─────────────────────────────────────────────── */}
        <View style={[styles.coverContainer, { height: SW >= 768 ? 280 : COVER_HEIGHT }]}>
          {user?.coverImage || user?.bannerUrl ? (
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

        {/* ── Profile Masthead ─────────────────────────────────────── */}
        <View style={styles.profileMasthead}>
          <View style={styles.mastheadTopRow}>
            <View style={[styles.avatarBorderWrapper, { borderColor: BG, backgroundColor: BG }]}>
              <Avatar url={user?.avatarUrl} name={user?.displayName} size={92} />
            </View>

            <View style={styles.topActionGroup}>
              <Button
                title="Edit"
                icon="create-outline"
                variant="primary"
                size="sm"
                onPress={() => router.push('/edit-profile' as any)}
              />
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
              <Pressable
                accessibilityLabel="Open media gallery"
                style={({ pressed }) => [
                  styles.iconUtilityButton,
                  { borderColor: BORDER, backgroundColor: pressed ? colors.elevation1 : SURF },
                ]}
                onPress={() => router.push('/(tabs)/media-gallery' as any)}
              >
                <Ionicons name="images-outline" size={17} color={TEXT} />
              </Pressable>
            </View>
          </View>

          {/* Identity Info */}
          <View style={styles.identityBlock}>
            <View style={styles.nameBadgeRow}>
              <Text style={[styles.profileName, { color: TEXT }]}>{user?.displayName || 'User'}</Text>
              <View style={[styles.verifiedBadge, { backgroundColor: G }]}>
                <Ionicons name="checkmark-sharp" size={10} color="#FFF" />
              </View>
            </View>

            <View style={styles.metaPillsRow}>
              <View style={[styles.badgePill, { backgroundColor: G + '15' }]}>
                <Ionicons name="sparkles" size={11} color={G} />
                <Text style={[styles.badgePillText, { color: G }]}>{user?.occupation || 'Member'}</Text>
              </View>
              {user?.village ? (
                <View style={[styles.badgePill, { backgroundColor: isDark ? '#27272A' : '#F4F4F5' }]}>
                  <Ionicons name="location-outline" size={11} color={TEXT3} />
                  <Text style={[styles.badgePillText, { color: TEXT3 }]}>{user.village}</Text>
                </View>
              ) : null}
            </View>

            <Text style={[styles.bioText, { color: TEXT2 }]} numberOfLines={bioExpanded ? undefined : 2}>
              {user?.bio || 'No bio added yet.'}
            </Text>
            {!bioExpanded && (user?.bio?.length ?? 0) > 85 && (
              <TouchableOpacity onPress={() => setBioExpanded(true)}>
                <Text style={[styles.expandBioText, { color: G }]}>Show more</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Stats Bar with Icons */}
          <View style={[styles.statsCardWrapper, { backgroundColor: SURF, borderColor: BORDER }]}>
            {[
              {
                label: 'Connections',
                value: (connectionCount ?? user?.followersCount ?? 0).toString(),
                icon: 'people',
                color: G,
                bg: G + '14',
                onPress: undefined,
              },
              {
                label: 'Following',
                value: (user?.followingCount || 0).toString(),
                icon: 'person-add',
                color: '#3B82F6',
                bg: '#3B82F614',
                onPress: undefined,
              },
              {
                label: 'Applied',
                value: jobApplications.length.toString(),
                icon: 'briefcase',
                color: '#8B5CF6',
                bg: '#8B5CF614',
                onPress: () => router.push('/jobs/my-applications' as any),
              },
              {
                label: 'Member',
                value: (user?.joinedAt || user?.createdAt) ? new Date(user.joinedAt || user.createdAt!).getFullYear().toString() : '—',
                icon: 'ribbon',
                color: '#F59E0B',
                bg: '#F59E0B14',
                onPress: undefined,
              },
            ].map((stat, index, arr) => (
              <TouchableOpacity
                key={stat.label}
                style={[
                  styles.statBlock,
                  index < arr.length - 1 && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: BORDER },
                ]}
                onPress={stat.onPress}
                disabled={!stat.onPress}
                activeOpacity={0.7}
              >
                <View style={[styles.statIconBadge, { backgroundColor: stat.bg }]}>
                  <Ionicons name={stat.icon as any} size={15} color={stat.color} />
                </View>
                <Text style={[styles.statValue, { color: TEXT }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: TEXT3 }]}>{stat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Segmented Tab Bar ─────────────────────────────────────────────── */}
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

        {/* ── Tab Content ─────────────────────────────────────────── */}
        <View style={styles.contentArea}>
          {/* POSTS TAB */}
          {activeTab === 'posts' && (
            <View style={{ gap: 12 }}>
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post as any}
                  onCommentPress={handleCommentPress}
                  onForwardPress={handleForwardPress}
                  horizontalGutter={0}
                />
              ))}
              {postsLoading && (
                <View style={[styles.modernCard, { backgroundColor: SURF, borderColor: BORDER, paddingVertical: 28, alignItems: 'center' }]}>
                  <Text style={{ color: TEXT3, fontSize: 13 }}>Loading posts...</Text>
                </View>
              )}
              {posts.length === 0 && !postsLoading && (
                <View style={[styles.modernCard, styles.emptyCard, { backgroundColor: SURF, borderColor: BORDER }]}>
                  <View style={[styles.emptyIconCircle, { backgroundColor: G + '12' }]}>
                    <Ionicons name="document-text-outline" size={32} color={G} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: TEXT }]}>No Posts Yet</Text>
                  <Text style={[styles.emptySubtitle, { color: TEXT3 }]}>
                    You haven't shared any updates with your network yet.
                  </Text>
                  <Button
                    title="Create Post"
                    icon="add"
                    variant="primary"
                    size="md"
                    onPress={() => router.push('/create' as any)}
                    style={{ marginTop: 8 }}
                  />
                </View>
              )}
            </View>
          )}

          {/* ABOUT TAB */}
          {activeTab === 'about' && (
            <View style={{ gap: 14 }}>
              {/* Profile Completeness Nudge (if village or occupation missing) */}
              {(!user?.village || !user?.occupation) && (
                <View style={[styles.completionBanner, { backgroundColor: G + '10', borderColor: G + '25' }]}>
                  <View style={[styles.completionIconCircle, { backgroundColor: G }]}>
                    <Ionicons name="sparkles" size={16} color="#FFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.completionTitle, { color: TEXT }]}>Complete Your Profile</Text>
                    <Text style={[styles.completionSubtitle, { color: TEXT2 }]}>
                      Add your native place and profession to connect better with community members.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.completionBtn, { backgroundColor: G }]}
                    onPress={() => router.push('/(tabs)/edit-profile' as any)}
                  >
                    <Text style={styles.completionBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Card 1: Personal & Heritage */}
              <View style={[styles.modernCard, { backgroundColor: SURF, borderColor: BORDER }]}>
                <View style={styles.cardHeaderWithAction}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="person-circle-outline" size={18} color={G} />
                    <Text style={[styles.cardSectionHeader, { color: TEXT, marginBottom: 0 }]}>Personal Details</Text>
                  </View>
                  <TouchableOpacity onPress={() => router.push('/(tabs)/edit-profile' as any)}>
                    <Text style={[styles.headerActionLink, { color: G }]}>Edit ✎</Text>
                  </TouchableOpacity>
                </View>

                {/* Native Place */}
                <View style={[styles.detailItemRow, { borderBottomColor: BORDER, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                  <View style={[styles.detailIconContainer, { backgroundColor: G + '14' }]}>
                    <Ionicons name="location" size={16} color={G} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailLabel, { color: TEXT3 }]}>Native Place / Village</Text>
                    {user?.village ? (
                      <Text style={[styles.detailValue, { color: TEXT }]}>{user.village}</Text>
                    ) : (
                      <TouchableOpacity onPress={() => router.push('/(tabs)/edit-profile' as any)}>
                        <Text style={[styles.detailActionLink, { color: G }]}>+ Add your native village</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Profession / Occupation */}
                <View style={[styles.detailItemRow, { borderBottomColor: BORDER, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                  <View style={[styles.detailIconContainer, { backgroundColor: '#3B82F614' }]}>
                    <Ionicons name="briefcase" size={16} color="#3B82F6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailLabel, { color: TEXT3 }]}>Profession / Occupation</Text>
                    {user?.occupation ? (
                      <Text style={[styles.detailValue, { color: TEXT }]}>{user.occupation}</Text>
                    ) : (
                      <TouchableOpacity onPress={() => router.push('/(tabs)/edit-profile' as any)}>
                        <Text style={[styles.detailActionLink, { color: G }]}>+ Add your profession</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Languages */}
                <View style={[styles.detailItemRow, { borderBottomColor: BORDER, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                  <View style={[styles.detailIconContainer, { backgroundColor: '#8B5CF614' }]}>
                    <Ionicons name="language" size={16} color="#8B5CF6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailLabel, { color: TEXT3 }]}>Languages Known</Text>
                    {user?.languages ? (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                        {user.languages.split(',').map((lang, idx) => (
                          <View key={idx} style={[styles.aboutPill, { backgroundColor: isDark ? '#27272A' : '#F4F4F5' }]}>
                            <Text style={[styles.aboutPillText, { color: TEXT2 }]}>{lang.trim()}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <TouchableOpacity onPress={() => router.push('/(tabs)/edit-profile' as any)}>
                        <Text style={[styles.detailActionLink, { color: G }]}>+ Add languages known</Text>
                      </TouchableOpacity>
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
                    {user?.interests ? (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                        {user.interests.split(',').map((interest, idx) => (
                          <View key={idx} style={[styles.aboutPill, { backgroundColor: G + '12' }]}>
                            <Text style={[styles.aboutPillText, { color: G }]}>{interest.trim()}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <TouchableOpacity onPress={() => router.push('/(tabs)/edit-profile' as any)}>
                        <Text style={[styles.detailActionLink, { color: G }]}>+ Add interests</Text>
                      </TouchableOpacity>
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
                    <Text style={[styles.metricValue, { color: TEXT }]}>{user?.communitiesCount ?? 0}</Text>
                    <Text style={[styles.metricLabel, { color: TEXT3 }]}>Communities</Text>
                  </View>

                  <View style={[styles.metricCard, { backgroundColor: isDark ? '#27272A50' : '#F9FAF8', borderColor: BORDER }]}>
                    <View style={[styles.metricIconBg, { backgroundColor: '#3B82F614' }]}>
                      <Ionicons name="calendar" size={16} color="#3B82F6" />
                    </View>
                    <Text style={[styles.metricValue, { color: TEXT }]}>{myEvents.length}</Text>
                    <Text style={[styles.metricLabel, { color: TEXT3 }]}>Events Joined</Text>
                  </View>

                  <View style={[styles.metricCard, { backgroundColor: isDark ? '#27272A50' : '#F9FAF8', borderColor: BORDER }]}>
                    <View style={[styles.metricIconBg, { backgroundColor: '#8B5CF614' }]}>
                      <Ionicons name="people" size={16} color="#8B5CF6" />
                    </View>
                    <Text style={[styles.metricValue, { color: TEXT }]}>{typeof connectionCount === 'number' ? connectionCount : (connectionCount as any)?.count ?? 0}</Text>
                    <Text style={[styles.metricLabel, { color: TEXT3 }]}>Connections</Text>
                  </View>

                  <View style={[styles.metricCard, { backgroundColor: isDark ? '#27272A50' : '#F9FAF8', borderColor: BORDER }]}>
                    <View style={[styles.metricIconBg, { backgroundColor: '#F59E0B14' }]}>
                      <Ionicons name="ribbon" size={16} color="#F59E0B" />
                    </View>
                    <Text style={[styles.metricValue, { color: TEXT }]}>
                      {(user?.joinedAt || user?.createdAt)
                        ? new Date(user?.joinedAt || user?.createdAt!).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                        : '2026'}
                    </Text>
                    <Text style={[styles.metricLabel, { color: TEXT3 }]}>Member Since</Text>
                  </View>
                </View>
              </View>

              {/* Card 3: Account & Membership */}
              <View style={[styles.modernCard, { backgroundColor: SURF, borderColor: BORDER }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <Ionicons name="shield-checkmark-outline" size={17} color={G} />
                  <Text style={[styles.cardSectionHeader, { color: TEXT, marginBottom: 0 }]}>Membership & Security</Text>
                </View>

                <View style={[styles.detailItemRow, { borderBottomColor: BORDER, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                  <View style={[styles.detailIconContainer, { backgroundColor: G + '14' }]}>
                    <Ionicons name="shield-checkmark" size={16} color={G} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailLabel, { color: TEXT3 }]}>Verification Status</Text>
                    <Text style={[styles.detailValue, { color: G, fontWeight: '700' }]}>
                      {user?.isVerified ? '✓ Verified Community Member' : 'Active Community Member'}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailItemRow}>
                  <View style={[styles.detailIconContainer, { backgroundColor: '#6B728014' }]}>
                    <Ionicons name="lock-closed" size={16} color={TEXT3} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailLabel, { color: TEXT3 }]}>Account Handle</Text>
                    <Text style={[styles.detailValue, { color: TEXT }]}>@{user?.username || 'user'}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* EVENTS TAB */}
          {activeTab === 'events' && (
            <View style={[styles.modernCard, { backgroundColor: SURF, borderColor: BORDER }]}>
              <View style={styles.cardHeaderWithAction}>
                <Text style={[styles.cardSectionHeader, { color: TEXT, marginBottom: 0 }]}>Events</Text>
                <TouchableOpacity onPress={() => router.push('/create/event' as any)}>
                  <Text style={[styles.headerActionLink, { color: G }]}>+ New</Text>
                </TouchableOpacity>
              </View>

              {myEvents.length === 0 && (
                <View style={styles.emptyStateContainer}>
                  <Ionicons name="calendar-clear-outline" size={38} color={TEXT3} />
                  <Text style={[styles.emptySubtitle, { color: TEXT3, marginTop: 6 }]}>No events hosted or saved.</Text>
                </View>
              )}

              {myEvents.map((event: any, i: number) => {
                const isPast = new Date(event.startsAt) < new Date();
                const dateStr = new Date(event.startsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                const timeStr = new Date(event.startsAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                const joinedCount = event.interestedCount ?? event.rsvpCount ?? 0;

                return (
                  <View
                    key={event.id}
                    style={[
                      styles.eventCardRow,
                      { borderBottomColor: BORDER, borderBottomWidth: i < myEvents.length - 1 ? StyleSheet.hairlineWidth : 0 },
                    ]}
                  >
                    {/* Left: Date Box aligned to top */}
                    <View style={[styles.eventCalendarBox, { backgroundColor: isPast ? (isDark ? '#27272A' : '#F1F5F9') : G + '15' }]}>
                      <Text style={[styles.eventBoxMonth, { color: isPast ? TEXT3 : G }]}>
                        {new Date(event.startsAt).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                      </Text>
                      <Text style={[styles.eventBoxDay, { color: isPast ? TEXT3 : G }]}>
                        {new Date(event.startsAt).getDate()}
                      </Text>
                    </View>

                    {/* Right: Main Content Area */}
                    <View style={{ flex: 1 }}>
                      {/* Top line: Title & Status Badge */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <Text style={[styles.eventRowTitle, { color: TEXT, flex: 1 }]} numberOfLines={1}>
                          {event.title}
                        </Text>
                        <View
                          style={[
                            styles.eventBadge,
                            { backgroundColor: isPast ? (isDark ? '#27272A' : '#F4F4F5') : (event.status === 'PENDING' ? '#FEF3C7' : G + '18') },
                          ]}
                        >
                          <Text style={[styles.eventBadgeText, { color: isPast ? TEXT3 : (event.status === 'PENDING' ? '#D97706' : G) }]}>
                            {isPast ? 'Past' : event.status === 'PENDING' ? 'Pending' : 'Upcoming'}
                          </Text>
                        </View>
                      </View>

                      {/* Time row */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                        <Ionicons name="time-outline" size={13} color={TEXT3} />
                        <Text style={[styles.eventRowMeta, { color: TEXT3 }]}>
                          {dateStr} • {timeStr}
                        </Text>
                      </View>

                      {/* Location row */}
                      {event.location ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                          <Ionicons name="location-outline" size={13} color={TEXT3} />
                          <Text style={[styles.eventRowMeta, { color: TEXT3 }]} numberOfLines={1}>
                            {event.location}
                          </Text>
                        </View>
                      ) : null}

                      {/* Bottom Footer Line: Joined Badge + Interested Badge (Left) + View Event Action (Right) */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, gap: 6, flexWrap: 'wrap' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {/* 👥 Joined Count Badge */}
                          <TouchableOpacity
                            style={[styles.joinedCountBadge, { backgroundColor: G + '12', borderColor: G + '25' }]}
                            activeOpacity={0.7}
                            onPress={() => {
                              setSelectedParticipantEvent({ id: event.id, title: event.title, count: joinedCount });
                              setParticipantsSheetVisible(true);
                            }}
                          >
                            <Ionicons name="people" size={13} color={G} />
                            <Text style={[styles.joinedCountText, { color: G }]}>
                              <Text style={{ fontWeight: '800' }}>{joinedCount}</Text> joined
                            </Text>
                            <Ionicons name="chevron-forward" size={11} color={G} style={{ opacity: 0.8 }} />
                          </TouchableOpacity>

                          {/* ⭐ Interested Count Badge */}
                          <View style={[styles.interestCountBadge, { backgroundColor: '#F59E0B12', borderColor: '#F59E0B25' }]}>
                            <Ionicons name="star" size={12} color="#D97706" />
                            <Text style={[styles.interestCountText, { color: '#D97706' }]}>
                              <Text style={{ fontWeight: '800' }}>{event.interestedCount ?? 0}</Text> interested
                            </Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          onPress={() => router.push(`/events/${event.id}` as any)}
                          style={styles.viewEventLink}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.viewEventLinkText, { color: G }]}>View Event →</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* FAMILY TAB */}
          {activeTab === 'family' && (
            <View style={[styles.modernCard, styles.emptyCard, { backgroundColor: SURF, borderColor: BORDER }]}>
              <View style={[styles.emptyIconCircle, { backgroundColor: G + '12', width: 68, height: 68, borderRadius: 34 }]}>
                <Ionicons name="people" size={34} color={G} />
              </View>
              <Text style={[styles.emptyTitle, { color: TEXT, marginTop: 4 }]}>Family Directory</Text>
              <Text style={[styles.emptySubtitle, { color: TEXT2, paddingHorizontal: 16 }]}>
                Connect and sync with your extended family members across the network.
              </Text>
              <Button
                title="Invite Family Member"
                icon="person-add-outline"
                variant="primary"
                size="md"
                onPress={handleInviteFamily}
                style={{ marginTop: 12 }}
              />
            </View>
          )}

          {/* UPDATES TAB */}
          {activeTab === 'updates' && <UpdatesTab />}
        </View>
      </ScrollView>

      <CommentSheet postId={selectedPostId} visible={commentSheetVisible} onClose={() => setCommentSheetVisible(false)} />
      <ForwardSheet
        postId={selectedForwardPostId}
        visible={forwardSheetVisible}
        onClose={() => setForwardSheetVisible(false)}
        onNativeShare={async () => {
          try {
            await Share.share({ message: `Check out this profile update!` });
          } catch (_) {}
        }}
      />
      <EventParticipantsSheet
        eventId={selectedParticipantEvent?.id || null}
        eventTitle={selectedParticipantEvent?.title}
        count={selectedParticipantEvent?.count}
        visible={participantsSheetVisible}
        onClose={() => setParticipantsSheetVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Top Nav
  navbar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 100,
    justifyContent: 'space-between',
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: 12,
  },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  floatingActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  bellBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '800' },

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
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  primaryActionButtonText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
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
  nameBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  profileName: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
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
    flex: 1,
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
  cardHeaderWithAction: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  headerActionLink: { fontSize: 13, fontWeight: '700' },

  // Details Tab
  detailItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  detailIconContainer: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  detailLabel: { fontSize: 11.5, fontWeight: '500' },
  detailValue: { fontSize: 14, fontWeight: '600', marginTop: 1 },
  detailActionLink: { fontSize: 12.5, fontWeight: '600', marginTop: 2 },

  // About Tab Enhancements
  completionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  completionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionTitle: { fontSize: 13.5, fontWeight: '700' },
  completionSubtitle: { fontSize: 11.5, lineHeight: 16, marginTop: 1 },
  completionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  completionBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
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

  // Events Tab
  eventCardRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 14, gap: 12 },
  eventCalendarBox: { width: 46, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  eventBoxMonth: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.5 },
  eventBoxDay: { fontSize: 15, fontWeight: '800', marginTop: -1 },
  eventRowTitle: { fontSize: 15, fontWeight: '700' },
  eventRowMeta: { fontSize: 12, fontWeight: '500' },
  eventBadge: { paddingHorizontal: 8, paddingVertical: 3.5, borderRadius: 6 },
  eventBadgeText: { fontSize: 10.5, fontWeight: '700' },
  joinedCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  joinedCountText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  viewEventLink: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  viewEventLinkText: {
    fontSize: 12,
    fontWeight: '700',
  },
  interestCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  interestCountText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Updates Tab
  modernUpdateRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, gap: 12 },
  updateIconRing: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  updateText: { fontSize: 13.5, lineHeight: 18.5, fontWeight: '500' },
  updateTime: { fontSize: 11.5, marginTop: 2 },

  // Empty States
  emptyCard: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyStateContainer: { alignItems: 'center', paddingVertical: 24 },
  emptyIconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
});