import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  TextInput, Platform, Animated, useWindowDimensions,
  RefreshControl, ActivityIndicator, FlatList,
} from 'react-native';
import { FlashList as ShopifyFlashList } from '@shopify/flash-list';
const FlashList = ShopifyFlashList as any;
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { usePublicBusinessesQuery } from '../../api/business';
import { usePublicHelpRequestsQuery, HELP_CATEGORIES } from '../../api/communityHelp';
import { usePublicStoriesQuery, STORY_CATEGORIES } from '../../api/ourPeople';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../theme';
import { usePostsQuery } from '../../api/feed';
import { useCommunitiesQuery, useJoinCommunityMutation, useMyCommunitiesRequestsQuery } from '../../api/community';
import { useToastStore } from '../../store/toastStore';
import PostCard from '../../components/feed/PostCard';
import CommentSheet from '../../components/feed/CommentSheet';
import Skeleton from '../../components/feedback/Skeleton';
import Button from '../../components/common/Button';
import { useSuggestedUsersQuery, useSearchUsersQuery } from '../../api/user';
import { useEventsQuery, useMyEventsQuery, useToggleInterestMutation, useToggleLikeMutation, useShareEventMutation } from '../../api/event';
import { useSendConnectionRequestMutation, useConnectionStatusQuery, ConnectionStatus } from '../../api/connections';
import { useAuthStore } from '../../store/authStore';
import { useVoiceSearch } from '../../hooks/useVoiceSearch';
import EventCommentSheet from '../../components/feed/EventCommentSheet';
import EventShareSheet from '../../components/feed/EventShareSheet';
import { API_BASE_URL } from '../../api/client';

// ── Tab types & Themes ────────────────────────────────────────────────────────
type ExploreTab = 'members' | 'communities' | 'feed' | 'events' | 'business' | 'help' | 'stories';
type CommSubTab = 'all' | 'my';
const VALID_TABS: ExploreTab[] = ['members', 'communities', 'feed', 'events', 'business', 'help', 'stories'];

interface TabDefinition {
  id: ExploreTab;
  label: string;
  icon: string;
  activeIcon: string;
  color: string;
  bgLight: string;
  bgDark: string;
}

const TABS: TabDefinition[] = [
  {
    id: 'members',
    label: 'Members',
    icon: 'people-outline',
    activeIcon: 'people',
    color: '#2563EB', // Sapphire Blue
    bgLight: '#EFF6FF',
    bgDark: 'rgba(37, 99, 235, 0.16)',
  },
  {
    id: 'communities',
    label: 'Communities',
    icon: 'globe-outline',
    activeIcon: 'globe',
    color: '#16A34A', // Lush Emerald Green
    bgLight: '#F0FDF4',
    bgDark: 'rgba(22, 163, 74, 0.16)',
  },
  {
    id: 'feed',
    label: 'Feed',
    icon: 'newspaper-outline',
    activeIcon: 'newspaper',
    color: '#7C3AED', // Royal Violet
    bgLight: '#F5F3FF',
    bgDark: 'rgba(124, 58, 237, 0.16)',
  },
  {
    id: 'events',
    label: 'Events',
    icon: 'calendar-outline',
    activeIcon: 'calendar',
    color: '#E11D48', // Vibrant Crimson Rose
    bgLight: '#FFF1F2',
    bgDark: 'rgba(225, 29, 72, 0.16)',
  },
  {
    id: 'business',
    label: 'Business',
    icon: 'storefront-outline',
    activeIcon: 'storefront',
    color: '#0891B2', // Electric Cyan / Teal
    bgLight: '#ECFEFF',
    bgDark: 'rgba(8, 145, 178, 0.16)',
  },
  {
    id: 'help',
    label: 'Help',
    icon: 'heart-outline',
    activeIcon: 'heart',
    color: '#FA5252', // Light Warm Coral Red
    bgLight: '#FFF5F5',
    bgDark: 'rgba(250, 82, 82, 0.16)',
  },
  {
    id: 'stories',
    label: 'Our People',
    icon: 'book-outline',
    activeIcon: 'book',
    color: '#FB923C', // Soft Light Apricot Orange
    bgLight: '#FFF7ED',
    bgDark: 'rgba(251, 146, 60, 0.16)',
  },
];

function resolveTab(raw: string | string[] | undefined): ExploreTab {
  const t = Array.isArray(raw) ? raw[0] : raw;
  return (t && VALID_TABS.includes(t as ExploreTab)) ? (t as ExploreTab) : 'members';
}

const TRENDING_SEARCHES: string[] = [];

const EVENT_FILTERS = ['All', 'Upcoming', 'Today', 'This Week', 'My Events'];

/** A single-day event is complete once its start time passes; multi-day events stay visible until they end. */
function hasEventEnded(event: { startsAt?: string; endsAt?: string }, now = new Date()) {
  const endAt = new Date(event.endsAt || event.startsAt || '');
  return !Number.isNaN(endAt.getTime()) && endAt < now;
}

const COMMUNITY_TYPES = ['All', 'Village', 'Youth', 'Women', 'Farmers', 'Temple', 'Sports', 'Education'];

// ── Skeleton components ───────────────────────────────────────────────────────
function MemberSkeleton() {
  return (
    <View style={styles.memberCardSkeleton}>
      <Skeleton width={56} height={56} borderRadius={28} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton width="55%" height={14} borderRadius={6} />
        <Skeleton width="40%" height={11} borderRadius={6} />
        <Skeleton width="35%" height={11} borderRadius={6} />
      </View>
      <Skeleton width={72} height={32} borderRadius={20} />
    </View>
  );
}

function CommunitySkeleton() {
  return (
    <View style={styles.communityCardSkeleton}>
      <Skeleton width="100%" height={100} borderRadius={16} style={{ marginBottom: 10 }} />
      <View style={{ gap: 8, paddingHorizontal: 12, paddingBottom: 12 }}>
        <Skeleton width="60%" height={16} borderRadius={6} />
        <Skeleton width="80%" height={12} borderRadius={6} />
        <Skeleton width="40%" height={12} borderRadius={6} />
      </View>
    </View>
  );
}

function EventSkeleton() {
  return (
    <View style={[styles.eventCardSkeleton, { flex: 1, marginBottom: 12 }]}>
      <Skeleton width="100%" height={124} borderRadius={0} style={{ borderTopLeftRadius: 20, borderTopRightRadius: 20 }} />
      <View style={{ gap: 6, padding: 12, paddingTop: 18 }}>
        <Skeleton width="80%" height={14} borderRadius={5} />
        <Skeleton width="60%" height={10} borderRadius={5} />
        <Skeleton width="50%" height={10} borderRadius={5} />
      </View>
    </View>
  );
}

// ── Connect Button (per-member, own hook scope) ───────────────────────────────
function ConnectButton({ item, currentUserId }: { item: any; currentUserId?: string }) {
  const { colors } = useTheme();
  const showToast = useToastStore((s) => s.showToast);
  const MEMBER_COLOR = '#2563EB';
  const { data: status = 'NONE', isLoading: statusLoading } = useConnectionStatusQuery(item.id, currentUserId);
  const sendRequest = useSendConnectionRequestMutation();

  const handleConnect = () => {
    if (status !== 'NONE') return;
    sendRequest.mutate(item.id, {
      onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to send request', 'error'),
    });
  };

  const iconName = status === 'ACCEPTED' ? 'checkmark-circle' : status === 'PENDING_SENT' ? 'time-outline' : 'person-add-outline';
  const bgColor = status === 'ACCEPTED' ? 'rgba(37, 99, 235, 0.15)' : status === 'PENDING_SENT' ? colors.elevation1 : 'rgba(37, 99, 235, 0.12)';
  const iconColor = status === 'PENDING_SENT' ? colors.textMuted : MEMBER_COLOR;

  return (
    <TouchableOpacity
      style={[styles.msgBtn, { backgroundColor: bgColor }]}
      onPress={handleConnect}
      disabled={status !== 'NONE' || sendRequest.isPending || statusLoading}
    >
      {sendRequest.isPending ? (
        <ActivityIndicator size={14} color={MEMBER_COLOR} />
      ) : (
        <Ionicons name={iconName as any} size={16} color={iconColor} />
      )}
    </TouchableOpacity>
  );
}

