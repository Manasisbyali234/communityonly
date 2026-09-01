import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
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
import { useCommunitiesQuery } from '../../api/community';
import { apiClient } from '../../api/client';
import { useMyConnectionCountQuery, useConnectionSocket } from '../../api/connections';
import { shareAppLink } from '../../utils/shareUtils';
import { useUserJobApplicationsQuery } from '../../api/jobs';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import EventParticipantsSheet from '../../components/feed/EventParticipantsSheet';

type ProfileTab = 'about' | 'posts' | 'communities' | 'events' | 'family' | 'updates';

const COVER_HEIGHT = 200;

const TABS: { id: ProfileTab; label: string; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'about', label: 'About', icon: 'person-outline', activeIcon: 'person' },
  { id: 'posts', label: 'Posts', icon: 'grid-outline', activeIcon: 'grid' },
  { id: 'communities', label: 'Communities', icon: 'globe-outline', activeIcon: 'globe' },
  { id: 'events', label: 'Events', icon: 'calendar-outline', activeIcon: 'calendar' },
  { id: 'family', label: 'Family', icon: 'people-outline', activeIcon: 'people' },
  { id: 'updates', label: 'Activity', icon: 'sparkles-outline', activeIcon: 'sparkles' },
];

function UpdatesTab() {
  const { colors, isDark } = useTheme();
  const { data: notifications = [], isLoading } = useNotificationsQuery();
  const SURF = colors.surface;
  const BORDER = colors.border;
  const TEXT = colors.text;
  const TEXT3 = colors.textMuted;
  const G = colors.primary;

  const getIcon = (type: string): { icon: keyof typeof Ionicons.glyphMap; color: string } => {
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
      <View style={styles.cardHeaderTitleRow}>
        <View style={[styles.sectionHeaderIconBox, { backgroundColor: G + '14' }]}>
          <Ionicons name="sparkles" size={15} color={G} />
        </View>
        <Text style={[styles.cardSectionHeader, { color: TEXT }]}>Recent Activity</Text>
      </View>

      {isLoading && (
        <Text style={{ color: TEXT3, textAlign: 'center', paddingVertical: 24, fontSize: 13 }}>Loading activity...</Text>
      )}
      {!isLoading && notifications.length === 0 && (
        <View style={styles.emptyStateContainer}>
          <View style={[styles.emptyIconCircle, { backgroundColor: G + '10' }]}>
            <Ionicons name="notifications-off-outline" size={28} color={G} />
          </View>
          <Text style={[styles.emptyTitle, { color: TEXT, fontSize: 15, marginTop: 8 }]}>No Activity Yet</Text>
          <Text style={{ color: TEXT3, textAlign: 'center', fontSize: 12.5, marginTop: 4 }}>
            Community interactions and notifications will appear here.
          </Text>
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
              <Ionicons name={icon} size={16} color={color} />
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

  const [activeTab, setActiveTab] = useState<ProfileTab>('about');
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

  const { data: allCommunities = [], isLoading: commsLoading } = useCommunitiesQuery();
  const myCommunities = useMemo(() => {
    return allCommunities.filter((c: any) =>
      c.isJoined ||
      (user?.id && (c.creatorId === user.id || c.ownerId === user.id)) ||
      (c.role && c.role !== 'NONE')
    );
  }, [allCommunities, user]);

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

  const memberYear = (user?.joinedAt || user?.createdAt)
    ? new Date(user.joinedAt || user.createdAt!).getFullYear().toString()
    : '2026';

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      {/* ── Top Bar Overlay ────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.navbar,
          {
            paddingTop: insets.top,
            height: insets.top + 54,
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
          style={[
            styles.floatingActionBtn,
            { backgroundColor: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.9)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' },
          ]}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={TEXT} />
        </TouchableOpacity>

        <Animated.Text style={[styles.navTitle, { color: TEXT, opacity: navTitleOpacity }]} numberOfLines={1}>
          {user?.displayName || 'Profile'}
        </Animated.Text>

        <View style={styles.navRight}>
          <TouchableOpacity
            style={[
              styles.floatingActionBtn,
              { backgroundColor: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.9)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' },
            ]}
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
            style={[
              styles.floatingActionBtn,
              { backgroundColor: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.9)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' },
            ]}
            onPress={() => router.push('/(tabs)/chat' as any)}
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
            style={[
              styles.floatingActionBtn,
              { backgroundColor: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.9)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' },
            ]}
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
            <LinearGradient
              colors={[colors.primaryLight || '#4A8505', colors.primary, colors.primaryDark || '#1E4A02']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.coverImage}
            />
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.45)']}
            style={StyleSheet.absoluteFill}
          />
        </View>

        {/* ── Profile Masthead ─────────────────────────────────────── */}
        <View style={styles.profileMasthead}>
          <View style={styles.mastheadTopRow}>
            {/* Overlapping Avatar */}
            <View style={[styles.avatarBorderWrapper, { borderColor: BG, backgroundColor: BG }]}>
              <Avatar url={user?.avatarUrl} name={user?.displayName} size={92} />
              {user?.isVerified && (
                <View style={[styles.avatarVerifiedBadge, { backgroundColor: G }]}>
                  <Ionicons name="checkmark-sharp" size={11} color="#FFF" />
                </View>
              )}
            </View>

            {/* Top Action Group */}
            <View style={styles.topActionGroup}>
              <Pressable
                accessibilityLabel="Edit profile"
                style={({ pressed }) => [
                  styles.iconUtilityButton,
                  {
                    backgroundColor: G,
                    borderColor: G,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                onPress={() => router.push('/edit-profile' as any)}
              >
                <Ionicons name="create-outline" size={17} color="#FFF" />
              </Pressable>

              <Pressable
                accessibilityLabel="Share profile"
                style={({ pressed }) => [
                  styles.iconUtilityButton,
                  { borderColor: BORDER, backgroundColor: pressed ? (isDark ? '#27272A' : '#F4F4F5') : SURF },
                ]}
                onPress={handleShare}
              >
                <Ionicons name="share-social-outline" size={17} color={TEXT} />
              </Pressable>

              <Pressable
                accessibilityLabel="Open media gallery"
                style={({ pressed }) => [
                  styles.iconUtilityButton,
                  { borderColor: BORDER, backgroundColor: pressed ? (isDark ? '#27272A' : '#F4F4F5') : SURF },
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
              {user?.username ? (
                <Text style={[styles.profileUsername, { color: TEXT3 }]}>@{user.username}</Text>
              ) : null}
            </View>

            {/* Meta Tags Row */}
            <View style={styles.metaPillsRow}>
              {user?.occupation ? (
                <View style={[styles.badgePill, { backgroundColor: G + '14', borderColor: G + '25' }]}>
                  <Ionicons name="briefcase" size={12} color={G} />
                  <Text style={[styles.badgePillText, { color: G }]}>{user.occupation}</Text>
                </View>
              ) : null}
              {user?.village ? (
                <View style={[styles.badgePill, { backgroundColor: isDark ? '#27272A' : '#F4F4F5', borderColor: BORDER }]}>
                  <Ionicons name="location-sharp" size={12} color={TEXT2} />
                  <Text style={[styles.badgePillText, { color: TEXT2 }]}>{user.village}</Text>
                </View>
              ) : null}
              {user?.isVerified ? (
                <View style={[styles.badgePill, { backgroundColor: '#10B98114', borderColor: '#10B98130' }]}>
                  <Ionicons name="shield-checkmark" size={12} color="#10B981" />
                  <Text style={[styles.badgePillText, { color: '#10B981' }]}>Verified</Text>
                </View>
              ) : null}
            </View>

            {/* Bio Text */}
            <Text style={[styles.bioText, { color: TEXT2 }]} numberOfLines={bioExpanded ? undefined : 2}>
              {user?.bio || 'Passionate community member connecting traditions and future growth.'}
            </Text>
            {(user?.bio?.length ?? 0) > 85 && (
              <TouchableOpacity onPress={() => setBioExpanded(!bioExpanded)}>
                <Text style={[styles.expandBioText, { color: G }]}>
                  {bioExpanded ? 'See less' : 'See more'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Sleek Stats Metrics Bar ───────────────────────────────── */}
          <View style={[styles.statsCardWrapper, { backgroundColor: SURF, borderColor: BORDER }]}>
            {[
              {
                label: 'Connections',
                value: (connectionCount ?? user?.followersCount ?? 0).toString(),
                icon: 'people',
                color: G,
                bg: G + '14',
                onPress: () => router.push('/(tabs)/chat' as any),
              },
              {
                label: 'Following',
                value: (user?.followingCount || 0).toString(),
                icon: 'person-add',
                color: '#3B82F6',
                bg: '#3B82F614',
                onPress: () => router.push('/(tabs)/explore?tab=members' as any),
              },
              {
                label: 'Events',
                value: myEvents.length.toString(),
                icon: 'calendar',
                color: '#0891B2',
                bg: '#0891B214',
                onPress: () => setActiveTab('events'),
              },
              {
                label: 'Member Since',
                value: memberYear,
                icon: 'ribbon',
                color: '#F59E0B',
                bg: '#F59E0B14',
                onPress: () => router.push('/edit-profile' as any),
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
                <View style={styles.statValueRow}>
                  <View style={[styles.statIconBadge, { backgroundColor: stat.bg }]}>
                    <Ionicons name={stat.icon as any} size={13} color={stat.color} />
                  </View>
                  <Text style={[styles.statValue, { color: TEXT }]}>{stat.value}</Text>
                </View>
                <Text style={[styles.statLabel, { color: TEXT3 }]}>{stat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Segmented Pill Tab Bar ────────────────────────────────────────── */}
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
                      ? { backgroundColor: 'rgb(45, 106, 45)', borderColor: 'transparent' }
                      : { backgroundColor: SURF, borderColor: BORDER },
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
                  <Ionicons name={active ? tab.activeIcon : tab.icon} size={16} color={active ? '#FFF' : TEXT3} />
                  <Text style={[styles.tabLabel, { color: active ? '#FFF' : TEXT2, fontWeight: active ? '700' : '600' }]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Tab Content ─────────────────────────────────────────── */}
        <View style={styles.contentArea}>
          {/* 1. ABOUT TAB */}
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

              {/* Card 1: Personal & Roots Bento */}
              <View style={[styles.modernCard, { backgroundColor: SURF, borderColor: BORDER }]}>
                <View style={styles.cardHeaderWithAction}>
                  <View style={styles.cardHeaderTitleRow}>
                    <View style={[styles.sectionHeaderIconBox, { backgroundColor: G + '14' }]}>
                      <Ionicons name="person-circle-outline" size={16} color={G} />
                    </View>
                    <Text style={[styles.cardSectionHeader, { color: TEXT, marginBottom: 0 }]}>Personal Details</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => router.push('/(tabs)/edit-profile' as any)}
                    style={[styles.smallEditChip, { backgroundColor: G + '10' }]}
                  >
                    <Ionicons name="create-outline" size={13} color={G} />
                    <Text style={[styles.headerActionLink, { color: G }]}>Edit</Text>
                  </TouchableOpacity>
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
                    {user?.village ? (
                      <Text style={[styles.detailTileValue, { color: TEXT }]} numberOfLines={1}>{user.village}</Text>
                    ) : (
                      <TouchableOpacity onPress={() => router.push('/(tabs)/edit-profile' as any)}>
                        <Text style={[styles.detailActionLink, { color: G, fontSize: 12 }]}>+ Add village</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Profession / Occupation */}
                  <View style={[styles.detailTile, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F9FAFB', borderColor: BORDER }]}>
                    <View style={styles.detailTileHeader}>
                      <View style={[styles.detailTileIcon, { backgroundColor: '#3B82F614' }]}>
                        <Ionicons name="briefcase" size={13} color="#3B82F6" />
                      </View>
                      <Text style={[styles.detailTileLabel, { color: TEXT3 }]} numberOfLines={1}>Profession</Text>
                    </View>
                    {user?.occupation ? (
                      <Text style={[styles.detailTileValue, { color: TEXT }]} numberOfLines={1}>{user.occupation}</Text>
                    ) : (
                      <TouchableOpacity onPress={() => router.push('/(tabs)/edit-profile' as any)}>
                        <Text style={[styles.detailActionLink, { color: G, fontSize: 12 }]}>+ Add profession</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Languages */}
                  <View style={[styles.detailTile, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F9FAFB', borderColor: BORDER }]}>
                    <View style={styles.detailTileHeader}>
                      <View style={[styles.detailTileIcon, { backgroundColor: '#8B5CF614' }]}>
                        <Ionicons name="language" size={13} color="#8B5CF6" />
                      </View>
                      <Text style={[styles.detailTileLabel, { color: TEXT3 }]} numberOfLines={1}>Languages</Text>
                    </View>
                    {user?.languages ? (
                      <View style={styles.tilePillsWrap}>
                        {user.languages.split(',').map((lang, idx) => (
                          <View key={idx} style={[styles.aboutPill, { backgroundColor: isDark ? '#27272A' : '#F4F4F5' }]}>
                            <Text style={[styles.aboutPillText, { color: TEXT2 }]}>{lang.trim()}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <TouchableOpacity onPress={() => router.push('/(tabs)/edit-profile' as any)}>
                        <Text style={[styles.detailActionLink, { color: G, fontSize: 12 }]}>+ Add languages</Text>
                      </TouchableOpacity>
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
                    {user?.interests ? (
                      <View style={styles.tilePillsWrap}>
                        {user.interests.split(',').map((interest, idx) => (
                          <View key={idx} style={[styles.aboutPill, { backgroundColor: G + '12' }]}>
                            <Text style={[styles.aboutPillText, { color: G }]}>{interest.trim()}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <TouchableOpacity onPress={() => router.push('/(tabs)/edit-profile' as any)}>
                        <Text style={[styles.detailActionLink, { color: G, fontSize: 12 }]}>+ Add interests</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>

              {/* Card 2: Community Engagement Matrix */}
              <View style={[styles.modernCard, { backgroundColor: SURF, borderColor: BORDER }]}>
                <View style={[styles.cardHeaderTitleRow, { marginBottom: 14 }]}>
                  <View style={[styles.sectionHeaderIconBox, { backgroundColor: G + '14' }]}>
                    <Ionicons name="stats-chart-outline" size={16} color={G} />
                  </View>
                  <Text style={[styles.cardSectionHeader, { color: TEXT, marginBottom: 0 }]}>Community Engagement</Text>
                </View>

                <View style={styles.metricsGrid}>
                  <TouchableOpacity
                    style={[styles.metricCard, { backgroundColor: isDark ? '#27272A50' : '#F9FAF8', borderColor: BORDER }]}
                    onPress={() => setActiveTab('communities')}
                    activeOpacity={0.7}
                    accessibilityLabel="View communities"
                  >
                    <View style={[styles.metricIconBg, { backgroundColor: G + '14' }]}>
                      <Ionicons name="globe" size={14} color={G} />
                    </View>
                    <Text style={[styles.metricValue, { color: TEXT }]} numberOfLines={1}>{myCommunities.length || user?.communitiesCount || 0}</Text>
                    <Text style={[styles.metricLabel, { color: TEXT3 }]} numberOfLines={1}>Communities</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.metricCard, { backgroundColor: isDark ? '#27272A50' : '#F9FAF8', borderColor: BORDER }]}
                    onPress={() => router.push('/(tabs)/explore?tab=events' as any)}
                    activeOpacity={0.7}
                    accessibilityLabel="View events"
                  >
                    <View style={[styles.metricIconBg, { backgroundColor: '#3B82F614' }]}>
                      <Ionicons name="calendar" size={14} color="#3B82F6" />
                    </View>
                    <Text style={[styles.metricValue, { color: TEXT }]} numberOfLines={1}>{myEvents.length}</Text>
                    <Text style={[styles.metricLabel, { color: TEXT3 }]} numberOfLines={1}>Events</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.metricCard, { backgroundColor: isDark ? '#27272A50' : '#F9FAF8', borderColor: BORDER }]}
                    onPress={() => router.push('/(tabs)/chat' as any)}
                    activeOpacity={0.7}
                    accessibilityLabel="View connections"
                  >
                    <View style={[styles.metricIconBg, { backgroundColor: '#8B5CF614' }]}>
                      <Ionicons name="people" size={14} color="#8B5CF6" />
                    </View>
                    <Text style={[styles.metricValue, { color: TEXT }]} numberOfLines={1}>{typeof connectionCount === 'number' ? connectionCount : (connectionCount as any)?.count ?? 0}</Text>
                    <Text style={[styles.metricLabel, { color: TEXT3 }]} numberOfLines={1}>Connections</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.metricCard, { backgroundColor: isDark ? '#27272A50' : '#F9FAF8', borderColor: BORDER }]}
                    onPress={() => router.push('/edit-profile' as any)}
                    activeOpacity={0.7}
                    accessibilityLabel="Edit profile"
                  >
                    <View style={[styles.metricIconBg, { backgroundColor: '#F59E0B14' }]}>
                      <Ionicons name="ribbon" size={14} color="#F59E0B" />
                    </View>
                    <Text style={[styles.metricValue, { color: TEXT }]} numberOfLines={1}>{memberYear}</Text>
                    <Text style={[styles.metricLabel, { color: TEXT3 }]} numberOfLines={1}>Member</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Card 3: Membership & Security */}
              <View style={[styles.modernCard, { backgroundColor: SURF, borderColor: BORDER }]}>
                <View style={[styles.cardHeaderTitleRow, { marginBottom: 12 }]}>
                  <View style={[styles.sectionHeaderIconBox, { backgroundColor: G + '14' }]}>
                    <Ionicons name="shield-checkmark-outline" size={16} color={G} />
                  </View>
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
                    <Ionicons name="at" size={16} color={TEXT3} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailLabel, { color: TEXT3 }]}>Account Handle</Text>
                    <Text style={[styles.detailValue, { color: TEXT }]}>@{user?.username || 'user'}</Text>
                    <Text style={[styles.detailHint, { color: TEXT3 }]}>Your unique public handle for community mentions and interactions.</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* 2. POSTS TAB */}
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
                    <Ionicons name="document-text-outline" size={30} color={G} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: TEXT }]}>No Posts Yet</Text>
                  <Text style={[styles.emptySubtitle, { color: TEXT3 }]}>
                    You haven't shared any updates with your community network yet.
                  </Text>
                  <Button
                    title="Create Post"
                    icon="add"
                    variant="primary"
                    size="md"
                    onPress={() => router.push('/create/post' as any)}
                    style={{ marginTop: 8 }}
                  />
                </View>
              )}
            </View>
          )}

          {/* 3. COMMUNITIES TAB */}
          {activeTab === 'communities' && (
            <View style={[styles.modernCard, { backgroundColor: SURF, borderColor: BORDER }]}>
              <View style={styles.cardHeaderWithAction}>
                <View style={styles.cardHeaderTitleRow}>
                  <View style={[styles.sectionHeaderIconBox, { backgroundColor: G + '14' }]}>
                    <Ionicons name="globe" size={16} color={G} />
                  </View>
                  <Text style={[styles.cardSectionHeader, { color: TEXT, marginBottom: 0 }]}>My Communities</Text>
                  {myCommunities.length > 0 && (
                    <View style={[styles.badgeCountPill, { backgroundColor: G + '18' }]}>
                      <Text style={[styles.badgeCountText, { color: G }]}>{myCommunities.length}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/explore?tab=communities' as any)}
                  style={[styles.smallEditChip, { backgroundColor: G + '10' }]}
                >
                  <Ionicons name="compass-outline" size={13} color={G} />
                  <Text style={[styles.headerActionLink, { color: G }]}>Explore</Text>
                </TouchableOpacity>
              </View>

              {commsLoading && (
                <Text style={{ color: TEXT3, textAlign: 'center', paddingVertical: 24, fontSize: 13 }}>Loading communities...</Text>
              )}

              {!commsLoading && myCommunities.length === 0 && (
                <View style={styles.emptyStateContainer}>
                  <View style={[styles.emptyIconCircle, { backgroundColor: G + '10' }]}>
                    <Ionicons name="globe-outline" size={28} color={G} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: TEXT, fontSize: 15, marginTop: 8 }]}>No Communities Joined Yet</Text>
                  <Text style={[styles.emptySubtitle, { color: TEXT3, marginTop: 4, textAlign: 'center', paddingHorizontal: 16 }]}>
                    Join interest groups, professional hubs, or local communities to connect with members.
                  </Text>
                  <Button
                    title="Explore Communities"
                    icon="compass-outline"
                    variant="primary"
                    size="sm"
                    onPress={() => router.push('/(tabs)/explore?tab=communities' as any)}
                    style={{ marginTop: 12 }}
                  />
                </View>
              )}

              {!commsLoading && myCommunities.map((item: any, i: number) => {
                const isAdmin = user?.id && (item.creatorId === user.id || item.ownerId === user.id || item.role === 'ADMIN');
                const isMod = item.role === 'MODERATOR';
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.communityRow,
                      { borderBottomColor: BORDER, borderBottomWidth: i < myCommunities.length - 1 ? StyleSheet.hairlineWidth : 0 },
                    ]}
                    onPress={() => router.push(`/community/${item.id}` as any)}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={item.avatarUrl
                        ? { uri: item.avatarUrl }
                        : { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'C')}&background=e8f5e9&color=16a34a` }
                      }
                      style={styles.communityRowAvatar}
                      contentFit="cover"
                    />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.communityRowName, { color: TEXT }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        {isAdmin ? (
                          <View style={[styles.roleBadge, { backgroundColor: 'rgba(21, 101, 192, 0.12)', borderColor: 'rgba(21, 101, 192, 0.25)' }]}>
                            <Text style={[styles.roleBadgeText, { color: '#1565C0' }]}>Admin</Text>
                          </View>
                        ) : isMod ? (
                          <View style={[styles.roleBadge, { backgroundColor: G + '15', borderColor: G + '30' }]}>
                            <Text style={[styles.roleBadgeText, { color: G }]}>Mod</Text>
                          </View>
                        ) : (
                          <View style={[styles.roleBadge, { backgroundColor: G + '10', borderColor: G + '20' }]}>
                            <Text style={[styles.roleBadgeText, { color: G }]}>Member</Text>
                          </View>
                        )}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
                        {item.category ? (
                          <Text style={[styles.communityRowMeta, { color: TEXT3 }]} numberOfLines={1}>
                            {item.category}
                          </Text>
                        ) : null}
                        <Text style={[styles.communityRowMeta, { color: TEXT3 }]}>
                          • {((item.membersCount ?? 0) >= 1000 ? ((item.membersCount ?? 0) / 1000).toFixed(1) + 'k' : (item.membersCount ?? 0))} members
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.communityRowArrow, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
                      <Ionicons name="chevron-forward" size={14} color={TEXT3} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* 4. EVENTS TAB */}
          {activeTab === 'events' && (
            <View style={[styles.modernCard, { backgroundColor: SURF, borderColor: BORDER }]}>
              <View style={styles.cardHeaderWithAction}>
                <View style={styles.cardHeaderTitleRow}>
                  <View style={[styles.sectionHeaderIconBox, { backgroundColor: G + '14' }]}>
                    <Ionicons name="calendar" size={16} color={G} />
                  </View>
                  <Text style={[styles.cardSectionHeader, { color: TEXT, marginBottom: 0 }]}>Events</Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push('/create/event' as any)}
                  style={[styles.smallEditChip, { backgroundColor: G + '10' }]}
                >
                  <Ionicons name="add" size={14} color={G} />
                  <Text style={[styles.headerActionLink, { color: G }]}>New</Text>
                </TouchableOpacity>
              </View>

              {myEvents.length === 0 && (
                <View style={styles.emptyStateContainer}>
                  <View style={[styles.emptyIconCircle, { backgroundColor: G + '10' }]}>
                    <Ionicons name="calendar-clear-outline" size={28} color={G} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: TEXT, fontSize: 15, marginTop: 8 }]}>No Events Yet</Text>
                  <Text style={[styles.emptySubtitle, { color: TEXT3, marginTop: 4 }]}>
                    Events you host or participate in will be listed here.
                  </Text>
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
                    {/* Date Box */}
                    <View style={[styles.eventCalendarBox, { backgroundColor: isPast ? (isDark ? '#27272A' : '#F1F5F9') : G + '15' }]}>
                      <Text style={[styles.eventBoxMonth, { color: isPast ? TEXT3 : G }]}>
                        {new Date(event.startsAt).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                      </Text>
                      <Text style={[styles.eventBoxDay, { color: isPast ? TEXT3 : G }]}>
                        {new Date(event.startsAt).getDate()}
                      </Text>
                    </View>

                    {/* Content Area */}
                    <View style={{ flex: 1 }}>
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

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                        <Ionicons name="time-outline" size={13} color={TEXT3} />
                        <Text style={[styles.eventRowMeta, { color: TEXT3 }]}>
                          {dateStr} • {timeStr}
                        </Text>
                      </View>

                      {event.location ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                          <Ionicons name="location-outline" size={13} color={TEXT3} />
                          <Text style={[styles.eventRowMeta, { color: TEXT3 }]} numberOfLines={1}>
                            {event.location}
                          </Text>
                        </View>
                      ) : null}

                      {/* Footer Actions */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, gap: 6, flexWrap: 'wrap' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
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
                          <Text style={[styles.viewEventLinkText, { color: G }]}>View →</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* 4. FAMILY TAB */}
          {activeTab === 'family' && (
            <View style={[styles.modernCard, styles.emptyCard, { backgroundColor: SURF, borderColor: BORDER }]}>
              <View style={[styles.emptyIconCircle, { backgroundColor: G + '14', width: 68, height: 68, borderRadius: 34 }]}>
                <Ionicons name="people" size={32} color={G} />
              </View>
              <Text style={[styles.emptyTitle, { color: TEXT, marginTop: 4 }]}>Family Directory</Text>
              <Text style={[styles.emptySubtitle, { color: TEXT2, paddingHorizontal: 16 }]}>
                Connect and sync with your extended family members across the community network.
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

          {/* 5. UPDATES / ACTIVITY TAB */}
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
    fontWeight: '800',
    marginHorizontal: 12,
    letterSpacing: -0.3,
  },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  floatingActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
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

  // Masthead
  profileMasthead: { paddingHorizontal: 16, marginBottom: 14 },
  mastheadTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: -48,
    marginBottom: 12,
  },
  avatarBorderWrapper: {
    position: 'relative',
    width: 98,
    height: 98,
    borderRadius: 49,
    borderWidth: 3.5,
    overflow: 'visible',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  avatarVerifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topActionGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  primaryEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  primaryEditBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  iconUtilityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
      android: { elevation: 1 },
    }),
  },

  // Identity
  identityBlock: { marginBottom: 14 },
  nameBadgeRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 4 },
  profileName: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  profileUsername: { fontSize: 13.5, fontWeight: '500' },
  metaPillsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4.5,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgePillText: { fontSize: 11.5, fontWeight: '600' },
  bioText: { fontSize: 13.5, lineHeight: 19.5, fontWeight: '400' },
  expandBioText: { fontSize: 12, fontWeight: '700', marginTop: 3 },

  // Stats Card
  statsCardWrapper: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
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
    paddingHorizontal: 2,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginBottom: 3,
  },
  statIconBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 10.5,
    fontWeight: '500',
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
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  tabLabel: { fontSize: 13.5 },

  // Cards & Rows
  contentArea: { paddingHorizontal: 16 },
  modernCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  cardHeaderTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sectionHeaderIconBox: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cardSectionHeader: { fontSize: 14.5, fontWeight: '700', letterSpacing: -0.2 },
  cardHeaderWithAction: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  smallEditChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  headerActionLink: { fontSize: 12, fontWeight: '700' },

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
  detailHint: { fontSize: 11.5, lineHeight: 16, marginTop: 3 },
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
    alignItems: 'stretch',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
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
  metricValue: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  metricLabel: { fontSize: 10, fontWeight: '600', marginTop: 2, textAlign: 'center', lineHeight: 13 },

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

  // Communities Tab
  badgeCountPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  badgeCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  communityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  communityRowAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  communityRowName: {
    fontSize: 14.5,
    fontWeight: '700',
    flexShrink: 1,
  },
  communityRowMeta: {
    fontSize: 12,
    fontWeight: '500',
  },
  communityRowArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
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
