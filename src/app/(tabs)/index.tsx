import { Ionicons } from '@expo/vector-icons';
import { FlashList as ShopifyFlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useRef, useState, useCallback, useMemo } from 'react';
import {
  Animated,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet, Text,
  TouchableOpacity,
  View,
  Share,
  useWindowDimensions,
} from 'react-native';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCommunitiesQuery, useJoinCommunityMutation } from '../../api/community';
import { usePostsQuery } from '../../api/feed';
import { useEventsQuery } from '../../api/event';
import { useUnreadCountQuery, useUnreadChatCountQuery, useChatSocket, useNotificationSocket, useChatsQuery } from '../../api/chat';
import { useStoriesFeedQuery, StoryGroup } from '../../api/story';
import { usePublicStoriesQuery } from '../../api/ourPeople';
import CommentSheet from '../../components/feed/CommentSheet';
import ForwardSheet from '../../components/feed/ForwardSheet';
import PostCard from '../../components/feed/PostCard';
import Skeleton from '../../components/feedback/Skeleton';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme';
const FlashList = ShopifyFlashList as any;


// Quick action shortcut definition with modern 3D icons & squircle cards
const QUICK_ACTIONS = [
  {
    id: 'communities',
    label: 'Communities',
    image: require('../../../assets/images/quick-actions/communities.png'),
    bg: '#F2F7FF',
    border: '#D4E6FC',
    shadow: '#3B82F6',
    route: '/(tabs)/explore?tab=communities',
  },
  

  {
    id: 'krushi-mitra',
    label: 'Krushi Mitra',
    image: require('../../../assets/images/quick-actions/krushi-mitra.png'),
    bg: '#F2FAF2',
    border: '#DCF5DC',
    shadow: '#22C55E',
    route: '/(tabs)/krushi-mitra',
  },
  {
    id: 'recruitment',
    label: 'Jobs',
    image: require('../../../assets/images/quick-actions/recruitment.png'),
    bg: '#F6F3FF',
    border: '#E9E3FE',
    shadow: '#8B5CF6',
    route: '/(tabs)/jobs',
  },
  {
    id: 'matrimony',
    label: 'Sangathi',
    image: require('../../../assets/images/quick-actions/mana-sangama.png'),
    bg: '#FFF0F3',
    border: '#FDDCE4',
    shadow: '#F43F5E',
    route: '/(tabs)/matrimony',
  },
  {
    id: 'business',
    label: 'Business',
    image: require('../../../assets/images/quick-actions/business.png'),
    bg: '#F2FAF2',
    border: '#C6E6C6',
    shadow: '#2D6A2D',
    route: '/(tabs)/business',
  },
  {
    id: 'events',
    label: 'Events',
    image: require('../../../assets/images/quick-actions/events.png'),
    bg: '#FFF4EE',
    border: '#FDDCC8',
    shadow: '#E65100',
    route: '/(tabs)/explore?tab=events',
  },
  {
    id: 'help',
    label: 'Help',
    image: require('../../../assets/images/quick-actions/help.png'),
    bg: '#FFF1F2',
    border: '#FECDD3',
    shadow: '#E11D48',
    route: '/(tabs)/community-help',
  },
  {
    id: 'our-people',
    label: 'Our People',
    image: require('../../../assets/images/quick-actions/our-people.png'),
    bg: '#FFFBEB',
    border: '#FDE68A',
    shadow: '#D97706',
    route: '/(tabs)/our-people',
  },
];


function AnimatedPostCard({ scrollY: _scrollY, index: _index, ...props }: { index: number; scrollY: SharedValue<number>; post: any; onCommentPress: (id: string) => void; onForwardPress: (id: string) => void }) {
  return <PostCard {...props} />;
}

