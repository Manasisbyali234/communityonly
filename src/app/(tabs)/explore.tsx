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
import { usePublicBusinessesQuery } from '../../api/business';
import { usePublicHelpRequestsQuery, HELP_CATEGORIES } from '../../api/communityHelp';
import { usePublicStoriesQuery, STORY_CATEGORIES } from '../../api/ourPeople';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../theme';
import { usePostsQuery } from '../../api/feed';
import { useCommunitiesQuery, useJoinCommunityMutation } from '../../api/community';
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

// ── Tab types ─────────────────────────────────────────────────────────────────
type ExploreTab = 'members' | 'communities' | 'feed' | 'events' | 'business' | 'help' | 'stories';
const VALID_TABS: ExploreTab[] = ['members', 'communities', 'feed', 'events', 'business', 'help', 'stories'];
const TABS: { id: ExploreTab; label: string; icon: string }[] = [
  { id: 'members',     label: 'Members',      icon: 'people-outline' },
  { id: 'communities', label: 'Communities',  icon: 'globe-outline' },
  { id: 'feed',        label: 'Feed',         icon: 'newspaper-outline' },
  { id: 'events',      label: 'Events',       icon: 'calendar-outline' },
  { id: 'business',    label: 'Business',     icon: 'storefront-outline' },
  { id: 'help',        label: 'Help',      icon: 'heart-outline' },
  { id: 'stories',     label: 'Our People', icon: 'book-outline' },
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
  const G = colors.primary;
  const { data: status = 'NONE', isLoading: statusLoading } = useConnectionStatusQuery(item.id, currentUserId);
  const sendRequest = useSendConnectionRequestMutation();

  const handleConnect = () => {
    if (status !== 'NONE') return;
    sendRequest.mutate(item.id, {
      onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to send request', 'error'),
    });
  };

  const iconName = status === 'ACCEPTED' ? 'checkmark-circle' : status === 'PENDING_SENT' ? 'time-outline' : 'person-add-outline';
  const bgColor = status === 'ACCEPTED' ? colors.primaryContainer : status === 'PENDING_SENT' ? colors.elevation1 : colors.primaryContainer;
  const iconColor = status === 'PENDING_SENT' ? colors.textMuted : G;

  return (
    <TouchableOpacity
      style={[styles.msgBtn, { backgroundColor: bgColor }]}
      onPress={handleConnect}
      disabled={status !== 'NONE' || sendRequest.isPending || statusLoading}
    >
      {sendRequest.isPending ? (
        <ActivityIndicator size={14} color={G} />
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
  const params = useLocalSearchParams<{ tab?: string }>();
  const showToast = useToastStore((s) => s.showToast);
  const currentUser = useAuthStore((s) => s.user);
  const { width: windowWidth } = useWindowDimensions();
  const communityBannerHeight = Math.round(windowWidth * 0.28);
  const eventBannerHeight = Math.round(windowWidth * 0.4);

  const [activeTab, setActiveTab] = useState<ExploreTab>(() => resolveTab(params.tab));

  useEffect(() => {
    setActiveTab(resolveTab(params.tab));
  }, [params.tab]);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedEventFilter, setSelectedEventFilter] = useState('All');
  const [selectedCommType, setSelectedCommType] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [commentSheetVisible, setCommentSheetVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const searchRef = useRef<TextInput>(null);

  const { data: posts = [], isLoading: postsLoading, refetch: refetchPosts } = usePostsQuery();
  const { data: communities = [], isLoading: commsLoading, refetch: refetchComms } = useCommunitiesQuery();
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
    else if (activeTab === 'communities') await refetchComms();
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

  const filteredCommunities = communities.filter((c: any) => {
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
      onPress={() => router.push(`/user/${item.id}` as any)}
      activeOpacity={0.7}
    >
      <View style={styles.memberCardLeft}>
        <View style={[styles.memberAvatarRing, { borderColor: G }]}>
          <ExpoImage
            source={item.avatarUrl
              ? { uri: item.avatarUrl }
              : { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(item.displayName || item.username || 'U')}&background=e8f5e9&color=4caf50` }
            }
            style={styles.memberAvatar}
            contentFit="cover"
          />
        </View>
        {item.role === 'MODERATOR' && (
          <View style={[styles.memberBadgeDot, { backgroundColor: G, borderColor: SURF }]}>
            <Ionicons name="shield-checkmark" size={8} color="#FFF" />
          </View>
        )}
      </View>

      <View style={styles.memberInfo}>
        <View style={styles.memberNameRow}>
          <Text style={[styles.memberName, { color: TEXT }]} numberOfLines={1}>{item.displayName || item.username}</Text>
          {item.role ? (
            <View style={[styles.memberBadge, { backgroundColor: 'rgba(21, 101, 192, 0.15)', borderColor: 'rgba(21, 101, 192, 0.3)' }]}>
              <Text style={[styles.memberBadgeText, { color: '#1565C0' }]}>{item.role}</Text>
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
            <Ionicons name="people-outline" size={12} color={G} />
            <Text style={[styles.memberMetaText, { color: G }]} numberOfLines={1}>{item.followersCount} followers</Text>
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
      onPress={() => router.push(`/community/${item.id}` as any)}
      activeOpacity={0.9}
    >
      {/* Banner */}
      <View style={[styles.communityBannerWrap, { height: communityBannerHeight }]}>
        <ExpoImage
          source={{ uri: item.bannerUrl || 'https://placehold.co/600x200/e8f5e9/4caf50?text=Community' }}
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
          source={{ uri: item.avatarUrl || 'https://ui-avatars.com/api/?name=C&background=e8f5e9&color=4caf50' }}
          style={styles.communityAvatar}
          contentFit="cover"
        />
      </View>

      <View style={styles.communityBody}>
        <View style={styles.communityNameRow}>
          <Text style={[styles.communityName, { color: TEXT }]} numberOfLines={1}>{item.name}</Text>
          {item.isJoined && (
            <View style={[styles.joinedChip, { backgroundColor: colors.primaryContainer }]}>
              <Ionicons name="checkmark-circle" size={12} color={G} />
              <Text style={[styles.joinedChipText, { color: G }]}>Following</Text>
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
        onPress={() => router.push(`/events/${item.id}` as any)}
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
              <Ionicons name="calendar-outline" size={38} color="#2D6A2D" />
            </View>
          )}

          {/* Overlapping Date badge bottom-left */}
          <View style={[styles.dateBadge, { backgroundColor: G }]}>
            <Text style={styles.dateBadgeDay}>{dayNum}</Text>
            <Text style={styles.dateBadgeMonth}>{monthShort}</Text>
          </View>

          {/* Floating Interest Star Icon top-right */}
          <TouchableOpacity
            style={[
              styles.interestFloatingBtn,
              { backgroundColor: isInterested ? '#D97706' : 'rgba(0,0,0,0.45)' },
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
                { backgroundColor: isPast ? '#F3F4F6' : '#DCFCE7' },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: isPast ? '#6B7280' : '#16A34A' },
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
            ListHeaderComponent={renderSearchHeader()}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={G} colors={[G]} />}
            ListEmptyComponent={() => renderEmpty('globe-outline', 'No Communities Found', 'Try a different search or community type.')}
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
            contentContainerStyle={[styles.listContent, { paddingBottom: 20 }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={G} colors={[G]} />}
            showsVerticalScrollIndicator={false}
          >
            {renderSearchHeader()}

            {/* Promo banner */}
            <View style={[styles.bizBanner, { backgroundColor: G }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bizBannerTitle}>🏪 Gowda Business Network</Text>
                <Text style={styles.bizBannerSub}>Discover and support community businesses</Text>
              </View>
              <TouchableOpacity
                style={styles.bizBrowseAll}
                onPress={() => router.push('/business' as any)}
              >
                <Text style={styles.bizBrowseAllText}>Browse All</Text>
              </TouchableOpacity>
            </View>

            {bizLoading ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <ActivityIndicator size="large" color={G} />
              </View>
            ) : publicBusinesses.length === 0 ? (
              renderEmpty('storefront-outline', 'No Businesses Yet', 'Be the first to add your business to the community directory!')
            ) : (
              <>
                {publicBusinesses.slice(0, 6).map((b) => (
                  <TouchableOpacity
                    key={b.id}
                    style={[styles.bizCard, { backgroundColor: SURF, borderColor: BORDER }]}
                    onPress={() => router.push(`/business/${b.id}` as any)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.bizCardLeft}>
                      <View style={[styles.bizCardLogo, { backgroundColor: colors.primaryContainer }]}>
                        {b.logoUrl ? (
                          <ExpoImage source={{ uri: b.logoUrl }} style={styles.bizCardLogoImage} contentFit="cover" />
                        ) : (
                          <Ionicons name="storefront-outline" size={20} color={G} />
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
                      <View style={[styles.bizVerifiedBadge, { backgroundColor: colors.primaryContainer }]}>
                        <Ionicons name="shield-checkmark" size={12} color={G} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}

                {publicBusinesses.length > 6 && (
                  <TouchableOpacity
                    style={[styles.bizViewMoreBtn, { borderColor: G }]}
                    onPress={() => router.push('/business' as any)}
                  >
                    <Text style={[styles.bizViewMoreText, { color: G }]}>
                      View all {publicBusinesses.length} businesses
                    </Text>
                    <Ionicons name="arrow-forward" size={15} color={G} />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.bizAddBtn, { backgroundColor: G }]}
                  onPress={() => router.push('/business/submit' as any)}
                >
                  <Ionicons name="add" size={18} color="#FFF" />
                  <Text style={styles.bizAddBtnText}>Add My Business</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        );

      case 'help':
        return (
          <ScrollView
            contentContainerStyle={[styles.listContent, { paddingBottom: 20 }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={G} colors={[G]} />}
            showsVerticalScrollIndicator={false}
          >
            {renderSearchHeader()}

            {/* Help Promo banner */}
            <View style={[styles.bizBanner, { backgroundColor: '#DC2626' }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bizBannerTitle}>❤️ Community Help</Text>
                <Text style={styles.bizBannerSub}>Support members in need · Blood, Medical, Education & more</Text>
              </View>
              <TouchableOpacity
                style={styles.bizBrowseAll}
                onPress={() => router.push('/community-help' as any)}
              >
                <Text style={styles.bizBrowseAllText}>Open Hub</Text>
              </TouchableOpacity>
            </View>

            {helpLoading ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <ActivityIndicator size="large" color={G} />
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
                      onPress={() => router.push(`/community-help/${req.id}` as any)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.bizCardLeft}>
                        <View style={[styles.bizCardLogo, { backgroundColor: (cat?.color || '#DC2626') + '18' }]}>
                          <Text style={{ fontSize: 18 }}>{cat?.emoji || '❤️'}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <Text style={[styles.bizCardName, { color: TEXT, flex: 1 }]} numberOfLines={1}>
                              {req.title}
                            </Text>
                            {isUrgent && (
                              <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                <Text style={{ color: '#DC2626', fontSize: 10, fontWeight: '800' }}>URGENT</Text>
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
                    style={[styles.bizViewMoreBtn, { borderColor: G }]}
                    onPress={() => router.push('/community-help' as any)}
                  >
                    <Text style={[styles.bizViewMoreText, { color: G }]}>
                      View all {helpRequests.length} help requests
                    </Text>
                    <Ionicons name="arrow-forward" size={15} color={G} />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.bizAddBtn, { backgroundColor: '#DC2626' }]}
                  onPress={() => router.push('/community-help/create' as any)}
                >
                  <Ionicons name="add" size={18} color="#FFF" />
                  <Text style={styles.bizAddBtnText}>Post Help Request</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        );

      case 'stories':
        return (
          <ScrollView
            contentContainerStyle={[styles.listContent, { paddingBottom: 20 }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={G} colors={[G]} />}
            showsVerticalScrollIndicator={false}
          >
            {renderSearchHeader()}

            {/* Our People Promo banner */}
            <View style={[styles.bizBanner, { backgroundColor: '#D97706' }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bizBannerTitle}>Our People</Text>
                <Text style={styles.bizBannerSub}>Inspiring journeys & contributions from our community</Text>
              </View>
              <TouchableOpacity
                style={styles.bizBrowseAll}
                onPress={() => router.push('/our-people' as any)}
              >
                <Text style={styles.bizBrowseAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            {storiesLoading ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <ActivityIndicator size="large" color={G} />
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
                      onPress={() => router.push(`/our-people/${st.id}` as any)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.bizCardLeft}>
                        <View style={[styles.bizCardLogo, { backgroundColor: (cat?.color || '#D97706') + '18' }]}>
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
                    style={[styles.bizViewMoreBtn, { borderColor: G }]}
                    onPress={() => router.push('/our-people' as any)}
                  >
                    <Text style={[styles.bizViewMoreText, { color: G }]}>
                      View all {exploreStories.length} community stories
                    </Text>
                    <Ionicons name="arrow-forward" size={15} color={G} />
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
                  backgroundColor: active ? G : SURF,
                  borderColor: active ? G : BORDER,
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
                  backgroundColor: active ? G : SURF,
                  borderColor: active ? G : BORDER,
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
          {activeTab === 'communities' && `${filteredCommunities.length} communities`}
          {activeTab === 'feed' && `${filteredPosts.length} posts`}
          {activeTab === 'events' && `${filteredEvents.length} events`}
          {activeTab === 'business' && `${publicBusinesses.length} businesses`}
          {activeTab === 'help' && `${helpRequests.length} requests`}
          {activeTab === 'stories' && `${exploreStories.length} stories`}
        </Text>
        {debouncedSearch ? (
          <Text style={[styles.searchingFor, { color: G }]}>for "{debouncedSearch}"</Text>
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
            onPress={() => router.replace('/' as any)}
            accessibilityLabel="Go to Home"
          >
            <Ionicons name="arrow-back" size={18} color={G} />
          </TouchableOpacity>
          <Text style={[styles.appBarTitle, { color: TEXT }]}>Discover</Text>
        </View>
        <TouchableOpacity style={[styles.filterBtn, { backgroundColor: showFilterSheet ? G : colors.elevation1 }]} onPress={() => setShowFilterSheet(v => !v)}>
          <Ionicons name="options-outline" size={20} color={showFilterSheet ? '#FFF' : TEXT} />
        </TouchableOpacity>
      </View>

      {/* ── Search Bar ──────────────────────────────────────────────────── */}
      <View style={[styles.searchBarWrap, { backgroundColor: SURF, borderBottomColor: BORDER }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.inputBg, borderColor: isFocused ? G : 'transparent' }]}>
          <Ionicons name="search" size={18} color={isFocused ? G : TEXT3} style={{ marginRight: 8 }} />
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
            <ActivityIndicator size={14} color={G} style={{ marginRight: 2 }} />
          ) : null}
          {searchText.length > 0 ? (
            <TouchableOpacity onPress={clearSearch} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={18} color={TEXT3} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.micBtn, { backgroundColor: isListening ? colors.primaryContainer : colors.elevation2 }]}
              onPress={startVoice}
            >
              <Ionicons name={isListening ? 'mic' : 'mic-outline'} size={14} color={isListening ? G : TEXT3} />
            </TouchableOpacity>
          )}
        </View>
        {isFocused && searchText.length === 0 && (
          <TouchableOpacity onPress={() => { setIsFocused(false); searchRef.current?.blur(); }} style={{ paddingLeft: 10 }}>
            <Text style={[styles.cancelText, { color: G }]}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Category Tab Bar ────────────────────────────────────────────── */}
      <View style={[styles.tabBar, { backgroundColor: SURF, borderBottomColor: BORDER }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarScroll}>
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => { setActiveTab(tab.id); setSelectedEventFilter('All'); setSelectedCommType('All'); }}
                style={[styles.tab, active && { borderBottomColor: G, borderBottomWidth: 2.5 }]}
              >
                <Ionicons name={tab.icon as any} size={16} color={active ? G : TEXT3} />
                <Text style={[styles.tabLabel, { color: active ? G : TEXT3, fontWeight: active ? '700' : '500' }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Filter Sheet ────────────────────────────────────────────────── */}
      {showFilterSheet && (
        <View style={[styles.filterSheet, { backgroundColor: SURF, borderBottomColor: BORDER }]}>
          {activeTab === 'events' && (
            <>
              <Text style={[styles.filterSheetLabel, { color: TEXT3 }]}>Filter Events</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterSheetScroll}>
                {EVENT_FILTERS.map((f) => {
                  const active = selectedEventFilter === f;
                  return (
                    <TouchableOpacity
                      key={f}
                      onPress={() => { setSelectedEventFilter(f); setShowFilterSheet(false); }}
                      style={[styles.subFilterChip, { backgroundColor: active ? G : colors.elevation1, borderColor: active ? G : BORDER }]}
                    >
                      <Text style={[styles.subFilterText, { color: active ? '#FFF' : TEXT3 }]}>{f}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}
          {activeTab === 'communities' && (
            <>
              <Text style={[styles.filterSheetLabel, { color: TEXT3 }]}>Community Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterSheetScroll}>
                {COMMUNITY_TYPES.map((t) => {
                  const active = selectedCommType === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      onPress={() => { setSelectedCommType(t); setShowFilterSheet(false); }}
                      style={[styles.subFilterChip, { backgroundColor: active ? G : colors.elevation1, borderColor: active ? G : BORDER }]}
                    >
                      <Text style={[styles.subFilterText, { color: active ? '#FFF' : TEXT3 }]}>{t}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}

        </View>
      )}

      {/* ── Search overlay ──────────────────────────────────────────────── */}
      {/* ── Voice error / listening toast ──────────────────────────────── */}
      {(isListening || voiceError) && (
        <View style={[styles.voiceBanner, { backgroundColor: isListening ? colors.primaryContainer : '#FEE2E2', borderColor: isListening ? G : '#EF4444' }]}>
          {isListening && <ActivityIndicator size={14} color={G} />}
          <Text style={[styles.voiceBannerText, { color: isListening ? G : '#EF4444' }]}>
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
  filterBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

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
      ios: { shadowColor: '#1A2D1A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 2 },
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
      ios: { shadowColor: '#1A2D1A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 3 },
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
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
      android: { elevation: 4 },
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
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
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
  bizBanner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
    borderRadius: 16, marginBottom: 12,
  },
  bizBannerTitle: { color: '#FFF', fontSize: 14, fontWeight: '800', marginBottom: 2 },
  bizBannerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12.5, lineHeight: 17 },
  bizBrowseAll: {
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  bizBrowseAllText: { color: '#FFF', fontSize: 12.5, fontWeight: '700' },

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
});

