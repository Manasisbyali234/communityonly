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
import { useNotificationsQuery, useUnreadCountQuery, useChatSocket, useNotificationSocket, useChatsQuery } from '../../api/chat';
import { useAuthStore } from '../../store/authStore';
import { resolveUserApproval } from '../../store/userApprovalStore';
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

const COVER_HEIGHT = 260;

const TABS: { id: ProfileTab; label: string; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'about',       label: 'About',       icon: 'person-outline',    activeIcon: 'person' },
  { id: 'posts',       label: 'Posts',        icon: 'grid-outline',      activeIcon: 'grid' },
  { id: 'communities', label: 'Communities',  icon: 'globe-outline',     activeIcon: 'globe' },
  { id: 'events',      label: 'Events',       icon: 'calendar-outline',  activeIcon: 'calendar' },
  { id: 'family',      label: 'Family',       icon: 'people-outline',    activeIcon: 'people' },
  { id: 'updates',     label: 'Activity',     icon: 'sparkles-outline',  activeIcon: 'sparkles' },
];

// ── Info Row ──────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value, color, isLast }: { icon: string; label: string; value?: string | null; color: string; isLast?: boolean }) {
  const { colors, isDark } = useTheme();
  if (!value) return null;
  return (
    <View style={[s.infoRow, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      <View style={[s.infoRowIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon as any} size={14} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.infoRowLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[s.infoRowValue, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

// ── Section Card ─────────────────────────────────────────────────────────────
function SectionCard({ title, icon, color, action, actionLabel, children }: {
  title: string; icon: string; color: string;
  action?: () => void; actionLabel?: string; children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={[s.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={s.sectionCardHeader}>
        <LinearGradient colors={[color, color + 'AA']} style={s.sectionCardIconWrap}>
          <Ionicons name={icon as any} size={15} color="#FFF" />
        </LinearGradient>
        <Text style={[s.sectionCardTitle, { color: colors.text }]}>{title}</Text>
        {action && actionLabel && (
          <TouchableOpacity onPress={action} style={[s.sectionCardAction, { backgroundColor: color + '12' }]}>
            <Text style={[s.sectionCardActionText, { color }]}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

// ── Updates Tab ───────────────────────────────────────────────────────────────
function UpdatesTab() {
  const { colors, isDark } = useTheme();
  const { data: notifications = [], isLoading } = useNotificationsQuery();
  const G = colors.primary;

  const getIcon = (type: string): { icon: keyof typeof Ionicons.glyphMap; color: string } => {
    switch (type) {
      case 'LIKE':           return { icon: 'heart',         color: colors.error };
      case 'COMMENT':        return { icon: 'chatbubble',    color: colors.info };
      case 'FOLLOW':         return { icon: 'person-add',    color: G };
      case 'COMMUNITY_JOIN': return { icon: 'people',        color: G };
      case 'EVENT_REMINDER': return { icon: 'calendar',      color: colors.tertiary };
      case 'MENTION':        return { icon: 'at',            color: colors.heritage };
      default:               return { icon: 'notifications', color: G };
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
    <SectionCard title="Recent Activity" icon="sparkles" color={G}>
      {isLoading && (
        <Text style={{ color: colors.textMuted, textAlign: 'center', paddingVertical: 24, fontSize: 13 }}>Loading activity...</Text>
      )}
      {!isLoading && notifications.length === 0 && (
        <View style={s.emptyState}>
          <View style={[s.emptyIconCircle, { backgroundColor: G + '12' }]}>
            <Ionicons name="notifications-off-outline" size={26} color={G} />
          </View>
          <Text style={[s.emptyTitle, { color: colors.text }]}>No Activity Yet</Text>
          <Text style={[s.emptySubtitle, { color: colors.textMuted }]}>Community interactions will appear here.</Text>
        </View>
      )}
      {notifications.map((n, i) => {
        const { icon, color } = getIcon(n.type);
        return (
          <View key={n.id} style={[s.activityRow, i < notifications.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
            <View style={[s.activityIconRing, { backgroundColor: color + '15' }]}>
              <Ionicons name={icon} size={15} color={color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.activityText, { color: colors.text }]}>{n.body || n.type}</Text>
              <Text style={[s.activityTime, { color: colors.textMuted }]}>{formatTime(n.createdAt)}</Text>
            </View>
          </View>
        );
      })}
    </SectionCard>
  );
}

// ── Family Tab ────────────────────────────────────────────────────────────────
function FamilyTab({ familyName, userId }: { familyName?: string; userId?: string }) {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const showToast = useToastStore((s) => s.showToast);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const G = colors.primary;

  useEffect(() => {
    if (!familyName) return;
    setLoading(true);
    apiClient.get('/users', { params: { familyName, limit: 50 } })
      .then((res) => {
        const raw = res.data?.data ?? res.data ?? [];
        const data = Array.isArray(raw) ? raw : (raw.users ?? raw.data ?? []);
        setMembers(data.filter((m: any) => m.id !== userId));
      })
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, [familyName, userId]);

  // Fetch popular family names when no family name is set
  useEffect(() => {
    if (familyName) return;
    setSuggestionsLoading(true);
    apiClient.get('/users', { params: { limit: 100 } })
      .then((res) => {
        const data: any[] = res.data?.data ?? res.data ?? [];
        const counts: Record<string, number> = {};
        data.forEach((u: any) => {
          const fn = u.familyName?.trim();
          if (fn) counts[fn] = (counts[fn] || 0) + 1;
        });
        const sorted = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 12)
          .map(([name]) => name);
        setSuggestions(sorted);
      })
      .catch(() => setSuggestions([]))
      .finally(() => setSuggestionsLoading(false));
  }, [familyName]);

  const handleInvite = async () => {
    const { shareAppLink } = await import('../../utils/shareUtils');
    const ok = await shareAppLink('a family member', userId);
    showToast(ok ? 'Invite link shared!' : 'Could not send invite', ok ? 'success' : 'error');
  };

  return (
    <SectionCard
      title={familyName ? `${familyName} Family` : 'Family Directory'}
      icon="people"
      color={G}
      action={handleInvite}
      actionLabel="Invite"
    >
      {!familyName && (
        <View style={s.emptyState}>
          <View style={[s.emptyIconCircle, { backgroundColor: G + '12' }]}>
            <Ionicons name="people-outline" size={26} color={G} />
          </View>
          <Text style={[s.emptyTitle, { color: colors.text }]}>No Family Name Set</Text>
          <Text style={[s.emptySubtitle, { color: colors.textMuted }]}>Add your Family / Okka name to connect with family members.</Text>

          {/* Family name suggestions */}
          {suggestionsLoading ? (
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 12 }}>Loading suggestions...</Text>
          ) : suggestions.length > 0 ? (
            <View style={{ width: '100%', marginTop: 16 }}>
              <Text style={[{ fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 8, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.4 }]}>
                Popular Family Names in Community
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {suggestions.map((name) => (
                  <TouchableOpacity
                    key={name}
                    style={[{
                      paddingHorizontal: 12, paddingVertical: 6,
                      borderRadius: 20, borderWidth: 1,
                      backgroundColor: G + '10', borderColor: G + '35',
                      flexDirection: 'row', alignItems: 'center', gap: 5,
                    }]}
                    onPress={() => router.push(`/(tabs)/edit-profile?familyName=${encodeURIComponent(name)}` as any)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="people" size={12} color={G} />
                    <Text style={{ fontSize: 12.5, fontWeight: '600', color: G }}>{name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 10 }}>
                Tap a name to set it as your family name
              </Text>
            </View>
          ) : null}

          <Button title="Set Family Name" icon="create-outline" variant="primary" size="sm"
            onPress={() => router.push('/(tabs)/edit-profile' as any)} style={{ marginTop: 14 }} />
        </View>
      )}
      {familyName && loading && (
        <Text style={{ color: colors.textMuted, textAlign: 'center', paddingVertical: 24, fontSize: 13 }}>Loading family members...</Text>
      )}
      {familyName && !loading && members.length === 0 && (
        <View style={s.emptyState}>
          <View style={[s.emptyIconCircle, { backgroundColor: G + '12' }]}>
            <Ionicons name="people-outline" size={26} color={G} />
          </View>
          <Text style={[s.emptyTitle, { color: colors.text }]}>No Members Found</Text>
          <Text style={[s.emptySubtitle, { color: colors.textMuted }]}>No other members with the {familyName} family name yet.</Text>
          <TouchableOpacity style={[s.inviteBtn, { backgroundColor: G }]} onPress={handleInvite}>
            <Ionicons name="person-add-outline" size={14} color="#FFF" />
            <Text style={s.inviteBtnText}>Invite Family Members</Text>
          </TouchableOpacity>
        </View>
      )}
      {familyName && !loading && members.map((member: any, i: number) => (
        <TouchableOpacity
          key={member.id}
          style={[s.memberRow, i < members.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
          onPress={() => router.push(`/user/${member.id}` as any)}
          activeOpacity={0.7}
        >
          <Avatar url={member.avatarUrl} name={member.displayName} size={42} />
          <View style={{ flex: 1 }}>
            <Text style={[s.memberName, { color: colors.text }]} numberOfLines={1}>{member.displayName}</Text>
            <Text style={[s.memberMeta, { color: colors.textMuted }]} numberOfLines={1}>
              {[member.occupation, member.city || member.district].filter(Boolean).join(' · ') || 'Community Member'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      ))}
    </SectionCard>
  );
}

// ── Main Profile Screen ───────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: SW } = useWindowDimensions();
  const { user, updateProfile } = useAuthStore();
  const { isApproved } = resolveUserApproval(user);

  const [activeTab, setActiveTab] = useState<ProfileTab>('about');
  const [bioExpanded, setBioExpanded] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

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
  const myCommunities = useMemo(() => allCommunities.filter((c: any) =>
    c.isJoined ||
    (user?.id && (c.creatorId === user.id || c.ownerId === user.id)) ||
    (c.role && c.role !== 'NONE')
  ), [allCommunities, user]);

  const [forwardSheetVisible, setForwardSheetVisible] = useState(false);
  const [selectedForwardPostId, setSelectedForwardPostId] = useState<string | null>(null);
  const [commentSheetVisible, setCommentSheetVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [participantsSheetVisible, setParticipantsSheetVisible] = useState(false);
  const [selectedParticipantEvent, setSelectedParticipantEvent] = useState<{ id: string; title: string; count: number } | null>(null);
  const showToast = useToastStore((state) => state.showToast);

  const handleShare = useCallback(async () => {
    const ok = await shareAppLink(user?.displayName || 'A friend', user?.id);
    showToast(ok ? 'App link copied!' : 'Could not share', ok ? 'success' : 'error');
  }, [user, showToast]);

  const G = colors.primary;
  const SEC = colors.secondary;
  const TERT = colors.tertiary;
  const INFO = colors.info;
  const SUCCESS = colors.success;
  const ERR = colors.error;
  const HERITAGE = colors.heritage;
  const BG = colors.background;
  const SURF = colors.surface;
  const BORDER = colors.border;
  const TEXT = colors.text;
  const TEXT2 = colors.textSecondary;
  const TEXT3 = colors.textMuted;

  const coverHeight = SW >= 768 ? 280 : COVER_HEIGHT;

  const navBgOpacity = scrollY.interpolate({ inputRange: [coverHeight - 80, coverHeight], outputRange: [0, 1], extrapolate: 'clamp' });
  const navTitleOpacity = scrollY.interpolate({ inputRange: [coverHeight, coverHeight + 40], outputRange: [0, 1], extrapolate: 'clamp' });

  const memberYear = (user?.joinedAt || user?.createdAt)
    ? new Date(user.joinedAt || user.createdAt!).getFullYear().toString()
    : '2026';
  const primaryNativePlace = user?.nativePlace || user?.village;
  const primaryProfession = user?.profession || user?.occupation;
  const skillTags = user?.skills ? user.skills.split(',').map((s) => s.trim()).filter(Boolean) : [];

  const connCount = typeof connectionCount === 'number' ? connectionCount : (connectionCount as any)?.count ?? user?.followersCount ?? 0;

  return (
    <View style={[s.root, { backgroundColor: BG }]}>
      {/* ── Floating Nav Bar ─────────────────────────────────────────── */}
      <Animated.View style={[s.navbar, { paddingTop: insets.top, height: insets.top + 52 }]}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: SURF, opacity: navBgOpacity, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER }]} />
        <TouchableOpacity
          onPress={() => isApproved ? (router.canGoBack() ? router.back() : router.replace('/(tabs)')) : router.replace('/(auth)/approval-status')}
          style={[s.navBtn, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.92)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)' }]}
        >
          <Ionicons name="arrow-back" size={20} color={TEXT} />
        </TouchableOpacity>

        <Animated.Text style={[s.navTitle, { color: TEXT, opacity: navTitleOpacity }]} numberOfLines={1}>
          {user?.displayName || 'Profile'}
        </Animated.Text>

        <View style={s.navRight}>
          {isApproved && (
            <>
              <TouchableOpacity
                style={[s.navBtn, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.92)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)' }]}
                onPress={() => router.push('/notifications' as any)}
              >
                <Ionicons name="notifications-outline" size={19} color={TEXT} />
                {unreadCount > 0 && (
                  <View style={[s.navBadge, { backgroundColor: ERR }]}>
                    <Text style={s.navBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.navBtn, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.92)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)' }]}
                onPress={() => router.push('/(tabs)/chat' as any)}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={19} color={TEXT} />
                {unreadChatCount > 0 && (
                  <View style={[s.navBadge, { backgroundColor: ERR }]}>
                    <Text style={s.navBadgeText}>{unreadChatCount > 99 ? '99+' : unreadChatCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </>
          )}
          {!isApproved && (
            <TouchableOpacity
              style={[s.navBtn, { backgroundColor: colors.tertiaryContainer, borderColor: TERT }]}
              onPress={() => router.push('/(auth)/approval-status?from=settings' as any)}
            >
              <Ionicons name="shield-checkmark-outline" size={19} color={colors.tertiaryDark} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[s.navBtn, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.92)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)' }]}
            onPress={() => router.push({ pathname: '/(tabs)/settings', params: { from: 'profile' } } as any)}
          >
            <Ionicons name="settings-outline" size={19} color={TEXT} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(96, insets.bottom + 80) }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        {/* ── Cover ──────────────────────────────────────────────────── */}
        <View style={{ height: coverHeight, position: 'relative' }}>
          {user?.coverImage || user?.bannerUrl ? (
            <Image source={{ uri: user.coverImage || user.bannerUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
          ) : (
            <LinearGradient
              colors={isDark
                ? [colors.primaryDark, colors.primary, colors.forestGreen]
                : [colors.primaryDark, colors.primary, colors.primaryLight]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.68)']}
            style={StyleSheet.absoluteFill}
          />
          {/* Cover edit hint */}
          <TouchableOpacity
            style={s.coverEditBtn}
            onPress={() => router.push('/edit-profile' as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="camera-outline" size={14} color="#FFF" />
            <Text style={s.coverEditText}>Edit Cover</Text>
          </TouchableOpacity>
        </View>

        {/* ── Masthead ───────────────────────────────────────────────── */}
        <View style={[s.masthead, { backgroundColor: SURF, borderBottomColor: BORDER }]}>
          {/* Avatar row */}
          <View style={s.mastheadAvatarRow}>
            <View style={[s.avatarRing, { borderColor: G, backgroundColor: SURF }]}>
              <Avatar url={user?.avatarUrl} name={user?.displayName} size={96} />
              {user?.isVerified && (
                <LinearGradient colors={[G, G + 'CC']} style={s.verifiedBadge}>
                  <Ionicons name="checkmark-sharp" size={10} color="#FFF" />
                </LinearGradient>
              )}
            </View>
            <View style={s.mastheadActions}>
              <TouchableOpacity style={[s.editBtn, { overflow: 'hidden' }]} onPress={() => router.push('/edit-profile' as any)} activeOpacity={0.85}>
                <LinearGradient colors={[G, G + 'CC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                <Ionicons name="create-outline" size={15} color="#FFF" />
                <Text style={s.editBtnText}>Edit Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.iconBtn, { backgroundColor: SURF, borderColor: BORDER }]} onPress={handleShare} activeOpacity={0.8}>
                <Ionicons name="share-social-outline" size={17} color={TEXT2} />
              </TouchableOpacity>
              {isApproved && (
                <TouchableOpacity style={[s.iconBtn, { backgroundColor: SURF, borderColor: BORDER }]} onPress={() => router.push('/(tabs)/media-gallery' as any)} activeOpacity={0.8}>
                  <Ionicons name="images-outline" size={17} color={TEXT2} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Name & identity */}
          <View style={s.identityBlock}>
            <View style={s.nameRow}>
              <Text style={[s.profileName, { color: TEXT }]} numberOfLines={1}>{user?.displayName || 'User'}</Text>
              {user?.isVerified && (
                <View style={[s.verifiedChip, { backgroundColor: G + '15', borderColor: G + '30' }]}>
                  <Ionicons name="shield-checkmark" size={11} color={G} />
                  <Text style={[s.verifiedChipText, { color: G }]}>Verified</Text>
                </View>
              )}
            </View>
            {user?.username && (
              <Text style={[s.username, { color: TEXT3 }]}>@{user.username}</Text>
            )}

            {/* Profession + location pills */}
            <View style={s.pillsRow}>
              {primaryProfession && (
                <View style={[s.infoPill, { backgroundColor: G + '12', borderColor: G + '22' }]}>
                  <Ionicons name="briefcase" size={11} color={G} />
                  <Text style={[s.infoPillText, { color: G }]} numberOfLines={1}>{primaryProfession}</Text>
                </View>
              )}
              {(user?.city || user?.district) && (
                <View style={[s.infoPill, { backgroundColor: BORDER, borderColor: BORDER }]}>
                  <Ionicons name="location-sharp" size={11} color={TEXT3} />
                  <Text style={[s.infoPillText, { color: TEXT2 }]} numberOfLines={1}>{user?.city || user?.district}</Text>
                </View>
              )}
              {user?.familyName && (
                <View style={[s.infoPill, { backgroundColor: colors.primaryDark + '20', borderColor: colors.primaryDark + '40' }]}>
                  <Ionicons name="people" size={11} color={colors.primaryDark} />
                  <Text style={[s.infoPillText, { color: colors.primaryDark }]} numberOfLines={1}>{user.familyName}</Text>
                </View>
              )}
            </View>

            {/* Bio */}
            {(user?.bio) && (
              <View style={s.bioBlock}>
                <Text style={[s.bioText, { color: TEXT2 }]} numberOfLines={bioExpanded ? undefined : 2}>
                  {user.bio}
                </Text>
                {user.bio.length > 90 && (
                  <TouchableOpacity onPress={() => setBioExpanded(!bioExpanded)}>
                    <Text style={[s.bioToggle, { color: G }]}>{bioExpanded ? 'See less' : 'See more'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Pending banner */}
            {!isApproved && (
              <TouchableOpacity
                style={[s.pendingBanner, { backgroundColor: isDark ? TERT + '25' : colors.tertiaryContainer, borderColor: TERT }]}
                onPress={() => router.push('/(auth)/approval-status?from=settings' as any)}
                activeOpacity={0.8}
              >
                <View style={[s.pendingIcon, { backgroundColor: TERT }]}>
                  <Ionicons name="time" size={14} color={colors.onTertiary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.pendingTitle, { color: isDark ? colors.tertiary : colors.tertiaryDark }]}>Pending Admin Approval</Text>
                  <Text style={[s.pendingSub, { color: isDark ? TERT : colors.tertiaryDark }]}>Some features are restricted. Tap to view status.</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={isDark ? TERT : colors.tertiaryDark} />
              </TouchableOpacity>
            )}
          </View>

          {/* ── Stats Bar ──────────────────────────────────────────── */}
          <View style={[s.statsBar, { borderTopColor: BORDER, borderBottomColor: BORDER }]}>
            {[
              { label: 'Connections', value: connCount.toString(),                    icon: 'people',    color: G,                      onPress: isApproved ? () => router.push('/(tabs)/chat' as any) : undefined },
              { label: 'Following',   value: (user?.followingCount || 0).toString(),  icon: 'person-add', color: colors.primaryLight,    onPress: isApproved ? () => router.push('/(tabs)/explore?tab=members' as any) : undefined },
              { label: 'Events',      value: myEvents.length.toString(),              icon: 'calendar',  color: colors.primaryDark,     onPress: isApproved ? () => setActiveTab('events') : undefined },
              { label: 'Since',       value: memberYear,                              icon: 'ribbon',    color: colors.forestGreen,     onPress: undefined },
            ].map((stat, i, arr) => (
              <TouchableOpacity
                key={stat.label}
                style={[s.statCell, i < arr.length - 1 && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: BORDER }]}
                onPress={stat.onPress}
                disabled={!stat.onPress}
                activeOpacity={0.7}
              >
                <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
                <View style={s.statLabelRow}>
                  <Ionicons name={stat.icon as any} size={10} color={stat.color} />
                  <Text style={[s.statLabel, { color: TEXT3 }]}>{stat.label}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Tab Bar ────────────────────────────────────────────────── */}
        <View style={[s.tabBarWrap, { backgroundColor: SURF, borderBottomColor: BORDER }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabBarScroll}>
            {(isApproved ? TABS : TABS.filter((t) => t.id === 'about')).map((tab) => {
              const active = activeTab === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  style={[s.tabItem, active && { borderBottomColor: G, borderBottomWidth: 2.5 }]}
                >
                  <View style={active ? [s.tabIconPill, { backgroundColor: G + '15' }] : null}>
                    <Ionicons name={active ? tab.activeIcon : tab.icon} size={15} color={active ? G : TEXT3} />
                  </View>
                  <Text style={[s.tabLabel, { color: active ? G : TEXT3, fontWeight: active ? '700' : '500' }]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Tab Content ────────────────────────────────────────────── */}
        <View style={s.contentArea}>

          {/* ABOUT TAB */}
          {activeTab === 'about' && (
            <View style={{ gap: 12 }}>
              {/* Completion nudge */}
              {(!primaryNativePlace || !primaryProfession) && (
                <View style={[s.completionCard, { backgroundColor: G + '0D', borderColor: G + '28' }]}>
                  <View style={[s.completionIcon, { backgroundColor: G }]}>
                    <Ionicons name="sparkles" size={14} color="#FFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.completionTitle, { color: TEXT }]}>Complete Your Profile</Text>
                    <Text style={[s.completionSub, { color: TEXT2 }]}>Add your native place and profession to connect better.</Text>
                  </View>
                  <TouchableOpacity style={[s.completionBtn, { backgroundColor: G }]} onPress={() => router.push('/(tabs)/edit-profile' as any)}>
                    <Text style={s.completionBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Personal Details */}
              <SectionCard title="Personal Details" icon="person-circle-outline" color={G} action={() => router.push('/(tabs)/edit-profile' as any)} actionLabel="Edit">
                <InfoRow icon="location" label="Native Place" value={primaryNativePlace} color={G} />
                <InfoRow icon="briefcase" label="Profession" value={primaryProfession} color={colors.primaryDark} />
                <InfoRow icon="business-outline" label="Company" value={user?.company} color={colors.forestGreen} />
                <InfoRow icon="school-outline" label="Education" value={user?.education} color={colors.primaryLight} />
                <InfoRow icon="calendar-outline" label="Date of Birth" value={user?.dob} color={TERT} />
                <InfoRow icon="person-outline" label="Gender" value={user?.gender} color={G} />
                <InfoRow icon="call-outline" label="Phone" value={user?.phone || user?.phoneNumber} color={colors.primaryDark} isLast />
                {/* Languages */}
                {user?.languages && (
                  <View style={[s.pillSection, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER }]}>
                    <Text style={[s.pillSectionLabel, { color: TEXT3 }]}>Languages</Text>
                    <View style={s.pillsWrap}>
                      {user.languages.split(',').map((l, i) => (
                        <View key={i} style={[s.tag, { backgroundColor: colors.surfaceVariant }]}>
                          <Text style={[s.tagText, { color: TEXT2 }]}>{l.trim()}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                {/* Interests */}
                {user?.interests && (
                  <View style={[s.pillSection, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER }]}>
                    <Text style={[s.pillSectionLabel, { color: TEXT3 }]}>Interests</Text>
                    <View style={s.pillsWrap}>
                      {user.interests.split(',').map((interest, i) => (
                        <View key={i} style={[s.tag, { backgroundColor: G + '12' }]}>
                          <Text style={[s.tagText, { color: G }]}>{interest.trim()}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                {/* Skills */}
                {skillTags.length > 0 && (
                  <View style={[s.pillSection, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER }]}>
                    <Text style={[s.pillSectionLabel, { color: TEXT3 }]}>Skills</Text>
                    <View style={s.pillsWrap}>
                      {skillTags.map((skill, i) => (
                        <View key={i} style={[s.tag, { backgroundColor: colors.primaryLight + '20' }]}>
                          <Text style={[s.tagText, { color: colors.primaryDark }]}>{skill}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </SectionCard>

              {/* Location Details */}
              <SectionCard title="Location & Roots" icon="map-outline" color={colors.primaryDark} action={() => router.push('/(tabs)/edit-profile' as any)} actionLabel="Edit">
                <InfoRow icon="flag-outline" label="Country" value={user?.country} color={TERT} />
                <InfoRow icon="map-outline" label="State" value={user?.state} color={G} />
                <InfoRow icon="navigate-outline" label="District" value={user?.district} color={colors.primaryDark} />
                <InfoRow icon="business-outline" label="City" value={user?.city} color={colors.forestGreen} />
                <InfoRow icon="home-outline" label="Native Place" value={primaryNativePlace} color={colors.primaryLight} />
                <InfoRow icon="location-outline" label="Current Location" value={user?.currentLocation} color={G} isLast />
              </SectionCard>

              {/* Engagement Stats */}
              <SectionCard title="Community Engagement" icon="stats-chart-outline" color={G}>
                <View style={s.engagementGrid}>
                  {[
                    { label: 'Communities', value: myCommunities.length || user?.communitiesCount || 0, icon: 'globe',    color: G,                   onPress: () => setActiveTab('communities') },
                    { label: 'Events',      value: myEvents.length,                                     icon: 'calendar', color: colors.primaryDark,  onPress: () => setActiveTab('events') },
                    { label: 'Connections', value: connCount,                                           icon: 'people',   color: colors.primaryLight, onPress: () => router.push('/(tabs)/chat' as any) },
                    { label: 'Posts',       value: posts.length,                                        icon: 'grid',     color: colors.forestGreen,  onPress: () => setActiveTab('posts') },
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.label}
                      style={[s.engagementCard, { backgroundColor: colors.surfaceVariant, borderColor: BORDER }]}
                      onPress={item.onPress}
                      activeOpacity={0.75}
                    >
                      <View style={[s.engagementIconWrap, { backgroundColor: item.color + '15' }]}>
                        <Ionicons name={item.icon as any} size={18} color={item.color} />
                      </View>
                      <Text style={[s.engagementValue, { color: TEXT }]}>{item.value}</Text>
                      <Text style={[s.engagementLabel, { color: TEXT3 }]}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </SectionCard>

              {/* Membership */}
              <SectionCard title="Membership & Security" icon="shield-checkmark-outline" color={G}>
                <InfoRow icon="shield-checkmark" label="Verification Status" value={user?.isVerified ? '✓ Verified Community Member' : 'Active Community Member'} color={G} />
                <InfoRow icon="at" label="Account Handle" value={`@${user?.username || 'user'}`} color={TEXT3} isLast />
              </SectionCard>
            </View>
          )}

          {/* POSTS TAB */}
          {activeTab === 'posts' && (
            <View style={{ gap: 12 }}>
              {posts.map((post) => (
                <PostCard key={post.id} post={post as any}
                  onCommentPress={(id) => { setSelectedPostId(id); setCommentSheetVisible(true); }}
                  onForwardPress={(id) => { setSelectedForwardPostId(id); setForwardSheetVisible(true); }}
                  horizontalGutter={0}
                />
              ))}
              {postsLoading && (
                <View style={[s.sectionCard, { backgroundColor: SURF, borderColor: BORDER, paddingVertical: 32, alignItems: 'center' }]}>
                  <Text style={{ color: TEXT3, fontSize: 13 }}>Loading posts...</Text>
                </View>
              )}
              {posts.length === 0 && !postsLoading && (
                <View style={[s.sectionCard, { backgroundColor: SURF, borderColor: BORDER }]}>
                  <View style={s.emptyState}>
                    <View style={[s.emptyIconCircle, { backgroundColor: G + '12' }]}>
                      <Ionicons name="document-text-outline" size={28} color={G} />
                    </View>
                    <Text style={[s.emptyTitle, { color: TEXT }]}>No Posts Yet</Text>
                    <Text style={[s.emptySubtitle, { color: TEXT3 }]}>Share updates with your community network.</Text>
                    <Button title="Create Post" icon="add" variant="primary" size="md"
                      onPress={() => router.push('/create/post' as any)} style={{ marginTop: 12 }} />
                  </View>
                </View>
              )}
            </View>
          )}

          {/* COMMUNITIES TAB */}
          {activeTab === 'communities' && (
            <SectionCard title="My Communities" icon="globe" color={G} action={() => router.push('/(tabs)/explore?tab=communities' as any)} actionLabel="Explore">
              {commsLoading && <Text style={{ color: TEXT3, textAlign: 'center', paddingVertical: 24, fontSize: 13 }}>Loading...</Text>}
              {!commsLoading && myCommunities.length === 0 && (
                <View style={s.emptyState}>
                  <View style={[s.emptyIconCircle, { backgroundColor: G + '12' }]}>
                    <Ionicons name="globe-outline" size={26} color={G} />
                  </View>
                  <Text style={[s.emptyTitle, { color: TEXT }]}>No Communities Joined</Text>
                  <Text style={[s.emptySubtitle, { color: TEXT3 }]}>Discover and join communities that interest you.</Text>
                  <Button title="Explore" icon="compass-outline" variant="primary" size="sm"
                    onPress={() => router.push('/(tabs)/explore?tab=communities' as any)} style={{ marginTop: 12 }} />
                </View>
              )}
              {!commsLoading && myCommunities.map((item: any, i: number) => {
                const isAdmin = user?.id && (item.creatorId === user.id || item.ownerId === user.id || item.role === 'ADMIN');
                const isMod = item.role === 'MODERATOR';
                const roleLabel = isAdmin ? 'Admin' : isMod ? 'Mod' : 'Member';
                const roleColor = isAdmin ? colors.primaryDark : G;
                const roleBg = isAdmin ? colors.primaryDark + '15' : G + '12';
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[s.communityRow, i < myCommunities.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER }]}
                    onPress={() => router.push(`/community/${item.id}` as any)}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={{ uri: item.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'C')}&background=e8f5e9&color=16a34a` }}
                      style={[s.communityAvatar, { borderColor: BORDER }]}
                      contentFit="cover"
                    />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[s.communityName, { color: TEXT }]} numberOfLines={1}>{item.name}</Text>
                        <View style={[s.rolePill, { backgroundColor: roleBg }]}>
                          <Text style={[s.rolePillText, { color: roleColor }]}>{roleLabel}</Text>
                        </View>
                      </View>
                      <Text style={[s.communityMeta, { color: TEXT3 }]} numberOfLines={1}>
                        {item.category ? `${item.category} · ` : ''}{(item.membersCount ?? 0).toLocaleString()} members
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={15} color={TEXT3} />
                  </TouchableOpacity>
                );
              })}
            </SectionCard>
          )}

          {/* EVENTS TAB */}
          {activeTab === 'events' && (
            <SectionCard title="Events" icon="calendar" color={G} action={() => router.push('/create/event' as any)} actionLabel="+ New">
              {myEvents.length === 0 && (
                <View style={s.emptyState}>
                  <View style={[s.emptyIconCircle, { backgroundColor: G + '12' }]}>
                    <Ionicons name="calendar-clear-outline" size={26} color={G} />
                  </View>
                  <Text style={[s.emptyTitle, { color: TEXT }]}>No Events Yet</Text>
                  <Text style={[s.emptySubtitle, { color: TEXT3 }]}>Events you host or attend will appear here.</Text>
                </View>
              )}
              {myEvents.map((event: any, i: number) => {
                const isPast = new Date(event.startsAt) < new Date();
                const dateStr = new Date(event.startsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                const timeStr = new Date(event.startsAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                const joinedCount = event.interestedCount ?? event.rsvpCount ?? 0;
                return (
                  <View key={event.id} style={[s.eventRow, i < myEvents.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER }]}>
                    <View style={[s.eventDateBox, { backgroundColor: isPast ? colors.surfaceVariant : G + '15' }]}>
                      <Text style={[s.eventMonth, { color: isPast ? TEXT3 : G }]}>
                        {new Date(event.startsAt).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                      </Text>
                      <Text style={[s.eventDay, { color: isPast ? TEXT3 : G }]}>{new Date(event.startsAt).getDate()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <Text style={[s.eventTitle, { color: TEXT, flex: 1 }]} numberOfLines={1}>{event.title}</Text>
                        <View style={[s.eventStatusPill, { backgroundColor: isPast ? colors.surfaceVariant : G + '18' }]}>
                          <Text style={[s.eventStatusText, { color: isPast ? TEXT3 : G }]}>{isPast ? 'Past' : 'Upcoming'}</Text>
                        </View>
                      </View>
                      <Text style={[s.eventMeta, { color: TEXT3 }]}>{dateStr} · {timeStr}</Text>
                      {event.location && <Text style={[s.eventMeta, { color: TEXT3 }]} numberOfLines={1}>{event.location}</Text>}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                        <TouchableOpacity
                          style={[s.joinedBadge, { backgroundColor: G + '12', borderColor: G + '25' }]}
                          onPress={() => { setSelectedParticipantEvent({ id: event.id, title: event.title, count: joinedCount }); setParticipantsSheetVisible(true); }}
                        >
                          <Ionicons name="people" size={12} color={G} />
                          <Text style={[s.joinedText, { color: G }]}>{joinedCount} joined</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push(`/events/${event.id}` as any)}>
                          <Text style={[s.viewLink, { color: G }]}>View →</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </SectionCard>
          )}

          {/* FAMILY TAB */}
          {activeTab === 'family' && <FamilyTab familyName={user?.familyName} userId={user?.id} />}

          {/* UPDATES TAB */}
          {activeTab === 'updates' && <UpdatesTab />}
        </View>
      </ScrollView>

      <CommentSheet postId={selectedPostId} visible={commentSheetVisible} onClose={() => setCommentSheetVisible(false)} />
      <ForwardSheet
        postId={selectedForwardPostId}
        visible={forwardSheetVisible}
        onClose={() => setForwardSheetVisible(false)}
        onNativeShare={async () => { try { await Share.share({ message: 'Check out this profile!' }); } catch (_) {} }}
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

const s = StyleSheet.create({
  root: { flex: 1 },

  // Nav
  navbar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  navBtn: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', marginHorizontal: 10, letterSpacing: -0.2 },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navBadge: {
    position: 'absolute', top: -2, right: -2,
    minWidth: 15, height: 15, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#FFF',
  },
  navBadgeText: { color: '#FFF', fontSize: 8, fontWeight: '800' },

  // Cover
  coverEditBtn: {
    position: 'absolute', bottom: 12, right: 14,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  coverEditText: { color: '#FFF', fontSize: 11.5, fontWeight: '600' },

  // Masthead
  masthead: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  mastheadAvatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: -50,
    marginBottom: 12,
  },
  avatarRing: {
    width: 104, height: 104, borderRadius: 52,
    borderWidth: 3, position: 'relative',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 10 },
      android: { elevation: 8 },
    }),
  },
  verifiedBadge: {
    position: 'absolute', bottom: 4, right: 4,
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2.5, borderColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
  },
  mastheadActions: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 4 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  editBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },

  // Identity
  identityBlock: { paddingBottom: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  profileName: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, flexShrink: 1 },
  verifiedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, borderWidth: 1,
  },
  verifiedChipText: { fontSize: 10.5, fontWeight: '700' },
  username: { fontSize: 13.5, fontWeight: '500', marginBottom: 8 },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  infoPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, borderWidth: 1,
  },
  infoPillText: { fontSize: 11.5, fontWeight: '600', maxWidth: 120 },
  bioBlock: { marginBottom: 4 },
  bioText: { fontSize: 13.5, lineHeight: 20, fontWeight: '400' },
  bioToggle: { fontSize: 12, fontWeight: '700', marginTop: 3 },
  pendingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 12, padding: 11, marginTop: 10,
  },
  pendingIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pendingTitle: { fontSize: 13, fontWeight: '700' },
  pendingSub: { fontSize: 11.5, marginTop: 1 },

  // Stats Bar
  statsBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginHorizontal: -16,
    paddingVertical: 14,
  },
  statCell: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 2,
  },
  statValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  statLabel: { fontSize: 10.5, fontWeight: '600' },

  // Tab Bar
  tabBarWrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
      android: { elevation: 1 },
    }),
  },
  tabBarScroll: { paddingHorizontal: 8, gap: 2 },
  tabItem: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 2.5, borderBottomColor: 'transparent',
  },
  tabIconPill: {
    width: 24, height: 24, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  tabLabel: { fontSize: 13 },

  // Content
  contentArea: { padding: 14, gap: 12 },

  // Section Card
  sectionCard: {
    borderRadius: 20, borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  sectionCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  sectionCardIconWrap: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionCardTitle: { flex: 1, fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  sectionCardAction: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  sectionCardActionText: { fontSize: 12, fontWeight: '700' },

  // Info Row
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 11,
  },
  infoRowIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  infoRowLabel: { fontSize: 11, fontWeight: '500', marginBottom: 1 },
  infoRowValue: { fontSize: 13.5, fontWeight: '600' },

  // Pill sections inside cards
  pillSection: { paddingHorizontal: 16, paddingVertical: 12 },
  pillSectionLabel: { fontSize: 11, fontWeight: '600', marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.4 },
  pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  tagText: { fontSize: 12, fontWeight: '600' },

  // Completion nudge
  completionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 13, borderRadius: 14, borderWidth: 1,
  },
  completionIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  completionTitle: { fontSize: 13.5, fontWeight: '700' },
  completionSub: { fontSize: 12, marginTop: 1 },
  completionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  completionBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

  // Engagement grid
  engagementGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  engagementCard: {
    width: '47%', flexGrow: 1,
    alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8,
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, gap: 6,
  },
  engagementIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  engagementValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  engagementLabel: { fontSize: 11.5, fontWeight: '500' },

  // Communities
  communityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  communityAvatar: { width: 44, height: 44, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  communityName: { fontSize: 14, fontWeight: '700', flexShrink: 1 },
  communityMeta: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  rolePill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  rolePillText: { fontSize: 10.5, fontWeight: '700' },

  // Events
  eventRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  eventDateBox: { width: 46, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  eventMonth: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  eventDay: { fontSize: 16, fontWeight: '800', marginTop: -1 },
  eventTitle: { fontSize: 14.5, fontWeight: '700' },
  eventMeta: { fontSize: 12, fontWeight: '500', marginTop: 3 },
  eventStatusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  eventStatusText: { fontSize: 10.5, fontWeight: '700' },
  joinedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth,
  },
  joinedText: { fontSize: 11.5, fontWeight: '600' },
  viewLink: { fontSize: 12.5, fontWeight: '700' },

  // Family
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  memberName: { fontSize: 14, fontWeight: '700' },
  memberMeta: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  inviteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, marginTop: 12,
  },
  inviteBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  // Activity
  activityRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  activityIconRing: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  activityText: { fontSize: 13.5, lineHeight: 18, fontWeight: '500' },
  activityTime: { fontSize: 11.5, marginTop: 2 },

  // Empty states
  emptyState: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 24 },
  emptyIconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  emptyTitle: { fontSize: 15.5, fontWeight: '700', marginBottom: 4 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