export default function ExploreScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string; subtab?: string }>();
  const showToast = useToastStore((s) => s.showToast);
  const currentUser = useAuthStore((s) => s.user);
  const { width: windowWidth } = useWindowDimensions();
  const communityBannerHeight = Math.round(windowWidth * 0.28);
  const eventBannerHeight = Math.round(windowWidth * 0.4);

  const [activeTab, setActiveTab] = useState<ExploreTab>(() => resolveTab(params.tab));
  const [commSubTab, setCommSubTab] = useState<CommSubTab>(() => (params.subtab === 'my' ? 'my' : 'all'));

  const currentTabDef = TABS.find((t) => t.id === activeTab) || TABS[0];
  const TAB_COLOR = currentTabDef.color;
  const TAB_BG = isDark ? currentTabDef.bgDark : currentTabDef.bgLight;

  useEffect(() => {
    const resolved = resolveTab(params.tab);
    setActiveTab(resolved);
    if (resolved === 'events') {
      setShowFilterSheet(true);
    }
    if (resolved === 'communities') {
      setShowCommFilterRow(true);
    }
  }, [params.tab]);

  useEffect(() => {
    if (params.subtab === 'my' || params.subtab === 'all') {
      setCommSubTab(params.subtab);
    }
  }, [params.subtab]);

  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedEventFilter, setSelectedEventFilter] = useState('All');
  const [selectedCommType, setSelectedCommType] = useState('All');
  const [showCommFilterRow, setShowCommFilterRow] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(true);
  const [commentSheetVisible, setCommentSheetVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const searchRef = useRef<TextInput>(null);

  const { data: posts = [], isLoading: postsLoading, refetch: refetchPosts } = usePostsQuery();
  const { data: communities = [], isLoading: commsLoading, refetch: refetchComms } = useCommunitiesQuery();
  const { data: myCommRequests = [], refetch: refetchCommRequests } = useMyCommunitiesRequestsQuery();
  const joinMutation = useJoinCommunityMutation();

  const { data: suggestedMembers = [], isLoading: suggestedLoading, error: suggestedError, refetch: refetchMembers } = useSuggestedUsersQuery();
  const { data: searchedMembers = [], isLoading: searchLoading, error: searchError } = useSearchUsersQuery(debouncedSearch);
  const members = debouncedSearch ? searchedMembers : suggestedMembers;
  const membersLoading = debouncedSearch ? searchLoading : suggestedLoading;
  const membersError = debouncedSearch ? searchError : suggestedError;

  const handleVoiceResult = useCallback((text: string) => {
    const trimmed = text.trim();
    setSearchText(trimmed);
    setDebouncedSearch(trimmed);
    setIsFocused(false);
    searchRef.current?.blur();
  }, []);

  const { isListening, error: voiceError, start: startVoice } = useVoiceSearch(handleVoiceResult);
  const { data: events = [], isLoading: eventsLoading, refetch: refetchEvents } = useEventsQuery();
  const { data: myCreatedEvents = [], isLoading: myEventsLoading, refetch: refetchMyEvents } = useMyEventsQuery();
  const toggleInterest = useToggleInterestMutation();
  const toggleLike = useToggleLikeMutation();
  const shareEvent = useShareEventMutation();
  const [eventCommentSheetVisible, setEventCommentSheetVisible] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventTitle, setSelectedEventTitle] = useState<string | undefined>();
  const [shareSheetEvent, setShareSheetEvent] = useState<{ id: string; title: string } | null>(null);

  const { data: publicBusinesses = [], isLoading: bizLoading, refetch: refetchBiz } = usePublicBusinessesQuery(
    activeTab === 'business' ? {} : undefined
  );
  const { data: helpRequests = [], isLoading: helpLoading, refetch: refetchHelp } = usePublicHelpRequestsQuery(
    activeTab === 'help' ? {} : undefined
  );
  const { data: exploreStories = [], isLoading: storiesLoading, refetch: refetchStories } = usePublicStoriesQuery(
    activeTab === 'stories' ? {} : undefined
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'feed') await refetchPosts();
    else if (activeTab === 'communities') await Promise.all([refetchComms(), refetchCommRequests()]);
    else if (activeTab === 'members') await refetchMembers();
    else if (activeTab === 'events') { await refetchEvents(); await refetchMyEvents(); }
    else if (activeTab === 'business') await refetchBiz();
    else if (activeTab === 'help') await refetchHelp();
    else if (activeTab === 'stories') await refetchStories();
    setRefreshing(false);
  };

  const G = colors.primary;
  const SAFFRON = colors.saffron || '#FF6F00';
  const BG = colors.background;
  const SURF = colors.surface;
  const BORDER = colors.border;
  const TEXT = colors.text;
  const TEXT2 = colors.textSecondary;
  const TEXT3 = colors.textMuted;

  // Debounce
  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(searchText), 350);
    return () => clearTimeout(h);
  }, [searchText]);

  const commitSearch = (text: string) => {
    if (!text.trim()) return;
    setRecentSearches((prev) => [text, ...prev.filter((s) => s !== text)].slice(0, 6));
    setDebouncedSearch(text);
    setSearchText(text);
    setIsFocused(false);
    searchRef.current?.blur();
  };

  const clearSearch = () => {
    setSearchText('');
    setDebouncedSearch('');
  };

  // ── Filtered data ──────────────────────────────────────────────────────────
  const filteredMembers = members;

  const isMyCommunity = (c: any) => {
    return !!(
      c.isJoined ||
      (currentUser?.id && (c.creatorId === currentUser.id || c.ownerId === currentUser.id)) ||
      (c.role && ['ADMIN', 'MODERATOR', 'MEMBER'].includes(c.role))
    );
  };

  const myCommunitiesList = communities.filter(isMyCommunity);
  const myCommunitiesCount = myCommunitiesList.length;
  const allCommunitiesCount = communities.length;

  const filteredCommunities = communities.filter((c: any) => {
    if (commSubTab === 'my' && !isMyCommunity(c)) {
      return false;
    }
    const typeMatch = selectedCommType === 'All' ||
      c.category?.toLowerCase().includes(selectedCommType.toLowerCase());
    if (!typeMatch) return false;
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q);
  });

  const filteredPosts = posts.filter((p: any) => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return (
      p.content?.toLowerCase().includes(q) ||
      p.title?.toLowerCase().includes(q) ||
      p.caption?.toLowerCase().includes(q) ||
      p.author?.displayName?.toLowerCase().includes(q) ||
      p.community?.name?.toLowerCase().includes(q) ||
      p.tags?.some((t: string) => t.toLowerCase().includes(q))
    );
  });

  const filteredEvents = events.filter((e: any) => {
    const now = new Date();
    const start = new Date(e.startsAt);
    if (hasEventEnded(e, now)) return false;
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
    const weekEnd = new Date(now); weekEnd.setDate(now.getDate() + 7);
    const filterMatch = selectedEventFilter === 'All' ||
      (selectedEventFilter === 'Upcoming' && start >= now) ||
      (selectedEventFilter === 'Today' && start >= todayStart && start <= todayEnd) ||
      (selectedEventFilter === 'This Week' && start >= now && start <= weekEnd) ||
      (selectedEventFilter === 'My Events' && (e.creatorId === currentUser?.id || e.isInterested || e.userRsvpStatus === 'GOING'));
    if (!filterMatch) return false;
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return (
      e.title?.toLowerCase().includes(q) ||
      e.description?.toLowerCase().includes(q) ||
      e.location?.toLowerCase().includes(q) ||
      e.organizer?.toLowerCase().includes(q) ||
      e.creatorName?.toLowerCase().includes(q)
    );
  });

  // ── Search overlay (shows when focused + no text typed yet) ───────────────
  const renderSearchOverlay = () => (
    <ScrollView style={[styles.searchOverlay, { backgroundColor: BG }]} showsVerticalScrollIndicator={false}>
      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <View style={styles.searchSection}>
          <View style={styles.searchSectionHeader}>
            <Text style={[styles.searchSectionTitle, { color: TEXT }]}>Recent</Text>
            <TouchableOpacity onPress={() => setRecentSearches([])}>
              <Text style={[styles.clearAllText, { color: G }]}>Clear all</Text>
            </TouchableOpacity>
          </View>
          {recentSearches.map((s, i) => (
            <TouchableOpacity key={i} style={styles.recentItem} onPress={() => commitSearch(s)}>
              <View style={[styles.recentIcon, { backgroundColor: colors.elevation1 }]}>
                <Ionicons name="time-outline" size={16} color={TEXT3} />
              </View>
              <Text style={[styles.recentText, { color: TEXT2 }]}>{s}</Text>
              <TouchableOpacity onPress={() => setRecentSearches((p) => p.filter((_, j) => j !== i))}>
                <Ionicons name="close" size={16} color={TEXT3} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Trending Searches */}
      <View style={styles.searchSection}>
        <Text style={[styles.searchSectionTitle, { color: TEXT, marginBottom: 12 }]}>🔥 Trending</Text>
        <View style={styles.trendingWrap}>
          {TRENDING_SEARCHES.map((s, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.trendingChip, { backgroundColor: colors.primaryContainer, borderColor: BORDER }]}
              onPress={() => commitSearch(s.replace(/^[^\w]+/, ''))}
            >
              <Text style={[styles.trendingText, { color: G }]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Search tips */}
      <View style={[styles.tipsCard, { backgroundColor: colors.elevation1, borderColor: BORDER }]}>
        <Ionicons name="bulb-outline" size={18} color={SAFFRON} />
        <Text style={[styles.tipsText, { color: TEXT2 }]}>
          Try searching by name, village, district, or occupation
        </Text>
      </View>
    </ScrollView>
  );

  // ── Member Card ────────────────────────────────────────────────────────────
  const renderMemberCard = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={[styles.memberCard, { backgroundColor: SURF, borderColor: BORDER }]}
      onPress={() => router.push(`/user/${item.id}?from=discover` as any)}
      activeOpacity={0.7}
    >
      <View style={styles.memberCardLeft}>
        <View style={[styles.memberAvatarRing, { borderColor: '#2563EB' }]}>
          <ExpoImage
            source={item.avatarUrl
              ? { uri: item.avatarUrl }
              : { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(item.displayName || item.username || 'U')}&background=eff6ff&color=2563eb` }
            }
            style={styles.memberAvatar}
            contentFit="cover"
          />
        </View>
        {item.role === 'MODERATOR' && (
          <View style={[styles.memberBadgeDot, { backgroundColor: '#2563EB', borderColor: SURF }]}>
            <Ionicons name="shield-checkmark" size={8} color="#FFF" />
          </View>
        )}
      </View>

      <View style={styles.memberInfo}>
        <View style={styles.memberNameRow}>
          <Text style={[styles.memberName, { color: TEXT }]} numberOfLines={1}>{item.displayName || item.username}</Text>
          {item.role ? (
            <View style={[styles.memberBadge, { backgroundColor: 'rgba(37, 99, 235, 0.12)', borderColor: 'rgba(37, 99, 235, 0.25)' }]}>
              <Text style={[styles.memberBadgeText, { color: '#2563EB' }]}>{item.role}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.memberMeta}>
          <Ionicons name="location-outline" size={12} color={SAFFRON} />
          <Text style={[styles.memberMetaText, { color: TEXT3 }]} numberOfLines={1}>Member</Text>
        </View>
        <View style={styles.memberMeta}>
          <Ionicons name="briefcase-outline" size={12} color={TEXT3} />
          <Text style={[styles.memberMetaText, { color: TEXT3 }]} numberOfLines={1}>{item.bio || 'No bio provided'}</Text>
        </View>
        {(item.followersCount || 0) > 0 && (
          <View style={styles.memberMeta}>
            <Ionicons name="people-outline" size={12} color="#2563EB" />
            <Text style={[styles.memberMetaText, { color: '#2563EB' }]} numberOfLines={1}>{item.followersCount} followers</Text>
          </View>
        )}
      </View>

      <View style={styles.memberActions}>
        <ConnectButton item={item} currentUserId={currentUser?.id} />
        <TouchableOpacity 
          style={[styles.msgBtn, { backgroundColor: colors.elevation1 }]}
          onPress={() => router.push(`/chat/${item.id}` as any)}
        >
          <Ionicons name="chatbubble-outline" size={16} color={TEXT2} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  // ── Community Card ─────────────────────────────────────────────────────────
  const renderCommunityCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.communityCard, { backgroundColor: SURF, borderColor: BORDER }]}
      onPress={() => router.push(`/community/${item.id}?from=discover` as any)}
      activeOpacity={0.9}
    >
      {/* Banner */}
      <View style={[styles.communityBannerWrap, { height: communityBannerHeight }]}>
        <ExpoImage
          source={{ uri: item.bannerUrl || 'https://placehold.co/600x200/e8f5e9/16a34a?text=Community' }}
          style={[styles.communityBanner, { height: communityBannerHeight }]}
          contentFit="cover"
        />
        <View style={styles.communityBannerOverlay} />
        {/* Category chip on banner */}
        <View style={[styles.categoryChip, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <Text style={styles.categoryChipText}>{item.category}</Text>
        </View>
      </View>

      {/* Avatar overlapping banner */}
      <View style={[styles.communityAvatarWrap, { borderColor: SURF }]}>
        <ExpoImage
          source={{ uri: item.avatarUrl || 'https://ui-avatars.com/api/?name=C&background=f0fdf4&color=16a34a' }}
          style={styles.communityAvatar}
          contentFit="cover"
        />
      </View>

      <View style={styles.communityBody}>
        <View style={styles.communityNameRow}>
          <Text style={[styles.communityName, { color: TEXT }]} numberOfLines={1}>{item.name}</Text>
          {item.isJoined && (
            <View style={[styles.joinedChip, { backgroundColor: isDark ? 'rgba(22, 163, 74, 0.2)' : '#DCFCE7' }]}>
              <Ionicons name="checkmark-circle" size={12} color="#16A34A" />
              <Text style={[styles.joinedChipText, { color: '#16A34A' }]}>Following</Text>
            </View>
          )}
        </View>
        <Text style={[styles.communityDesc, { color: TEXT3 }]} numberOfLines={2}>{item.description}</Text>

        <View style={styles.communityStats}>
          <View style={styles.commStat}>
            <Ionicons name="people-outline" size={13} color={TEXT3} />
            <Text style={[styles.commStatText, { color: TEXT2 }]}>
              {((item.membersCount ?? 0) >= 1000 ? ((item.membersCount ?? 0) / 1000).toFixed(1) + 'k' : (item.membersCount ?? 0))} members
            </Text>
          </View>
          <View style={styles.commStat}>
            <Ionicons name="document-text-outline" size={13} color={TEXT3} />
            <Text style={[styles.commStatText, { color: TEXT2 }]}>{item.postsCount} posts</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEventCard = ({ item, isOwn = false }: { item: any; isOwn?: boolean }) => {
    const isPast = new Date(item.startsAt) < new Date();
    const dateObj = new Date(item.startsAt);
    const dayNum = isNaN(dateObj.getTime()) ? '--' : dateObj.getDate();
    const monthShort = isNaN(dateObj.getTime()) ? '--' : dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const dateStr = isNaN(dateObj.getTime()) ? '--' : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const timeStr = isNaN(dateObj.getTime()) ? '--' : dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const isInterested = item.isInterested ?? false;
    const interestedCount = item.interestedCount ?? 0;

    const handleInterest = () => {
      if (!currentUser) { showToast('Please log in to join events', 'error'); return; }
      if (toggleInterest.isPending) return;
      toggleInterest.mutate(item.id, {
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to update interest', 'error'),
      });
    };

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push(`/events/${item.id}?from=discover` as any)}
        style={[styles.eventCard, { backgroundColor: SURF, borderColor: BORDER }]}
      >
        {/* Banner with overlapping date badge */}
        <View style={styles.eventBannerWrap}>
          {item.coverUrl && !item.coverUrl.startsWith('blob:') ? (
            <ExpoImage
              source={{ uri: item.coverUrl }}
              style={styles.eventBanner}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.eventBanner, styles.eventBannerFallback]}>
              <Ionicons name="calendar-outline" size={38} color="#E11D48" />
            </View>
          )}

          {/* Overlapping Date badge bottom-left */}
          <View style={[styles.dateBadge, { backgroundColor: '#E11D48' }]}>
            <Text style={styles.dateBadgeDay}>{dayNum}</Text>
            <Text style={styles.dateBadgeMonth}>{monthShort}</Text>
          </View>

          {/* Floating Interest Star Icon top-right */}
          <TouchableOpacity
            style={[
              styles.interestFloatingBtn,
              { backgroundColor: isInterested ? '#E11D48' : 'rgba(0,0,0,0.45)' },
            ]}
            activeOpacity={0.8}
            onPress={handleInterest}
          >
            <Ionicons
              name={isInterested ? 'star' : 'star-outline'}
              size={15}
              color="#FFF"
            />
          </TouchableOpacity>
        </View>

        {/* Event Body */}
        <View style={styles.eventBody}>
          <Text style={[styles.eventTitle, { color: TEXT }]} numberOfLines={1}>
            {item.title}
          </Text>

          <View style={styles.eventMetaRow}>
            <Ionicons name="time-outline" size={13} color={TEXT3} />
            <Text style={[styles.eventMetaText, { color: TEXT2 }]} numberOfLines={1}>
              {dateStr} • {timeStr}
            </Text>
          </View>

          <View style={styles.eventMetaRow}>
            <Ionicons name="location-outline" size={13} color={TEXT3} />
            <Text style={[styles.eventMetaText, { color: TEXT2 }]} numberOfLines={1}>
              {item.location || 'Location TBA'}
            </Text>
          </View>

          {/* Footer Row: Attendees Count & Status Pill */}
          <View style={styles.eventFooterRow}>
            <View style={styles.eventAttendeesWrap}>
              <Ionicons name="people-outline" size={14} color={TEXT2} />
              <Text style={[styles.eventAttendeesCount, { color: TEXT2 }]}>
                {interestedCount}
              </Text>
            </View>

            <View
              style={[
                styles.statusBadgePill,
                { backgroundColor: isPast ? '#F3F4F6' : '#FFE4E6' },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: isPast ? '#6B7280' : '#E11D48' },
                ]}
              >
                {isPast ? 'Past' : 'Upcoming'}
              </Text>
            </View>
          </View>

          {/* Join Now Button for events created by other users */}
          {!isOwn && !isPast && (
            <View style={styles.eventActionWrap}>
              <Button
                title={isInterested ? 'Joined' : 'Join Now'}
                icon={isInterested ? 'checkmark-circle' : 'add-circle-outline'}
                variant={isInterested ? 'secondary' : 'primary'}
                size="sm"
                loading={toggleInterest.isPending && (toggleInterest.variables as any) === item.id}
                disabled={toggleInterest.isPending}
                onPress={handleInterest}
              />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // ── Empty state ────────────────────────────────────────────────────────────
  const renderEmpty = (icon: string, title: string, sub: string) => (
    <View style={[styles.emptyState, { backgroundColor: SURF, borderColor: BORDER }]}>
      <View style={[styles.emptyIconBg, { backgroundColor: colors.primaryContainer }]}>
        <Ionicons name={icon as any} size={36} color={G} />
      </View>
      <Text style={[styles.emptyTitle, { color: TEXT }]}>{title}</Text>
      <Text style={[styles.emptySub, { color: TEXT3 }]}>{sub}</Text>
    </View>
  );

  // ── Tab content ────────────────────────────────────────────────────────────
  const renderTabContent = () => {
    switch (activeTab) {
      case 'members': {
        if (membersLoading && members.length === 0) return (
          <ScrollView contentContainerStyle={styles.listContent}>
            {Array.from({ length: 6 }).map((_, i) => <MemberSkeleton key={i} />)}
          </ScrollView>
        );
        if (membersError && members.length === 0) {
          const errMsg = (membersError as any)?.response?.data?.message
            || (membersError as any)?.message
            || 'Could not load members. Pull down to retry.';
          console.error('[Members] API error:', membersError);
          return (
            <ScrollView
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={G} colors={[G]} />}
            >
              {renderEmpty('alert-circle-outline', 'Failed to load members', errMsg)}
            </ScrollView>
          );
        }
        return (
          <FlashList
            data={filteredMembers}
            renderItem={renderMemberCard}
            keyExtractor={(item: any) => item.id}
            estimatedItemSize={120}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={renderSearchHeader()}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={G} colors={[G]} />}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            ListEmptyComponent={() => renderEmpty('people-outline', debouncedSearch ? 'No Results Found' : 'No Members Found', debouncedSearch ? 'No members match your search.' : 'Try adjusting your search or filters.')}
          />
        );
      }

      case 'communities':
        if (commsLoading && communities.length === 0) return (
          <ScrollView contentContainerStyle={styles.listContent}>
            {Array.from({ length: 4 }).map((_, i) => <CommunitySkeleton key={i} />)}
          </ScrollView>
        );
        return (
          <FlatList
            data={filteredCommunities}
            renderItem={({ item }: { item: any }) => renderCommunityCard({ item })}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={() => (
              <View>
                {renderSearchHeader()}
                {/* Community Creation Requests Banner in My Communities */}
                {commSubTab === 'my' && myCommRequests.length > 0 && (
                  <View style={styles.commRequestsWrap}>
                    {myCommRequests.map((req: any) => (
                      <View
                        key={req.id}
                        style={[
                          styles.requestBanner,
                          {
                            backgroundColor: req.status === 'REJECTED' ? '#FEF2F2' : '#FFFBEB',
                            borderColor: req.status === 'REJECTED' ? '#FCA5A5' : '#FCD34D',
                          },
                        ]}
                      >
                        <Ionicons
                          name={req.status === 'REJECTED' ? 'close-circle-outline' : 'time-outline'}
                          size={18}
                          color={req.status === 'REJECTED' ? '#EF4444' : '#F59E0B'}
                          style={{ marginRight: 8 }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontWeight: '700',
                              fontSize: 13,
                              color: req.status === 'REJECTED' ? '#B91C1C' : '#92400E',
                            }}
                          >
                            {req.name}
                          </Text>
                          <Text
                            style={{
                              fontSize: 12,
                              color: req.status === 'REJECTED' ? '#B91C1C' : '#92400E',
                              marginTop: 2,
                            }}
                          >
                            {req.status === 'REJECTED'
                              ? 'Community request was rejected by admin.'
                              : 'Pending admin approval — not yet visible publicly.'}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: req.status === 'REJECTED' ? '#FEE2E2' : '#FEF3C7' },
                          ]}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '700',
                              color: req.status === 'REJECTED' ? '#EF4444' : '#F59E0B',
                            }}
                          >
                            {req.status === 'REJECTED' ? 'REJECTED' : 'PENDING'}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={G} colors={[G]} />}
            ListEmptyComponent={() =>
              commSubTab === 'my' ? (
                debouncedSearch ? (
                  renderEmpty('search-outline', 'No Matching Communities', 'No joined communities match your search.')
                ) : (
                  <View style={[styles.emptyState, { backgroundColor: SURF, borderColor: BORDER }]}>
                    <View style={[styles.emptyIconBg, { backgroundColor: colors.primaryContainer }]}>
                      <Ionicons name="people-outline" size={36} color={G} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: TEXT }]}>No Communities Joined Yet</Text>
                    <Text style={[styles.emptySub, { color: TEXT3 }]}>
                      You haven't joined any communities yet. Discover and join communities that interest you!
                    </Text>
                    <TouchableOpacity
                      style={[styles.exploreBtn, { backgroundColor: G }]}
                      onPress={() => { setCommSubTab('all'); setSelectedCommType('All'); }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="compass-outline" size={18} color="#FFF" />
                      <Text style={styles.exploreBtnText}>Explore All Communities</Text>
                    </TouchableOpacity>
                  </View>
                )
              ) : (
                renderEmpty('globe-outline', 'No Communities Found', 'Try a different search or community type.')
              )
            }
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          />
        );

      case 'feed':
        return (
          <FlatList
            data={filteredPosts}
            renderItem={({ item }) => (
              <PostCard
                post={item}
                horizontalGutter={0}
                onCommentPress={(id) => {
                  setSelectedPostId(id);
                  setCommentSheetVisible(true);
                }}
              />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={renderSearchHeader()}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={G} colors={[G]} />}
            ListEmptyComponent={() => renderEmpty('newspaper-outline', 'No Posts Found', 'Try searching for different keywords.')}
            ItemSeparatorComponent={() => <View style={{ height: 4 }} />}
          />
        );

      case 'events':
        if ((eventsLoading || (selectedEventFilter === 'My Events' && myEventsLoading)) && events.length === 0) return (
          <ScrollView contentContainerStyle={styles.listContent}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <EventSkeleton />
              <EventSkeleton />
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <EventSkeleton />
              <EventSkeleton />
            </View>
          </ScrollView>
        );
        const myOwnEvents = (selectedEventFilter === 'My Events' ? myCreatedEvents : filteredEvents).filter(
          (e: any) => selectedEventFilter === 'My Events' ? true : e.creatorId === currentUser?.id
        );
        const displayEvents = selectedEventFilter === 'My Events'
          ? myCreatedEvents.filter((e: any) => {
              if (hasEventEnded(e)) return false;
              if (!debouncedSearch) return true;
              const q = debouncedSearch.toLowerCase();
              return e.title.toLowerCase().includes(q) || e.location?.toLowerCase().includes(q);
            })
          : filteredEvents;
        const ownInDisplay = displayEvents.filter((e: any) => e.creatorId === currentUser?.id);
        const othersInDisplay = displayEvents.filter((e: any) => e.creatorId !== currentUser?.id);
        const separatedEvents = [
          ...ownInDisplay.map((e: any) => ({ ...e, _isOwn: true })),
          ...othersInDisplay.map((e: any) => ({ ...e, _isOwn: false })),
        ];
        return (
          <FlatList
            key="events-grid-2"
            numColumns={2}
            data={separatedEvents}
            renderItem={({ item }: { item: any }) => renderEventCard({ item, isOwn: item._isOwn })}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            columnWrapperStyle={{ gap: 12 }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={() => (
              <View style={{ marginBottom: 4 }}>
                {renderSearchHeader()}
                {ownInDisplay.length > 0 && selectedEventFilter !== 'My Events' && (
                  <View style={[styles.eventSectionLabel, { backgroundColor: colors.primaryContainer }]}>
                    <Ionicons name="person-outline" size={13} color={G} />
                    <Text style={[styles.eventSectionLabelText, { color: G }]}>Your Events ({ownInDisplay.length})</Text>
                  </View>
                )}
              </View>
            )}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={G} colors={[G]} />}
            ListEmptyComponent={() =>
              selectedEventFilter === 'My Events'
                ? renderEmpty('calendar-outline', "You haven't posted any events yet.", 'Create your first event and it will appear here.')
                : renderEmpty('calendar-outline', 'No Events Found', 'Try changing the filter or search term.')
            }
          />
        );

      case 'business':
        return (
          <ScrollView
            contentContainerStyle={[styles.listContent, { paddingBottom: 110 }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0891B2" colors={['#0891B2']} />}
            showsVerticalScrollIndicator={false}
          >
            {renderSearchHeader()}

            {/* Business Network Hero Card */}
            <LinearGradient
              colors={isDark ? ['#0E7490', '#155E75'] : ['#0891B2', '#0E7490']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bizHeroCard}
            >
              <View style={styles.bizHeroTopRow}>
                <View style={styles.bizHeroIconWrap}>
                  <Ionicons name="storefront" size={20} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bizHeroTitle}>Business Network</Text>
                  <Text style={styles.bizHeroSub}>
                    Discover & support verified community businesses
                  </Text>
                </View>
              </View>

              <View style={styles.bizHeroActionRow}>
                <TouchableOpacity
                  style={styles.bizHeroPrimaryBtn}
                  onPress={() => router.push('/(tabs)/business/submit?from=discover' as any)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add" size={16} color="#0891B2" />
                  <Text style={styles.bizHeroPrimaryBtnText}>Add My Business</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.bizHeroSecondaryBtn}
                  onPress={() => router.push('/(tabs)/business' as any)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.bizHeroSecondaryBtnText}>Browse All</Text>
                  <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {bizLoading ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <ActivityIndicator size="large" color="#0891B2" />
              </View>
            ) : publicBusinesses.length === 0 ? (
              renderEmpty('storefront-outline', 'No Businesses Yet', 'Be the first to add your business to the community directory!')
            ) : (
              <>
                {publicBusinesses.slice(0, 6).map((b) => (
                  <TouchableOpacity
                    key={b.id}
                    style={[styles.bizCard, { backgroundColor: SURF, borderColor: BORDER }]}
                    onPress={() => router.push(`/business/${b.id}?from=discover` as any)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.bizCardLeft}>
                      <View style={[styles.bizCardLogo, { backgroundColor: isDark ? 'rgba(8, 145, 178, 0.2)' : '#ECFEFF' }]}>
                        {b.logoUrl ? (
                          <ExpoImage source={{ uri: b.logoUrl }} style={styles.bizCardLogoImage} contentFit="cover" />
                        ) : (
                          <Ionicons name="storefront-outline" size={20} color="#0891B2" />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.bizCardName, { color: TEXT }]} numberOfLines={1}>{b.businessName}</Text>
                        <Text style={[styles.bizCardCategory, { color: TEXT3 }]} numberOfLines={1}>{b.category}</Text>
                        <View style={styles.bizCardLocRow}>
                          <Ionicons name="location-outline" size={11} color={TEXT3} />
                          <Text style={[styles.bizCardLoc, { color: TEXT3 }]} numberOfLines={1}>{b.location}</Text>
                        </View>
                      </View>
                    </View>
                    {b.isVerified && (
                      <View style={[styles.bizVerifiedBadge, { backgroundColor: isDark ? 'rgba(8, 145, 178, 0.2)' : '#ECFEFF' }]}>
                        <Ionicons name="shield-checkmark" size={12} color="#0891B2" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}

                {publicBusinesses.length > 6 && (
                  <TouchableOpacity
                    style={[styles.bizViewMoreBtn, { borderColor: '#0891B2' }]}
                    onPress={() => router.push('/(tabs)/business' as any)}
                  >
                    <Text style={[styles.bizViewMoreText, { color: '#0891B2' }]}>
                      View all {publicBusinesses.length} businesses
                    </Text>
                    <Ionicons name="arrow-forward" size={15} color="#0891B2" />
                  </TouchableOpacity>
                )}
              </>
            )}
          </ScrollView>
        );

      case 'help':
        return (
          <ScrollView
            contentContainerStyle={[styles.listContent, { paddingBottom: 110 }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FA5252" colors={['#FA5252']} />}
            showsVerticalScrollIndicator={false}
          >
            {renderSearchHeader()}

            {/* Community Help Hero Card */}
            <LinearGradient
              colors={isDark ? ['#B91C1C', '#991B1B'] : ['#FA5252', '#E03131']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.helpHeroCard}
            >
              <View style={styles.bizHeroTopRow}>
                <View style={styles.bizHeroIconWrap}>
                  <Ionicons name="heart" size={20} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bizHeroTitle}>Community Help</Text>
                  <Text style={styles.bizHeroSub}>
                    Support members in need · Blood, Medical, Education & more
                  </Text>
                </View>
              </View>

              <View style={styles.bizHeroActionRow}>
                <TouchableOpacity
                  style={styles.bizHeroPrimaryBtn}
                  onPress={() => router.push('/(tabs)/community-help/create?from=discover' as any)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add" size={16} color="#FA5252" />
                  <Text style={[styles.bizHeroPrimaryBtnText, { color: '#FA5252' }]}>Post Help Request</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.bizHeroSecondaryBtn}
                  onPress={() => router.push('/(tabs)/community-help' as any)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.bizHeroSecondaryBtnText}>Open Hub</Text>
                  <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {helpLoading ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <ActivityIndicator size="large" color="#FA5252" />
              </View>
            ) : helpRequests.length === 0 ? (
              renderEmpty('heart-outline', 'No Active Help Requests', 'Post a help request to get support from community members.')
            ) : (
              <>
                {helpRequests.slice(0, 6).map((req) => {
                  const cat = HELP_CATEGORIES.find((c) => c.id === req.category);
                  const isUrgent = req.urgency === 'URGENT';
                  return (
                    <TouchableOpacity
                      key={req.id}
                      style={[
                        styles.bizCard,
                        {
                          backgroundColor: SURF,
                          borderColor: isUrgent ? '#FECACA' : BORDER,
                        },
                      ]}
                      onPress={() => router.push(`/community-help/${req.id}?from=discover` as any)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.bizCardLeft}>
                        <View style={[styles.bizCardLogo, { backgroundColor: (cat?.color || '#FA5252') + '18' }]}>
                          <Text style={{ fontSize: 18 }}>{cat?.emoji || '❤️'}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <Text style={[styles.bizCardName, { color: TEXT, flex: 1 }]} numberOfLines={1}>
                              {req.title}
                            </Text>
                            {isUrgent && (
                              <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                <Text style={{ color: '#FA5252', fontSize: 10, fontWeight: '800' }}>URGENT</Text>
                              </View>
                            )}
                          </View>
                          <Text style={[styles.bizCardCategory, { color: TEXT3 }]} numberOfLines={1}>
                            {req.category} · By {req.requesterName}
                          </Text>
                          <View style={styles.bizCardLocRow}>
                            <Ionicons name="location-outline" size={11} color={TEXT3} />
                            <Text style={[styles.bizCardLoc, { color: TEXT3 }]} numberOfLines={1}>{req.location}</Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {helpRequests.length > 6 && (
                  <TouchableOpacity
                    style={[styles.bizViewMoreBtn, { borderColor: '#FA5252' }]}
                    onPress={() => router.push('/(tabs)/community-help' as any)}
                  >
                    <Text style={[styles.bizViewMoreText, { color: '#FA5252' }]}>
                      View all {helpRequests.length} help requests
                    </Text>
                    <Ionicons name="arrow-forward" size={15} color="#FA5252" />
                  </TouchableOpacity>
                )}
              </>
            )}
          </ScrollView>
        );

      case 'stories':
        return (
          <ScrollView
            contentContainerStyle={[styles.listContent, { paddingBottom: 110 }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FB923C" colors={['#FB923C']} />}
            showsVerticalScrollIndicator={false}
          >
            {renderSearchHeader()}

            {/* Our People Promo banner */}
            <View style={[styles.bizBanner, { backgroundColor: '#FB923C' }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bizBannerTitle}>🌟 Our People</Text>
                <Text style={styles.bizBannerSub}>Inspiring journeys & contributions from our community</Text>
              </View>
              <TouchableOpacity
                style={[styles.bizBrowseAll, { backgroundColor: 'rgba(255,255,255,0.22)', borderColor: 'rgba(255,255,255,0.45)' }]}
                onPress={() => router.push('/(tabs)/our-people' as any)}
              >
                <Text style={styles.bizBrowseAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            {storiesLoading ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <ActivityIndicator size="large" color="#FB923C" />
              </View>
            ) : exploreStories.length === 0 ? (
              renderEmpty('book-outline', 'No Stories Found', 'Inspiring community stories will appear here.')
            ) : (
              <>
                {exploreStories.slice(0, 6).map((st) => {
                  const cat = STORY_CATEGORIES.find((c) => c.id === st.category);
                  return (
                    <TouchableOpacity
                      key={st.id}
                      style={[
                        styles.bizCard,
                        {
                          backgroundColor: SURF,
                          borderColor: BORDER,
                        },
                      ]}
                      onPress={() => router.push(`/our-people/${st.id}?from=discover` as any)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.bizCardLeft}>
                        <View style={[styles.bizCardLogo, { backgroundColor: (cat?.color || '#FB923C') + '18' }]}>
                          <Text style={{ fontSize: 18 }}>{cat?.emoji || '🌟'}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.bizCardName, { color: TEXT }]} numberOfLines={1}>
                            {st.title}
                          </Text>
                          <Text style={[styles.bizCardCategory, { color: TEXT3 }]} numberOfLines={1}>
                            {st.personName} · {st.profession}
                          </Text>
                          <View style={styles.bizCardLocRow}>
                            <Ionicons name="location-outline" size={11} color={TEXT3} />
                            <Text style={[styles.bizCardLoc, { color: TEXT3 }]} numberOfLines={1}>{st.location}</Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {exploreStories.length > 6 && (
                  <TouchableOpacity
                    style={[styles.bizViewMoreBtn, { borderColor: '#FB923C' }]}
                    onPress={() => router.push('/(tabs)/our-people' as any)}
                  >
                    <Text style={[styles.bizViewMoreText, { color: '#FB923C' }]}>
                      View all {exploreStories.length} community stories
                    </Text>
                    <Ionicons name="arrow-forward" size={15} color="#FB923C" />
                  </TouchableOpacity>
                )}
              </>
            )}
          </ScrollView>
        );
    }
  };

  // ── Sub-filter row (below tabs, specific per tab) ──────────────────────────
  const renderSubFilters = () => {
    if (activeTab === 'events') {
      return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subFiltersScroll} accessibilityLabel="Event filters. Swipe horizontally for more options.">
          {EVENT_FILTERS.map((f) => {
            const active = selectedEventFilter === f;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setSelectedEventFilter(f)}
                style={[styles.subFilterChip, {
                  backgroundColor: active ? '#E11D48' : SURF,
                  borderColor: active ? '#E11D48' : BORDER,
                }]}
              >
                <Text style={[styles.subFilterText, { color: active ? '#FFF' : TEXT3 }]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      );
    }
    if (activeTab === 'communities') {
      return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subFiltersScroll} accessibilityLabel="Community filters. Swipe horizontally for more options.">
          {COMMUNITY_TYPES.map((t) => {
            const active = selectedCommType === t;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setSelectedCommType(t)}
                style={[styles.subFilterChip, {
                  backgroundColor: active ? '#16A34A' : SURF,
                  borderColor: active ? '#16A34A' : BORDER,
                }]}
              >
                <Text style={[styles.subFilterText, { color: active ? '#FFF' : TEXT3 }]}>{t}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      );
    }
    return null;
  };

  // ── Search header (injected as ListHeader) ─────────────────────────────────
  const renderSearchHeader = () => (
    <View>
      <View style={styles.resultCountRow}>
        <Text style={[styles.resultCount, { color: TEXT3 }]}>
          {activeTab === 'members' && `${filteredMembers.length} members`}
          {activeTab === 'communities' && (
            commSubTab === 'my'
              ? `${filteredCommunities.length} joined ${filteredCommunities.length === 1 ? 'community' : 'communities'}`
              : `${filteredCommunities.length} ${filteredCommunities.length === 1 ? 'community' : 'communities'}`
          )}
          {activeTab === 'feed' && `${filteredPosts.length} posts`}
          {activeTab === 'events' && `${filteredEvents.length} events`}
          {activeTab === 'business' && `${publicBusinesses.length} businesses`}
          {activeTab === 'help' && `${helpRequests.length} requests`}
          {activeTab === 'stories' && `${exploreStories.length} stories`}
        </Text>
        {debouncedSearch ? (
          <Text style={[styles.searchingFor, { color: TAB_COLOR }]}>for "{debouncedSearch}"</Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: BG, paddingTop: insets.top }]}>

      {/* ── App Bar ─────────────────────────────────────────────────────── */}
      <View style={[styles.appBar, { backgroundColor: SURF, borderBottomColor: BORDER }]}>
        <View style={styles.appBarBrand}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.primaryContainer }]}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/' as any))}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={18} color={G} />
          </TouchableOpacity>
          <Text style={[styles.appBarTitle, { color: TEXT }]}>Discover</Text>
        </View>
        {activeTab === 'events' ? (
          <TouchableOpacity
            style={[
              styles.filterBtn,
              {
                backgroundColor: showFilterSheet
                  ? (selectedEventFilter !== 'All' ? '#E11D48' : colors.primaryContainer)
                  : colors.elevation1,
              },
            ]}
            onPress={() => setShowFilterSheet((v) => !v)}
            accessibilityLabel="Toggle event filters"
          >
            <Ionicons
              name={showFilterSheet ? 'options' : 'options-outline'}
              size={20}
              color={showFilterSheet ? (selectedEventFilter !== 'All' ? '#FFF' : G) : TEXT}
            />
            {selectedEventFilter !== 'All' && !showFilterSheet && (
              <View style={[styles.activeFilterDot, { backgroundColor: '#E11D48' }]} />
            )}
          </TouchableOpacity>
        ) : activeTab === 'communities' ? (
          <TouchableOpacity
            style={[
              styles.filterBtn,
              {
                backgroundColor: showCommFilterRow
                  ? (selectedCommType !== 'All' ? '#16A34A' : colors.primaryContainer)
                  : colors.elevation1,
              },
            ]}
            onPress={() => setShowCommFilterRow((v) => !v)}
            accessibilityLabel="Toggle category filters"
          >
            <Ionicons
              name={showCommFilterRow ? 'options' : 'options-outline'}
              size={20}
              color={showCommFilterRow ? (selectedCommType !== 'All' ? '#FFF' : G) : TEXT}
            />
            {selectedCommType !== 'All' && !showCommFilterRow && (
              <View style={[styles.activeFilterDot, { backgroundColor: '#16A34A' }]} />
            )}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      {/* ── Search Bar ──────────────────────────────────────────────────── */}
      <View style={[styles.searchBarWrap, { backgroundColor: SURF, borderBottomColor: BORDER }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.inputBg, borderColor: isFocused ? TAB_COLOR : 'transparent' }]}>
          <Ionicons name="search" size={18} color={isFocused ? TAB_COLOR : TEXT3} style={{ marginRight: 8 }} />
          <TextInput
            ref={searchRef}
            placeholder={`Search ${activeTab}...`}
            placeholderTextColor={TEXT3}
            value={searchText}
            onChangeText={setSearchText}
            onFocus={() => setIsFocused(true)}
            onBlur={() => { if (!searchText) setIsFocused(false); }}
            onSubmitEditing={() => commitSearch(searchText)}
            returnKeyType="search"
            style={[styles.searchInput, { color: TEXT }]}
          />
          {(searchLoading || postsLoading || commsLoading || eventsLoading) && debouncedSearch ? (
            <ActivityIndicator size={14} color={TAB_COLOR} style={{ marginRight: 2 }} />
          ) : null}
          {searchText.length > 0 ? (
            <TouchableOpacity onPress={clearSearch} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={18} color={TEXT3} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.micBtn, { backgroundColor: isListening ? TAB_BG : colors.elevation2 }]}
              onPress={startVoice}
            >
              <Ionicons name={isListening ? 'mic' : 'mic-outline'} size={14} color={isListening ? TAB_COLOR : TEXT3} />
            </TouchableOpacity>
          )}
        </View>
        {isFocused && searchText.length === 0 && (
          <TouchableOpacity onPress={() => { setIsFocused(false); searchRef.current?.blur(); }} style={{ paddingLeft: 10 }}>
            <Text style={[styles.cancelText, { color: TAB_COLOR }]}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Category Tab Bar ────────────────────────────────────────────── */}
      <View style={[styles.tabBar, { backgroundColor: SURF, borderBottomColor: BORDER }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarScroll}>
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            const tabBg = isDark ? tab.bgDark : tab.bgLight;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => {
                  setActiveTab(tab.id);
                  setSelectedEventFilter('All');
                  setSelectedCommType('All');
                  if (tab.id === 'events') {
                    setShowFilterSheet(true);
                  }
                  if (tab.id === 'communities') {
                    setShowCommFilterRow(true);
                  }
                }}
                style={[
                  styles.tab,
                  active && {
                    borderBottomColor: tab.color,
                    borderBottomWidth: 2.5,
                    backgroundColor: tabBg,
                    borderTopLeftRadius: 10,
                    borderTopRightRadius: 10,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={(active ? tab.activeIcon : tab.icon) as any}
                  size={16}
                  color={active ? tab.color : TEXT3}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: active ? tab.color : TEXT3,
                      fontWeight: active ? '700' : '500',
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Communities Sub Tabs ────────────────────────────────────────── */}
      {activeTab === 'communities' && (
        <View style={[styles.commSubTabsWrap, { backgroundColor: SURF, borderBottomColor: BORDER }]}>
          <View style={[styles.commSegmentContainer, { backgroundColor: isDark ? colors.elevation1 : '#F1F5F9' }]}>
            <TouchableOpacity
              style={[
                styles.commSegmentBtn,
                commSubTab === 'all' && [styles.commSegmentBtnActive, { backgroundColor: '#16A34A' }],
              ]}
              onPress={() => setCommSubTab('all')}
              activeOpacity={0.8}
              accessibilityRole="tab"
              accessibilityState={{ selected: commSubTab === 'all' }}
            >
              <Ionicons
                name={commSubTab === 'all' ? 'globe' : 'globe-outline'}
                size={15}
                color={commSubTab === 'all' ? '#FFF' : TEXT3}
              />
              <Text
                style={[
                  styles.commSegmentText,
                  {
                    color: commSubTab === 'all' ? '#FFF' : TEXT2,
                    fontWeight: commSubTab === 'all' ? '700' : '600',
                  },
                ]}
              >
                All communities
              </Text>
              <View
                style={[
                  styles.commBadge,
                  {
                    backgroundColor: commSubTab === 'all' ? 'rgba(255, 255, 255, 0.25)' : isDark ? colors.elevation2 : '#E2E8F0',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.commBadgeText,
                    { color: commSubTab === 'all' ? '#FFF' : TEXT2 },
                  ]}
                >
                  {allCommunitiesCount}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.commSegmentBtn,
                commSubTab === 'my' && [styles.commSegmentBtnActive, { backgroundColor: '#16A34A' }],
              ]}
              onPress={() => setCommSubTab('my')}
              activeOpacity={0.8}
              accessibilityRole="tab"
              accessibilityState={{ selected: commSubTab === 'my' }}
            >
              <Ionicons
                name={commSubTab === 'my' ? 'people' : 'people-outline'}
                size={15}
                color={commSubTab === 'my' ? '#FFF' : TEXT3}
              />
              <Text
                style={[
                  styles.commSegmentText,
                  {
                    color: commSubTab === 'my' ? '#FFF' : TEXT2,
                    fontWeight: commSubTab === 'my' ? '700' : '600',
                  },
                ]}
              >
                My communities
              </Text>
              <View
                style={[
                  styles.commBadge,
                  {
                    backgroundColor: commSubTab === 'my' ? 'rgba(255, 255, 255, 0.25)' : isDark ? colors.elevation2 : '#E2E8F0',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.commBadgeText,
                    { color: commSubTab === 'my' ? '#FFF' : TEXT2 },
                  ]}
                >
                  {myCommunitiesCount}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Category Filter Chips */}
          {showCommFilterRow && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.commCategoriesScroll}
            >
              {COMMUNITY_TYPES.map((t) => {
                const active = selectedCommType === t;
                return (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setSelectedCommType(t)}
                    activeOpacity={0.7}
                    style={[
                      styles.commCategoryPill,
                      {
                        backgroundColor: active ? (isDark ? 'rgba(22, 163, 74, 0.2)' : '#E8F5E9') : (isDark ? colors.elevation1 : '#F8FAFC'),
                        borderColor: active ? '#16A34A' : BORDER,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.commCategoryPillText,
                        { color: active ? '#16A34A' : TEXT3, fontWeight: active ? '700' : '500' },
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}

      {/* ── Filter Sheet ────────────────────────────────────────────────── */}
      {showFilterSheet && activeTab === 'events' && (
        <View style={[styles.filterSheet, { backgroundColor: SURF, borderBottomColor: BORDER }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterSheetScroll}>
            {EVENT_FILTERS.map((f) => {
              const active = selectedEventFilter === f;
              return (
                <TouchableOpacity
                  key={f}
                  onPress={() => setSelectedEventFilter(f)}
                  activeOpacity={0.7}
                  style={[
                    styles.commCategoryPill,
                    {
                      backgroundColor: active ? (isDark ? 'rgba(225, 29, 72, 0.2)' : '#FFE4E6') : (isDark ? colors.elevation1 : '#F8FAFC'),
                      borderColor: active ? '#E11D48' : BORDER,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.commCategoryPillText,
                      { color: active ? '#E11D48' : TEXT3, fontWeight: active ? '700' : '500' },
                    ]}
                  >
                    {f}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── Search overlay ──────────────────────────────────────────────── */}
      {/* ── Voice error / listening toast ──────────────────────────────── */}
      {(isListening || voiceError) && (
        <View style={[styles.voiceBanner, { backgroundColor: isListening ? TAB_BG : '#FEE2E2', borderColor: isListening ? TAB_COLOR : '#EF4444' }]}>
          {isListening && <ActivityIndicator size={14} color={TAB_COLOR} />}
          <Text style={[styles.voiceBannerText, { color: isListening ? TAB_COLOR : '#EF4444' }]}>
            {isListening ? 'Listening… tap mic to stop' : voiceError}
          </Text>
        </View>
      )}

      {isFocused && searchText.length === 0 && renderSearchOverlay()}

      {/* ── Main content ────────────────────────────────────────────────── */}
      {!(isFocused && searchText.length === 0) && renderTabContent()}

      {/* ── Comment Sheet ────────────────────────────────────────────────── */}
      <CommentSheet
        postId={selectedPostId}
        visible={commentSheetVisible}
        onClose={() => setCommentSheetVisible(false)}
      />

      {/* ── Event Comment Sheet ──────────────────────────────────────────── */}
      <EventCommentSheet
        eventId={selectedEventId}
        eventTitle={selectedEventTitle}
        visible={eventCommentSheetVisible}
        onClose={() => { setEventCommentSheetVisible(false); setSelectedEventId(null); }}
      />

      <EventShareSheet
        visible={!!shareSheetEvent}
        onClose={() => setShareSheetEvent(null)}
        eventTitle={shareSheetEvent?.title ?? ''}
        eventId={shareSheetEvent?.id ?? ''}
        shareUrl={`${API_BASE_URL.replace('/api/v1', '')}/explore?tab=events&event=${shareSheetEvent?.id ?? ''}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // App Bar
  appBar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  appBarBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoMark: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  appBarTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  filterBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  activeFilterDot: { position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: '#FFFFFF' },

  // Search Bar
  searchBarWrap: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, height: 44, borderRadius: 14,
    borderWidth: 1.5,
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '400', padding: 0 },
  micBtn: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600' },

  // Tab Bar (underline style)
  tabBar: { borderBottomWidth: StyleSheet.hairlineWidth },
  tabBarScroll: { paddingHorizontal: 8 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 2.5, borderBottomColor: 'transparent',
  },
  tabLabel: { fontSize: 14 },

  // Sub-filters
  subFiltersScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  subFilterChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5,
  },
  subFilterText: { fontSize: 13, fontWeight: '600' },

  // Result count
  resultCountRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingBottom: 10,
  },
  resultCount: { fontSize: 13, fontWeight: '500' },
  searchingFor: { fontSize: 13, fontWeight: '700' },

  // List content padding
  listContent: { paddingHorizontal: 16, paddingBottom: 100, paddingTop: 4 },

  // ── Search Overlay ─────────────────────────────────────────────────────────
  searchOverlay: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  searchSection: { marginBottom: 24 },
  searchSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  searchSectionTitle: { fontSize: 16, fontWeight: '700' },
  clearAllText: { fontSize: 13, fontWeight: '600' },
  recentItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 12 },
  recentIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  recentText: { flex: 1, fontSize: 15 },
  trendingWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  trendingChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  trendingText: { fontSize: 13, fontWeight: '700' },
  tipsCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: 16, borderWidth: 1,
  },
  tipsText: { flex: 1, fontSize: 13, lineHeight: 18 },

  // ── Member Card ────────────────────────────────────────────────────────────
  memberCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 18, borderWidth: StyleSheet.hairlineWidth,
    padding: 12, gap: 10,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 3 },
      android: { elevation: 1 },
    }),
  },
  memberCardLeft: { position: 'relative', flexShrink: 0 },
  memberAvatarRing: {
    width: 54, height: 54, borderRadius: 27,
    borderWidth: 2, overflow: 'hidden',
  },
  memberAvatar: { width: '100%', height: '100%' },
  memberBadgeDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 18, height: 18, borderRadius: 9, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  memberInfo: { flex: 1, gap: 3, minWidth: 0 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  memberName: { fontSize: 14, fontWeight: '700', flexShrink: 1, minWidth: 0 },
  memberBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, borderWidth: 1, flexShrink: 0 },
  memberBadgeText: { fontSize: 10, fontWeight: '700' },
  memberMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 0 },
  memberMetaText: { fontSize: 12, fontWeight: '400', flexShrink: 1, minWidth: 0 },
  memberActions: { gap: 8, alignItems: 'center', flexShrink: 0 },
  viewProfileBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  viewProfileText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  msgBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },

  // Skeleton for member
  memberCardSkeleton: { flexDirection: 'row', gap: 12, padding: 14 },

  // ── Community Card ─────────────────────────────────────────────────────────
  communityCard: {
    borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3 },
      android: { elevation: 1 },
    }),
  },
  communityBannerWrap: { position: 'relative' },
  communityBanner: { width: '100%' },
  communityBannerOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.4)' },
  categoryChip: {
    position: 'absolute', top: 10, right: 10,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  categoryChipText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  communityAvatarWrap: {
    width: 52, height: 52, borderRadius: 14, borderWidth: 3,
    marginLeft: 16, marginTop: -26, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
      android: { elevation: 1.5 },
    }),
  },
  communityAvatar: { width: '100%', height: '100%' },
  communityBody: { padding: 14, paddingTop: 10 },
  communityNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  communityName: { fontSize: 16, fontWeight: '800', flex: 1, marginRight: 8 },
  joinedChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  joinedChipText: { fontSize: 11, fontWeight: '700' },
  communityDesc: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  communityStats: { flexDirection: 'row', gap: 16 },
  commStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  commStatText: { fontSize: 13, fontWeight: '500' },
  // Skeleton for community
  communityCardSkeleton: { borderRadius: 20, overflow: 'hidden' },

  // ── Event Card ─────────────────────────────────────────────────────────────
  eventCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  eventBannerWrap: {
    width: '100%',
    height: 124,
    position: 'relative',
    overflow: 'visible',
  },
  eventBanner: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 19,
    borderTopRightRadius: 19,
  },
  eventBannerFallback: {
    backgroundColor: '#A3B899',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBadge: {
    position: 'absolute',
    bottom: -12,
    left: 10,
    zIndex: 10,
    minWidth: 42,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  dateBadgeDay: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 16,
  },
  dateBadgeMonth: {
    color: '#FFF',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  interestFloatingBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  eventBody: {
    paddingHorizontal: 12,
    paddingTop: 18,
    paddingBottom: 12,
  },
  eventTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    marginBottom: 6,
    lineHeight: 19,
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  eventMetaText: {
    fontSize: 11.5,
    fontWeight: '500',
    flex: 1,
  },
  eventFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
  },
  eventAttendeesWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventAttendeesCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  eventActionWrap: {
    marginTop: 10,
    width: '100%',
  },

  // Skeleton for event
  eventCardSkeleton: { borderRadius: 20, overflow: 'hidden' },

  // Event section label
  eventSectionLabel: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 10, marginBottom: 8,
  },
  eventSectionLabelText: { fontSize: 12, fontWeight: '700' },

  // ── Voice Banner ───────────────────────────────────────────────────────────
  voiceBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 12, borderWidth: 1,
  },
  voiceBannerText: { fontSize: 13, fontWeight: '600', flex: 1 },

  // ── Filter Sheet ───────────────────────────────────────────────────────────
  filterSheet: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterSheetLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  filterSheetScroll: { gap: 8, paddingBottom: 4 },

  // ── Empty State ────────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center', paddingVertical: 52,
    borderRadius: 20, borderWidth: StyleSheet.hairlineWidth,
    gap: 12, marginTop: 12,
  },
  emptyIconBg: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { fontSize: 14, textAlign: 'center', paddingHorizontal: 24, lineHeight: 20 },

  // ── Business Tab ───────────────────────────────────────────────────────────
  bizHeroCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    ...Platform.select({
      ios: { shadowColor: '#0891B2', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  helpHeroCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    ...Platform.select({
      ios: { shadowColor: '#FA5252', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  bizHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  bizHeroIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bizHeroTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  bizHeroSub: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: 12.5,
    lineHeight: 17,
  },
  bizHeroActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bizHeroPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 11,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
      android: { elevation: 1 },
    }),
  },
  bizHeroPrimaryBtnText: {
    color: '#0891B2',
    fontSize: 13,
    fontWeight: '700',
  },
  bizHeroSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 11,
  },
  bizHeroSecondaryBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  bizBanner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
    borderRadius: 16, marginBottom: 12,
  },
  bizBannerTitle: { color: '#FFF', fontSize: 14, fontWeight: '800', marginBottom: 2 },
  bizBannerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12.5, lineHeight: 17 },
  bizBrowseAll: {
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 11, paddingVertical: 6,
    borderRadius: 9, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  bizBrowseAllText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

  bizCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 10,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6 }, android: { elevation: 1 } }),
  },
  bizCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  bizCardLogo: { width: 42, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  bizCardLogoImage: { width: '100%', height: '100%' },
  bizCardName: { fontSize: 14.5, fontWeight: '700', marginBottom: 2 },
  bizCardCategory: { fontSize: 12, marginBottom: 3 },
  bizCardLocRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bizCardLoc: { fontSize: 11.5 },
  bizVerifiedBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  bizViewMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, marginBottom: 10,
  },
  bizViewMoreText: { fontSize: 14, fontWeight: '700' },
  bizAddBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 13, borderRadius: 14, marginTop: 2,
  },
  bizAddBtnText: { color: '#FFF', fontSize: 14.5, fontWeight: '700' },

  // ── Communities Sub-Tabs & Segmented Bar ─────────────────────────────────────
  commSubTabsWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  commSegmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 3,
    marginBottom: 8,
  },
  commSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 9,
    gap: 6,
  },
  commSegmentBtnActive: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
    }),
  },
  commSegmentText: {
    fontSize: 13,
  },
  commBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  commBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  commCategoriesScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  commCategoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  commCategoryPillText: {
    fontSize: 12,
  },
  commRequestsWrap: {
    marginBottom: 10,
  },
  requestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  exploreBtnText: {
    color: '#FFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
});