export default function HomeFeed() {
  const { colors, spacing, typography, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();
  const { width: screenWidth } = useWindowDimensions();
  const eventCardWidth = Math.min(220, screenWidth * 0.58);
  const isSmallScreen = screenWidth < 360;

  const { data: posts = [], isLoading, refetch, isRefetching } = usePostsQuery();
  const { data: communities = [] } = useCommunitiesQuery();
  const { data: events = [] } = useEventsQuery();
  const { data: publicStories = [] } = usePublicStoriesQuery();
  const { data: unreadCount = 0 } = useUnreadCountQuery();
  // Derive chat unread count from conversations cache so it stays in sync
  // with the chat list and resets immediately when a chat is opened
  const { data: conversations = [] } = useChatsQuery();
  const unreadChatCount = useMemo(
    () => conversations.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0),
    [conversations]
  );
  const { data: storyGroups = [] } = useStoriesFeedQuery();

  // Real-time socket listeners for live badge updates
  useChatSocket();
  useNotificationSocket();

  const [refreshing, setRefreshing] = useState(false);
  const [featuredTab, setFeaturedTab] = useState<'communities' | 'our-people'>('communities');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [commentSheetVisible, setCommentSheetVisible] = useState(false);
  const [forwardSheetVisible, setForwardSheetVisible] = useState(false);
  const [selectedForwardPostId, setSelectedForwardPostId] = useState<string | null>(null);

  const scrollY = useRef(new Animated.Value(0)).current;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleCommentPress = useCallback((postId: string) => {
    setSelectedPostId(postId);
    setCommentSheetVisible(true);
  }, []);

  const handleForwardPress = useCallback((postId: string) => {
    setSelectedForwardPostId(postId);
    setForwardSheetVisible(true);
  }, []);

  const reanimatedScrollY = useSharedValue(0);
  const joinCommunityMutation = useJoinCommunityMutation();

  const renderPostItem = useCallback(({ item, index }: { item: any; index: number }) => (
    <AnimatedPostCard index={index} scrollY={reanimatedScrollY} post={item} onCommentPress={handleCommentPress} onForwardPress={handleForwardPress} />
  ), [handleCommentPress, handleForwardPress]);

  const joinedCommunities = useMemo(() => communities.filter((c) => c.isJoined), [communities]);
  // ── Skeleton ──────────────────────────────────────────────────────────────
  const renderSkeletonLoader = () => (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12 }}>
      {[1, 2].map((i) => (
        <View key={i} style={[styles.skeletonCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.skeletonHeader}>
            <Skeleton width={44} height={44} borderRadius={22} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Skeleton width="45%" height={14} style={{ marginBottom: 8 }} />
              <Skeleton width="25%" height={10} />
            </View>
          </View>
          <Skeleton width="100%" height={15} style={{ marginBottom: 8 }} />
          <Skeleton width="75%" height={15} style={{ marginBottom: 16 }} />
          <Skeleton width="100%" height={220} borderRadius={16} />
        </View>
      ))}
    </ScrollView>
  );

  // ── Stories Row ─────────────────────────────────────────────────────────
  const renderStoriesRow = () => (
    <View style={[styles.storiesContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesScroll}>
        {/* My Story / Add */}
        <TouchableOpacity style={styles.storyItem} onPress={() => router.push('/story/add')}>
          <View style={[styles.storyRingAdd, { borderColor: colors.primary, backgroundColor: colors.elevation1 }]}>
            <Avatar url={user?.avatarUrl} name={user?.displayName} size={52} />
            <View style={[styles.addBadge, { backgroundColor: colors.primary }]}>
              <Ionicons name="add" size={12} color="#FFF" />
            </View>
          </View>
          <Text style={[styles.storyLabel, { color: colors.textMuted }]}>Your Story</Text>
        </TouchableOpacity>

        {storyGroups.map((group: StoryGroup) => (
          <TouchableOpacity key={group.user.id} style={styles.storyItem} onPress={() => router.push(`/story/${group.stories[0].id}` as any)}>
            <View style={[
              styles.storyRing,
              { borderColor: group.hasUnseen ? colors.primary : colors.border }
            ]}>
              <Avatar url={group.user.avatarUrl} name={group.user.displayName} size={52} />
            </View>
            <Text style={[styles.storyLabel, { color: colors.textMuted }]} numberOfLines={1}>{group.user.displayName}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // ── Welcome Banner ───────────────────────────────────────────────────────
  const renderWelcomeBanner = () => {
    const communityCountText = `${joinedCommunities.length} ${joinedCommunities.length === 1 ? 'community' : 'communities'}`;
    const locationText = user?.village || 'Community Member';
    const professionText = user?.occupation;

    return (
      <View style={[styles.welcomeBanner, { backgroundColor: colors.primaryContainer }]}>
        <View style={styles.welcomeLeaf1}>
          <Ionicons name="leaf" size={40} color={colors.primary + '30'} />
        </View>
        <View style={styles.welcomeLeaf2}>
          <Ionicons name="leaf" size={60} color={colors.primary + '20'} />
        </View>
        <View style={styles.welcomeContent}>
          <View style={styles.welcomeGreetingRow}>
            <Text style={[styles.welcomeGreeting, { color: colors.primaryDark, fontSize: isSmallScreen ? 14 : 16 }]}>
              {getGreeting()}, {user?.displayName?.split(' ')[0] || 'Member'} 🙏
            </Text>
          </View>
          <View style={styles.welcomeMetaRow}>
            <View style={styles.welcomeMetaItem}>
              <Ionicons name="people-outline" size={12} color={colors.textSecondary} />
              <Text style={[styles.welcomeSub, { color: colors.textSecondary }]} numberOfLines={1}>
                {communityCountText}
              </Text>
            </View>

            <Text style={[styles.welcomeMetaDot, { color: colors.textMuted }]}>•</Text>

            <View style={styles.welcomeMetaItem}>
              <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
              <Text style={[styles.welcomeSub, { color: colors.textSecondary }]} numberOfLines={1}>
                {locationText}
              </Text>
            </View>

            {professionText ? (
              <>
                <Text style={[styles.welcomeMetaDot, { color: colors.textMuted }]}>•</Text>
                <View style={styles.welcomeMetaItem}>
                  <Ionicons name="briefcase-outline" size={11} color={colors.textSecondary} />
                  <Text style={[styles.welcomeSub, { color: colors.textSecondary }]} numberOfLines={1}>
                    {professionText}
                  </Text>
                </View>
              </>
            ) : null}
          </View>
        </View>
        <View style={[styles.welcomeTag, { backgroundColor: colors.primary }]}>
          <Ionicons name="shield-checkmark" size={9.5} color="#FFF" />
          <Text style={styles.welcomeTagText}>Verified Member</Text>
        </View>
      </View>
    );
  };

  // ── Upcoming Events ──────────────────────────────────────────────────────
  const upcomingEvents = useMemo(() =>
    events.filter((e: any) => new Date(e.startsAt) >= new Date()).slice(0, 5),
  [events]);

  const renderUpcomingEvents = () => {
    if (upcomingEvents.length === 0) return null;
    return (
      <View style={styles.eventsSection}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming Events</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/explore?tab=events' as any)}>
            <Text style={[styles.seeAllText, { color: colors.primary }]}>See all</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventsScroll}>
          {upcomingEvents.map((event: any) => {
            const dateStr = new Date(event.startsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const timeStr = new Date(event.startsAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            return (
              <TouchableOpacity
                key={event.id}
                style={[styles.eventCard, { backgroundColor: colors.surface, borderColor: colors.border, width: eventCardWidth }]}
                activeOpacity={0.85}
                onPress={() => router.push('/(tabs)/explore?tab=events' as any)}
              >
                {/* Banner */}
                <View style={styles.eventBannerWrap}>
                  {event.coverUrl && !event.coverUrl.startsWith('blob:') ? (
                    <Image
                      source={{ uri: event.coverUrl }}
                      style={styles.eventBanner}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.eventBanner, { backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center' }]}>
                      <Ionicons name="calendar-outline" size={40} color={colors.primary} />
                    </View>
                  )}
                  <View style={styles.eventBannerOverlay} />
                  {/* Date badge */}
                  <View style={[styles.eventDateBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.eventDateDay}>{dateStr.split(' ')[1]}</Text>
                    <Text style={styles.eventDateMonth}>{dateStr.split(' ')[0]}</Text>
                  </View>
                  {/* RSVP chip */}
                  {event.userRsvpStatus === 'GOING' && (
                    <View style={[styles.rsvpChip, { backgroundColor: colors.success }]}>
                      <Ionicons name="checkmark-circle" size={11} color="#FFF" />
                      <Text style={styles.rsvpChipText}>Going</Text>
                    </View>
                  )}
                </View>

                {/* Body */}
                <View style={styles.eventBody}>
                  <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={2}>{event.title}</Text>
                  <View style={styles.eventMeta}>
                    <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                    <Text style={[styles.eventMetaText, { color: colors.textSecondary }]}>{dateStr} • {timeStr}</Text>
                  </View>
                  {event.location ? (
                    <View style={styles.eventMeta}>
                      <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                      <Text style={[styles.eventMetaText, { color: colors.textSecondary }]} numberOfLines={1}>{event.location}</Text>
                    </View>
                  ) : null}
                  <View style={styles.eventFooter}>
                    <View style={styles.eventRsvpRow}>
                      <Ionicons name="people-outline" size={14} color={colors.primary} />
                      <Text style={[styles.eventRsvpCount, { color: colors.primary }]}>{event.rsvpCount}</Text>
                    </View>
                    <View style={[styles.eventTag, { backgroundColor: colors.primaryContainer }]}>
                      <Text style={[styles.eventTagText, { color: colors.primary }]}>Upcoming</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  // ── Communities & Our People (Tabbed Section) ───────────────────────────
  const renderCommunitiesAndOurPeopleTabs = () => {
    const latestCommunities = communities.slice(0, 5);
    const topStories = (publicStories || []).slice(0, 4);

    if (!latestCommunities.length && !topStories.length) return null;

    return (
      <View style={styles.tabbedSection}>
        {/* Header Tabs */}
        <View style={styles.sectionHeader}>
          <View style={styles.tabToggleRow}>
            {/* Communities Tab */}
            {latestCommunities.length > 0 && (
              <TouchableOpacity
                onPress={() => setFeaturedTab('communities')}
                activeOpacity={0.75}
                style={[
                  styles.tabToggleBtn,
                  featuredTab === 'communities' && [styles.tabToggleBtnActive, { borderBottomColor: colors.primary }],
                ]}
              >
                <View style={styles.tabTitleWrap}>
                  <Ionicons
                    name={featuredTab === 'communities' ? 'people' : 'people-outline'}
                    size={14.5}
                    color={featuredTab === 'communities' ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.tabToggleText,
                      { color: featuredTab === 'communities' ? colors.text : colors.textMuted },
                      featuredTab === 'communities' && styles.tabToggleTextActive,
                    ]}
                  >
                    Communities
                  </Text>
                  <View
                    style={[
                      styles.tabSuperBadge,
                      {
                        backgroundColor:
                          featuredTab === 'communities'
                            ? colors.primaryContainer
                            : isDark
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(0,0,0,0.05)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabSuperBadgeText,
                        { color: featuredTab === 'communities' ? colors.primary : colors.textMuted },
                      ]}
                    >
                      {communities.length}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* Our People Tab */}
            {topStories.length > 0 && (
              <TouchableOpacity
                onPress={() => setFeaturedTab('our-people')}
                activeOpacity={0.75}
                style={[
                  styles.tabToggleBtn,
                  featuredTab === 'our-people' && [styles.tabToggleBtnActive, { borderBottomColor: colors.primary }],
                ]}
              >
                <View style={styles.tabTitleWrap}>
                  <Ionicons
                    name={featuredTab === 'our-people' ? 'book' : 'book-outline'}
                    size={14}
                    color={featuredTab === 'our-people' ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.tabToggleText,
                      { color: featuredTab === 'our-people' ? colors.text : colors.textMuted },
                      featuredTab === 'our-people' && styles.tabToggleTextActive,
                    ]}
                  >
                    Our People
                  </Text>
                  <View
                    style={[
                      styles.tabSuperBadge,
                      {
                        backgroundColor:
                          featuredTab === 'our-people'
                            ? colors.primaryContainer
                            : isDark
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(0,0,0,0.05)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabSuperBadgeText,
                        { color: featuredTab === 'our-people' ? colors.primary : colors.textMuted },
                      ]}
                    >
                      {topStories.length}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Action on right (See all / View all) */}
          <TouchableOpacity
            onPress={() =>
              router.push(featuredTab === 'communities' ? ('/(tabs)/communities' as any) : ('/(tabs)/our-people' as any))
            }
            activeOpacity={0.7}
            style={styles.seeAllBtn}
          >
            <Text style={[styles.seeAllText, { color: colors.primary }]}>
              {featuredTab === 'communities' ? 'See all' : 'View all'}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Tab 1: Communities Content */}
        {featuredTab === 'communities' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.communityCardsScroll}>
            {latestCommunities.map((community: any) => {
              const memberCount = community.membersCount ?? community.memberCount ?? 0;
              const memberText = memberCount === 1 ? '1 member' : `${memberCount.toLocaleString()} members`;
              const isJoined = !!community.isJoined;
              const isPending = community.memberStatus === 'PENDING';

              return (
                <TouchableOpacity
                  key={community.id}
                  onPress={() => router.push(`/(tabs)/community/${community.id}` as any)}
                  activeOpacity={0.88}
                  style={[
                    styles.communityCard,
                    {
                      width: Math.min(285, screenWidth * 0.78),
                      backgroundColor: colors.surface,
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    },
                  ]}
                >
                  {/* Banner with smooth overlay */}
                  <View style={styles.communityBannerWrap}>
                    {community.bannerUrl ? (
                      <Image source={{ uri: community.bannerUrl }} style={styles.communityBanner} contentFit="cover" transition={200} />
                    ) : (
                      <LinearGradient
                        colors={[colors.primaryLight + '40', colors.primaryContainer]}
                        style={styles.communityBanner}
                      >
                        <Ionicons name="people" size={32} color={colors.primary + '60'} />
                      </LinearGradient>
                    )}
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.35)']}
                      style={styles.communityBannerScrim}
                    />
                  </View>

                  {/* Overlapping Avatar */}
                  <View style={[styles.communityAvatarWrap, { borderColor: colors.surface }]}>
                    <Avatar url={community.avatarUrl} name={community.name} size={46} />
                  </View>

                  {/* Body Content */}
                  <View style={styles.communityBody}>
                    <Text numberOfLines={1} style={[styles.communityName, { color: colors.text }]}>
                      {community.name}
                    </Text>

                    <View style={styles.communityMetaRow}>
                      <Ionicons name="people-outline" size={12} color={colors.textMuted} />
                      <Text style={[styles.communityMetaText, { color: colors.textSecondary }]}>
                        {memberText}
                      </Text>
                      <Text style={[styles.communityMetaDot, { color: colors.textMuted }]}>•</Text>
                      <Ionicons name="chatbox-outline" size={11} color={colors.textMuted} />
                      <Text style={[styles.communityMetaText, { color: colors.textSecondary }]}>
                        {(community.postsCount ?? 0).toLocaleString()} posts
                      </Text>
                    </View>

                    <Text numberOfLines={2} style={[styles.communityDescription, { color: colors.textMuted }]}>
                      {community.description || 'Connect and engage with members in this community.'}
                    </Text>

                    {/* Footer Action Buttons */}
                    <View style={styles.communityFooter}>
                      <Button
                        title={isJoined ? 'Joined' : isPending ? 'Pending' : 'Join'}
                        icon={isJoined ? 'checkmark-circle' : isPending ? 'time' : 'add'}
                        variant={isJoined || isPending ? 'secondary' : 'primary'}
                        size="sm"
                        loading={joinCommunityMutation.isPending && (joinCommunityMutation.variables as any)?.communityId === community.id}
                        disabled={isPending}
                        onPress={() => {
                          if (!isPending) {
                            joinCommunityMutation.mutate({ communityId: community.id, isJoined });
                          }
                        }}
                        style={{ flex: 1 }}
                      />
                      <Button
                        title="View Group"
                        icon="people-outline"
                        variant="secondary"
                        size="sm"
                        onPress={() => router.push(`/(tabs)/community/${community.id}` as any)}
                        style={{ flex: 1 }}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Tab 2: Our People Content */}
        {featuredTab === 'our-people' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ourPeopleScroll}>
            {topStories.map((story) => (
              <TouchableOpacity
                key={story.id}
                onPress={() => router.push(`/our-people/${story.id}` as any)}
                activeOpacity={0.88}
                style={[
                  styles.ourPeopleCard,
                  {
                    width: Math.min(260, screenWidth * 0.72),
                    backgroundColor: colors.surface,
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  },
                ]}
              >
                <View style={styles.ourPeopleImageWrap}>
                  <Image source={{ uri: story.featuredImage }} style={styles.ourPeopleImage} contentFit="cover" />
                  <View style={styles.ourPeopleCatTag}>
                    <Text style={styles.ourPeopleCatText}>{story.category}</Text>
                  </View>
                </View>
                <View style={styles.ourPeopleBody}>
                  <Text style={[styles.ourPeopleTitle, { color: colors.text }]} numberOfLines={2}>
                    {story.title}
                  </Text>
                  <View style={styles.ourPeopleFooterRow}>
                    <View style={styles.ourPeopleInfoCol}>
                      <Text style={[styles.ourPeoplePerson, { color: colors.textSecondary }]} numberOfLines={1}>
                        {story.personName} · {story.profession}
                      </Text>
                      <View style={styles.ourPeopleTimeRow}>
                        <Ionicons name="time-outline" size={11} color={colors.textMuted} />
                        <Text style={[styles.ourPeopleReadTime, { color: colors.textMuted }]}>
                          {story.readTimeMinutes} min read
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.ourPeopleCTABadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : colors.primaryContainer }]}>
                      <Text style={[styles.ourPeopleCTA, { color: colors.primary }]}>Read Story →</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  // ── Quick Actions ────────────────────────────────────────────────────────
  const renderQuickActions = () => (
    <View style={styles.quickActionsSection}>
      <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 14 }]}>Quick Actions</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickActionsScroll}
        style={styles.quickActionsScrollView}
      >
        {QUICK_ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.id}
            onPress={() => router.push(action.route as any)}
            activeOpacity={0.75}
            style={styles.quickActionItem}
          >
            <View
              style={[
                styles.quickActionIcon,
                {
                  backgroundColor: action.bg,
                  borderColor: action.border,
                  shadowColor: action.shadow,
                  width: isSmallScreen ? 56 : 62,
                  height: isSmallScreen ? 56 : 62,
                },
              ]}
            >
              <Image
                source={action.image}
                style={styles.quickActionImage}
                contentFit="contain"
                transition={200}
              />
            </View>
            <Text style={[styles.quickActionLabel, { color: colors.text }]} numberOfLines={1}>
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // ── Header ──────────────────────────────────────────────────────────────
  const FeedHeader = (
    <View>
      {renderStoriesRow()}
      <View style={styles.feedHeaderContent}>
        {renderWelcomeBanner()}
        {renderQuickActions()}
        {renderUpcomingEvents()}
        {renderCommunitiesAndOurPeopleTabs()}
        <View style={styles.feedDivider}>
          <Text style={[styles.feedTitle, { color: colors.text }]}>Feed</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/explore?tab=feed' as any)}>
            <Text style={[styles.seeAllText, { color: colors.primary }]}>See all</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* ── M3 Top App Bar ────────────────────────────────────────────── */}
      <Animated.View style={[styles.appBarShadow, { opacity: headerOpacity, backgroundColor: colors.surface }]} />
      <View style={[styles.appBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {/* Logo + Brand */}
        <View style={styles.appBarBrand}>
          <View
            style={[
              styles.logoMark,
              {
                backgroundColor: '#FFFFFF',
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : colors.border,
                overflow: 'hidden',
              },
            ]}
          >
            <Image
              source={require('../../../assets/images/logo.png')}
              style={styles.logoImg}
              contentFit="contain"
            />
          </View>
          <View>
            <Text style={[styles.appBarTitle, { color: colors.text, fontSize: isSmallScreen ? 13 : 14 }]}>
              Gowda Sangama
            </Text>
            <Text style={[styles.appBarSub, { color: colors.textMuted }]}>
              Connecting Our People
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.appBarActions}>
          <TouchableOpacity
            onPress={() => router.push('/notifications')}
            style={[styles.appBarBtn, { backgroundColor: colors.elevation1 }]}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
            {unreadCount > 0 && (
              <View style={[styles.notifBadge, { backgroundColor: colors.secondary }]}>
                <Text style={styles.notifBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/chat' as any)}
            style={[styles.appBarBtn, { backgroundColor: colors.elevation1 }]}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.text} />
            {unreadChatCount > 0 && (
              <View style={[styles.notifBadge, { backgroundColor: '#E53935' }]}>
                <Text style={styles.notifBadgeText}>{unreadChatCount > 99 ? '99+' : unreadChatCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Feed Content ─────────────────────────────────────────────── */}
      {isLoading ? (
        renderSkeletonLoader()
      ) : (
        <FlashList
          data={posts}
          renderItem={renderPostItem}
          estimatedItemSize={480}
          ListHeaderComponent={FeedHeader}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Ionicons name="newspaper-outline" size={48} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, marginTop: 12, fontSize: 15 }}>No posts yet. Join a community to see posts!</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 40, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
          onScroll={(e: any) => {
            scrollY.setValue(e.nativeEvent.contentOffset.y);
            reanimatedScrollY.value = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}

      {/* ── Comments Drawer ─────────────────────────────────────────── */}
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
          const post = posts.find((p: any) => p.id === selectedForwardPostId);
          if (post) {
            try {
              await Share.share({
                message: `${post.author.displayName} in ${post.community?.name || 'Community'}: "${post.content}"`,
              });
            } catch (_) {}
          }
        }}
      />
    </View>
  );
}

// Utility: contextual greeting
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // ── App Bar ──────────────────────────────────────────────────────────────
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
  },
  appBarShadow: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
    zIndex: 9,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  appBarBrand: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  logoMark: {
    width: 58,
    height: 58,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  logoImg: {
    width: '100%',
    height: '100%',
  },
  appBarTitle: { fontSize: 14.5, fontWeight: '700', letterSpacing: -0.2, lineHeight: 19 },
  appBarSub: { fontSize: 10.5, fontWeight: '500', marginTop: 1, letterSpacing: 0.1, lineHeight: 14 },
  appBarActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  appBarBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute', top: 2, right: 2,
    minWidth: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  notifBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },

  // ── Stories ──────────────────────────────────────────────────────────────
  storiesContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: -8,
    marginBottom: 14,
  },
  storiesScroll: { paddingHorizontal: 16, paddingVertical: 12, gap: 14 },
  feedHeaderContent: { paddingHorizontal: 16 },
  storyItem: { alignItems: 'center', width: 62 },
  storyRing: {
    width: 58, height: 58, borderRadius: 29,
    borderWidth: 2.5, padding: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  storyRingAdd: {
    width: 58, height: 58, borderRadius: 29,
    borderWidth: 2.5, borderStyle: 'dashed', padding: 2,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  storyAvatar: { width: 48, height: 48, borderRadius: 24 },
  addBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFF',
  },
  storyLabel: { fontSize: 11, fontWeight: '500', marginTop: 5, textAlign: 'center', width: '100%' },

  // ── Welcome Banner ─────────────────────────────────────────────────────
  welcomeBanner: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  welcomeLeaf1: { position: 'absolute', top: -8, right: 20 },
  welcomeLeaf2: { position: 'absolute', bottom: -16, left: -10 },
  welcomeContent: { position: 'relative', zIndex: 1 },
  welcomeGreetingRow: { paddingRight: 96, marginBottom: 4 },
  welcomeGreeting: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  welcomeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: 5,
    marginTop: 2,
  },
  welcomeMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    flexShrink: 1,
  },
  welcomeMetaDot: {
    fontSize: 11,
  },
  welcomeSub: { fontSize: 11.5, fontWeight: '500' },
  welcomeTag: {
    position: 'absolute',
    top: 9,
    right: 10,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  welcomeTagText: { color: '#FFF', fontSize: 9, fontWeight: '700', includeFontPadding: false },

  // ── Quick Actions ────────────────────────────────────────────────────────
  quickActionsSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  quickActionsScrollView: { marginHorizontal: -16 },
  quickActionsScroll: {
    paddingHorizontal: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  quickActionItem: {
    width: 68,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  quickActionIcon: {
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 5,
      },
      android: {
        elevation: 1.5,
      },
    }),
  },
  quickActionImage: {
    width: '100%',
    height: '100%',
  },
  quickActionLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.2,
    marginTop: 2,
  },
  communitySection: { marginBottom: 20 },
  tabbedSection: { marginTop: 10, marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  tabToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  tabToggleBtn: {
    paddingBottom: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabToggleBtnActive: {
    borderBottomWidth: 2,
  },
  tabTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4.5,
  },
  tabToggleText: {
    fontSize: 14.5,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  tabToggleTextActive: {
    fontWeight: '800',
  },
  tabSuperBadge: {
    marginTop: -3,
    marginLeft: 2,
    paddingHorizontal: 4.5,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabSuperBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    lineHeight: 12,
    textAlign: 'center',
    includeFontPadding: false,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 20,
    height: 20,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 14,
    textAlign: 'center',
    includeFontPadding: false,
  },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 4 },
  communityCardsScroll: { gap: 14, paddingRight: 4 },
  communityCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 246,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  communityBannerWrap: {
    width: '100%',
    height: 94,
    position: 'relative',
    overflow: 'hidden',
    borderTopLeftRadius: 19,
    borderTopRightRadius: 19,
  },
  communityBanner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 19,
    borderTopRightRadius: 19,
  },
  communityBannerScrim: {
    ...StyleSheet.absoluteFill,
    borderTopLeftRadius: 19,
    borderTopRightRadius: 19,
  },
  communityAvatarWrap: {
    position: 'absolute',
    top: 66,
    left: 14,
    borderWidth: 3,
    borderRadius: 26,
    zIndex: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  communityBody: {
    paddingHorizontal: 14,
    paddingTop: 28,
    paddingBottom: 14,
    flex: 1,
  },
  communityName: {
    fontSize: 15.5,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  communityMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    marginBottom: 6,
  },
  communityMetaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  communityMetaDot: {
    fontSize: 11,
    marginHorizontal: 2,
  },
  communityDescription: {
    fontSize: 12.5,
    lineHeight: 17,
    minHeight: 34,
    marginBottom: 12,
  },
  communityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 'auto',
  },

  // ── Feed Divider ─────────────────────────────────────────────────────────
  feedDivider: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 12,
  },
  feedTitle: { fontSize: 19, fontWeight: '800', letterSpacing: -0.4 },

  // ── Our People ──────────────────────────────────────────────────────────
  ourPeopleSection: { marginBottom: 20 },
  ourPeopleSub: { fontSize: 12.5, marginTop: -8, marginBottom: 12 },
  ourPeopleScroll: { gap: 12, paddingRight: 16 },
  ourPeopleCard: {
    borderRadius: 16, borderWidth: 1, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  ourPeopleImageWrap: { height: 125, position: 'relative', overflow: 'hidden', borderTopLeftRadius: 15, borderTopRightRadius: 15 },
  ourPeopleImage: { width: '100%', height: '100%', borderTopLeftRadius: 15, borderTopRightRadius: 15 },
  ourPeopleCatTag: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  ourPeopleCatText: { color: '#FFF', fontSize: 10.5, fontWeight: '700' },
  ourPeopleBody: { padding: 12, gap: 6 },
  ourPeopleTitle: { fontSize: 14, fontWeight: '800', lineHeight: 19 },
  ourPeopleFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    gap: 8,
  },
  ourPeopleInfoCol: { flex: 1, gap: 2 },
  ourPeoplePerson: { fontSize: 12, fontWeight: '600' },
  ourPeopleTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ourPeopleReadTime: { fontSize: 11, fontWeight: '500' },
  ourPeopleCTABadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ourPeopleCTA: { fontSize: 11.5, fontWeight: '700' },

  // ── Upcoming Events ────────────────────────────────────────────────────────
  eventsSection: { marginBottom: 16 },
  seeAllText: { fontSize: 13, fontWeight: '600' },
  eventsScroll: { gap: 12, paddingRight: 4 },
  eventCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#1A2D1A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  eventBannerWrap: { height: 130, position: 'relative', backgroundColor: '#E0E0E0', overflow: 'hidden', borderTopLeftRadius: 17, borderTopRightRadius: 17 },
  eventBanner: { width: '100%', height: '100%', borderTopLeftRadius: 17, borderTopRightRadius: 17 },
  eventBannerOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.22)', borderTopLeftRadius: 17, borderTopRightRadius: 17 },
  eventDateBadge: {
    position: 'absolute', left: 10, bottom: -14,
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
      android: { elevation: 4 },
    }),
  },
  eventDateDay: { color: '#FFF', fontSize: 16, fontWeight: '900', lineHeight: 18 },
  eventDateMonth: { color: '#FFF', fontSize: 9, fontWeight: '600', textTransform: 'uppercase' },
  rsvpChip: {
    position: 'absolute', top: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  rsvpChipText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  eventBody: { padding: 12, paddingTop: 20 },
  eventTitle: { fontSize: 14, fontWeight: '700', lineHeight: 19, marginBottom: 6 },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  eventMetaText: { fontSize: 12, flex: 1 },
  eventFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  eventRsvpRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventRsvpCount: { fontSize: 12, fontWeight: '600' },
  eventTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  eventTagText: { fontSize: 11, fontWeight: '700' },

  // ── Skeleton ─────────────────────────────────────────────────────────────
  skeletonCard: {
    padding: 16, borderWidth: 1, borderRadius: 18,
    marginBottom: 14, overflow: 'hidden',
  },
  skeletonHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
});
