import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CommentSheet from '../../../components/feed/CommentSheet';
import ForwardSheet from '../../../components/feed/ForwardSheet';
import PostCard from '../../../components/feed/PostCard';
import Avatar from '../../../components/common/Avatar';
import Button from '../../../components/common/Button';
import { BottomSheet } from '../../../components/common/BottomSheet';
import Skeleton from '../../../components/feedback/Skeleton';
import { useTheme } from '../../../theme';
import { useToastStore } from '../../../store/toastStore';
import { useAuthStore } from '../../../store/authStore';
import { resolveUserApproval } from '../../../store/userApprovalStore';
import { confirmAction } from '../../../store/confirmStore';
import { useUserQuery, useUserPostsQuery } from '../../../api/feed';
import { useUserJoinedEventsQuery } from '../../../api/event';
import { useConnectionStatusQuery, useSendConnectionRequestMutation, useConnectionCountQuery } from '../../../api/connections';
import { useCommunitiesQuery } from '../../../api/community';
import { shareUrl } from '../../../utils/shareUtils';

type ProfileTab = 'about' | 'posts' | 'communities' | 'events';

const COVER_HEIGHT = 260;

const TABS: { id: ProfileTab; label: string; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'about',       label: 'About',      icon: 'person-outline',   activeIcon: 'person' },
  { id: 'posts',       label: 'Posts',       icon: 'grid-outline',     activeIcon: 'grid' },
  { id: 'communities', label: 'Communities', icon: 'globe-outline',    activeIcon: 'globe' },
  { id: 'events',      label: 'Events',      icon: 'calendar-outline', activeIcon: 'calendar' },
];

function InfoRow({ icon, label, value, color, isLast }: { icon: string; label: string; value?: string | null; color: string; isLast?: boolean }) {
  const { colors } = useTheme();
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

export default function UserProfileScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: SW } = useWindowDimensions();

  const [activeTab, setActiveTab] = useState<ProfileTab>('about');
  const [bioExpanded, setBioExpanded] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [commentSheetVisible, setCommentSheetVisible] = useState(false);
  const [selectedForwardPostId, setSelectedForwardPostId] = useState<string | null>(null);
  const [forwardSheetVisible, setForwardSheetVisible] = useState(false);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const showToast = useToastStore((s) => s.showToast);

  const { data: user, isLoading: userLoading } = useUserQuery(id);
  const { data: userPosts = [], isLoading: postsLoading } = useUserPostsQuery(id);
  const { data: joinedEvents = [], isLoading: eventsLoading } = useUserJoinedEventsQuery(id);
  const { data: allCommunities = [] } = useCommunitiesQuery();
  const currentUser = useAuthStore((s) => s.user);
  const { isApproved } = resolveUserApproval(currentUser);
  const isOwnProfile = currentUser?.id === user?.id;
  const { data: connStatus = 'NONE' } = useConnectionStatusQuery(id, currentUser?.id);
  const { data: connCount = 0 } = useConnectionCountQuery(id);
  const sendRequest = useSendConnectionRequestMutation();

  React.useEffect(() => {
    if (!isApproved) {
      showToast('Profiles are locked until your account is approved.', 'warning');
      router.replace('/(auth)/approval-status');
    }
  }, [isApproved]);

  const handleBack = () => {
    if (from === 'discover') router.replace('/(tabs)/explore?tab=members' as any);
    else if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/explore?tab=members' as any);
  };

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
    const ok = await shareUrl(`Check out ${user.displayName}'s profile! ${link}`, link);
    showToast(ok ? 'Link copied!' : 'Could not share', ok ? 'success' : 'error');
  }, [user, showToast]);

  if (!isApproved) return null;

  const G = colors.primary;
  const BG = colors.background;
  const SURF = colors.surface;
  const BORDER = colors.border;
  const TEXT = colors.text;
  const TEXT2 = colors.textSecondary;
  const TEXT3 = colors.textMuted;
  const TERT = colors.tertiary;

  const coverHeight = SW >= 768 ? 280 : COVER_HEIGHT;
  const navBgOpacity = scrollY.interpolate({ inputRange: [coverHeight - 80, coverHeight], outputRange: [0, 1], extrapolate: 'clamp' });
  const navTitleOpacity = scrollY.interpolate({ inputRange: [coverHeight, coverHeight + 40], outputRange: [0, 1], extrapolate: 'clamp' });

  if (userLoading) {
    return (
      <View style={[s.root, { backgroundColor: BG, paddingTop: insets.top + 56 }]}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <Skeleton width="100%" height={coverHeight} borderRadius={0} />
          <View style={{ marginLeft: 16, marginTop: -50 }}>
            <Skeleton width={104} height={104} borderRadius={52} />
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
      <View style={[s.root, s.center, { backgroundColor: BG }]}>
        <Ionicons name="person-circle-outline" size={72} color={TEXT3} />
        <Text style={[s.notFoundTitle, { color: TEXT }]}>Member Not Found</Text>
        <Text style={[s.notFoundSub, { color: TEXT3 }]}>This profile may have been removed.</Text>
        <Button title="Go Back" variant="primary" size="md" onPress={handleBack} />
      </View>
    );
  }

  const memberYear = (user.joinedAt || user.createdAt)
    ? new Date(user.joinedAt || user.createdAt!).getFullYear().toString()
    : '2026';
  const primaryProfession = (user as any).profession || user.occupation;
  const primaryNativePlace = (user as any).nativePlace || (user as any).village;
  const skillTags = (user as any).skills ? (user as any).skills.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
  const userCommunities = allCommunities.filter((c: any) =>
    c.creatorId === user.id || c.ownerId === user.id
  );

  return (
    <View style={[s.root, { backgroundColor: BG }]}>
      {/* Floating Nav */}
      <Animated.View style={[s.navbar, { paddingTop: insets.top, height: insets.top + 52 }]}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: SURF, opacity: navBgOpacity, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER }]} />
        <TouchableOpacity
          onPress={handleBack}
          style={[s.navBtn, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.92)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)' }]}
        >
          <Ionicons name="arrow-back" size={20} color={TEXT} />
        </TouchableOpacity>
        <Animated.Text style={[s.navTitle, { color: TEXT, opacity: navTitleOpacity }]} numberOfLines={1}>
          {user.displayName}
        </Animated.Text>
        <View style={s.navRight}>
          <TouchableOpacity
            style={[s.navBtn, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.92)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)' }]}
            onPress={handleShare}
          >
            <Ionicons name="share-social-outline" size={19} color={TEXT} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.navBtn, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.92)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)' }]}
            onPress={() => setOptionsVisible(true)}
          >
            <Ionicons name="ellipsis-vertical" size={19} color={TEXT} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(96, insets.bottom + 80) }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        {/* Cover */}
        <View style={{ height: coverHeight, position: 'relative' }}>
          {(user as any).coverImage || (user as any).bannerUrl ? (
            <Image source={{ uri: (user as any).coverImage || (user as any).bannerUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
          ) : (
            <LinearGradient
              colors={isDark
                ? [colors.primaryDark, colors.primary, colors.forestGreen]
                : [colors.primaryDark, colors.primary, colors.primaryLight]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.68)']} style={StyleSheet.absoluteFill} />
        </View>

        {/* Masthead */}
        <View style={[s.masthead, { backgroundColor: SURF, borderBottomColor: BORDER }]}>
          <View style={s.mastheadAvatarRow}>
            <View style={[s.avatarRing, { borderColor: G, backgroundColor: SURF }]}>
              <Avatar url={user.avatarUrl} name={user.displayName} size={96} />
              {user.isVerified && (
                <LinearGradient colors={[G, G + 'CC']} style={s.verifiedBadge}>
                  <Ionicons name="checkmark-sharp" size={10} color="#FFF" />
                </LinearGradient>
              )}
            </View>
            <View style={s.mastheadActions}>
              {!isOwnProfile && (
                <TouchableOpacity
                  style={[s.connectBtn, { overflow: 'hidden' }]}
                  onPress={handleConnect}
                  disabled={connStatus !== 'NONE' || sendRequest.isPending}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={connStatus === 'ACCEPTED' ? [colors.surfaceVariant, colors.surfaceVariant] : [G, G + 'CC']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <Ionicons
                    name={connStatus === 'ACCEPTED' ? 'checkmark-circle' : connStatus === 'PENDING_SENT' ? 'time-outline' : 'person-add'}
                    size={15}
                    color={connStatus === 'ACCEPTED' ? TEXT2 : '#FFF'}
                  />
                  <Text style={[s.connectBtnText, { color: connStatus === 'ACCEPTED' ? TEXT2 : '#FFF' }]}>
                    {connStatus === 'ACCEPTED' ? 'Connected' : connStatus === 'PENDING_SENT' ? 'Pending' : 'Connect'}
                  </Text>
                </TouchableOpacity>
              )}
              {connStatus === 'ACCEPTED' && (
                <TouchableOpacity
                  style={[s.iconBtn, { backgroundColor: SURF, borderColor: BORDER }]}
                  onPress={() => router.push(`/chat/new?participantId=${user.id}` as any)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={17} color={TEXT2} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[s.iconBtn, { backgroundColor: SURF, borderColor: BORDER }]} onPress={handleShare} activeOpacity={0.8}>
                <Ionicons name="share-social-outline" size={17} color={TEXT2} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Identity */}
          <View style={s.identityBlock}>
            <View style={s.nameRow}>
              <Text style={[s.profileName, { color: TEXT }]} numberOfLines={1}>{user.displayName}</Text>
              {user.isVerified && (
                <View style={[s.verifiedChip, { backgroundColor: G + '15', borderColor: G + '30' }]}>
                  <Ionicons name="shield-checkmark" size={11} color={G} />
                  <Text style={[s.verifiedChipText, { color: G }]}>Verified</Text>
                </View>
              )}
            </View>
            {user.username && <Text style={[s.username, { color: TEXT3 }]}>@{user.username}</Text>}
            <View style={s.pillsRow}>
              {primaryProfession && (
                <View style={[s.infoPill, { backgroundColor: G + '12', borderColor: G + '22' }]}>
                  <Ionicons name="briefcase" size={11} color={G} />
                  <Text style={[s.infoPillText, { color: G }]} numberOfLines={1}>{primaryProfession}</Text>
                </View>
              )}
              {((user as any).city || (user as any).district) && (
                <View style={[s.infoPill, { backgroundColor: BORDER, borderColor: BORDER }]}>
                  <Ionicons name="location-sharp" size={11} color={TEXT3} />
                  <Text style={[s.infoPillText, { color: TEXT2 }]} numberOfLines={1}>{(user as any).city || (user as any).district}</Text>
                </View>
              )}
              {(user as any).familyName && (
                <View style={[s.infoPill, { backgroundColor: colors.primaryDark + '20', borderColor: colors.primaryDark + '40' }]}>
                  <Ionicons name="people" size={11} color={colors.primaryDark} />
                  <Text style={[s.infoPillText, { color: colors.primaryDark }]} numberOfLines={1}>{(user as any).familyName}</Text>
                </View>
              )}
            </View>
            {user.bio && (
              <View style={s.bioBlock}>
                <Text style={[s.bioText, { color: TEXT2 }]} numberOfLines={bioExpanded ? undefined : 2}>{user.bio}</Text>
                {user.bio.length > 90 && (
                  <TouchableOpacity onPress={() => setBioExpanded(!bioExpanded)}>
                    <Text style={[s.bioToggle, { color: G }]}>{bioExpanded ? 'See less' : 'See more'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Stats Bar */}
          <View style={[s.statsBar, { borderTopColor: BORDER, borderBottomColor: BORDER }]}>
            {[
              { label: 'Connections', value: connCount.toString(),                       icon: 'people',     color: G },
              { label: 'Following',   value: (user.followingCount || 0).toString(),      icon: 'person-add', color: colors.primaryLight },
              { label: 'Communities', value: (user.communitiesCount || 0).toString(),    icon: 'globe',      color: colors.primaryDark },
              { label: 'Since',       value: memberYear,                                 icon: 'ribbon',     color: colors.forestGreen },
            ].map((stat, i, arr) => (
              <View
                key={stat.label}
                style={[s.statCell, i < arr.length - 1 && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: BORDER }]}
              >
                <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
                <View style={s.statLabelRow}>
                  <Ionicons name={stat.icon as any} size={10} color={stat.color} />
                  <Text style={[s.statLabel, { color: TEXT3 }]}>{stat.label}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Tab Bar */}
        <View style={[s.tabBarWrap, { backgroundColor: SURF, borderBottomColor: BORDER }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabBarScroll}>
            {TABS.map((tab) => {
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

        {/* Tab Content */}
        <View style={s.contentArea}>

          {/* ABOUT TAB */}
          {activeTab === 'about' && (
            <View style={{ gap: 12 }}>
              <SectionCard title="Personal Details" icon="person-circle-outline" color={G}>
                <InfoRow icon="location" label="Native Place" value={primaryNativePlace} color={G} />
                <InfoRow icon="briefcase" label="Profession" value={primaryProfession} color={colors.primaryDark} />
                <InfoRow icon="business-outline" label="Company" value={(user as any).company} color={colors.forestGreen} />
                <InfoRow icon="school-outline" label="Education" value={(user as any).education} color={colors.primaryLight} />
                <InfoRow icon="person-outline" label="Gender" value={(user as any).gender} color={G} isLast={!((user as any).languages || (user as any).interests || skillTags.length > 0)} />
                {(user as any).languages && (
                  <View style={[s.pillSection, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER }]}>
                    <Text style={[s.pillSectionLabel, { color: TEXT3 }]}>Languages</Text>
                    <View style={s.pillsWrap}>
                      {(user as any).languages.split(',').map((l: string, i: number) => (
                        <View key={i} style={[s.tag, { backgroundColor: colors.surfaceVariant }]}>
                          <Text style={[s.tagText, { color: TEXT2 }]}>{l.trim()}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                {(user as any).interests && (
                  <View style={[s.pillSection, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER }]}>
                    <Text style={[s.pillSectionLabel, { color: TEXT3 }]}>Interests</Text>
                    <View style={s.pillsWrap}>
                      {(user as any).interests.split(',').map((interest: string, i: number) => (
                        <View key={i} style={[s.tag, { backgroundColor: G + '12' }]}>
                          <Text style={[s.tagText, { color: G }]}>{interest.trim()}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                {skillTags.length > 0 && (
                  <View style={[s.pillSection, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER }]}>
                    <Text style={[s.pillSectionLabel, { color: TEXT3 }]}>Skills</Text>
                    <View style={s.pillsWrap}>
                      {skillTags.map((skill: string, i: number) => (
                        <View key={i} style={[s.tag, { backgroundColor: colors.primaryLight + '20' }]}>
                          <Text style={[s.tagText, { color: colors.primaryDark }]}>{skill}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </SectionCard>

              <SectionCard title="Location & Roots" icon="map-outline" color={colors.primaryDark}>
                <InfoRow icon="flag-outline" label="Country" value={(user as any).country} color={TERT} />
                <InfoRow icon="map-outline" label="State" value={(user as any).state} color={G} />
                <InfoRow icon="navigate-outline" label="District" value={(user as any).district} color={colors.primaryDark} />
                <InfoRow icon="business-outline" label="City" value={(user as any).city} color={colors.forestGreen} isLast />
              </SectionCard>

              <SectionCard title="Community Engagement" icon="stats-chart-outline" color={G}>
                <View style={s.engagementGrid}>
                  {[
                    { label: 'Communities', value: user.communitiesCount || 0, icon: 'globe',    color: G },
                    { label: 'Followers',   value: user.followersCount || 0,   icon: 'people',   color: colors.primaryDark },
                    { label: 'Following',   value: user.followingCount || 0,   icon: 'person-add', color: colors.primaryLight },
                    { label: 'Posts',       value: userPosts.length,           icon: 'grid',     color: colors.forestGreen },
                  ].map((item) => (
                    <View key={item.label} style={[s.engagementCard, { backgroundColor: colors.surfaceVariant, borderColor: BORDER }]}>
                      <View style={[s.engagementIconWrap, { backgroundColor: item.color + '15' }]}>
                        <Ionicons name={item.icon as any} size={18} color={item.color} />
                      </View>
                      <Text style={[s.engagementValue, { color: TEXT }]}>{item.value}</Text>
                      <Text style={[s.engagementLabel, { color: TEXT3 }]}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </SectionCard>

              <SectionCard title="Membership" icon="shield-checkmark-outline" color={G}>
                <InfoRow icon="shield-checkmark" label="Verification Status" value={user.isVerified ? '✓ Verified Community Member' : 'Active Community Member'} color={G} />
                <InfoRow icon="at" label="Account Handle" value={`@${user.username || 'user'}`} color={TEXT3} isLast />
              </SectionCard>
            </View>
          )}

          {/* POSTS TAB */}
          {activeTab === 'posts' && (
            <View style={{ gap: 12 }}>
              {postsLoading && [1, 2].map((i) => (
                <View key={i} style={[s.sectionCard, { backgroundColor: SURF, borderColor: BORDER, padding: 16, gap: 10 }]}>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Skeleton width={44} height={44} borderRadius={22} />
                    <View style={{ flex: 1, gap: 8 }}>
                      <Skeleton width="45%" height={14} borderRadius={6} />
                      <Skeleton width="25%" height={10} borderRadius={6} />
                    </View>
                  </View>
                  <Skeleton width="100%" height={180} borderRadius={12} />
                </View>
              ))}
              {!postsLoading && userPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post as any}
                  horizontalGutter={0}
                  onCommentPress={(pid) => { setSelectedPostId(pid); setCommentSheetVisible(true); }}
                  onForwardPress={(pid) => { setSelectedForwardPostId(pid); setForwardSheetVisible(true); }}
                />
              ))}
              {!postsLoading && userPosts.length === 0 && (
                <View style={[s.sectionCard, { backgroundColor: SURF, borderColor: BORDER }]}>
                  <View style={s.emptyState}>
                    <View style={[s.emptyIconCircle, { backgroundColor: G + '12' }]}>
                      <Ionicons name="document-text-outline" size={28} color={G} />
                    </View>
                    <Text style={[s.emptyTitle, { color: TEXT }]}>No Posts Yet</Text>
                    <Text style={[s.emptySubtitle, { color: TEXT3 }]}>{user.displayName} hasn't shared any updates yet.</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* COMMUNITIES TAB */}
          {activeTab === 'communities' && (
            <SectionCard title="Communities" icon="globe" color={G}>
              {userCommunities.length === 0 && (
                <View style={s.emptyState}>
                  <View style={[s.emptyIconCircle, { backgroundColor: G + '12' }]}>
                    <Ionicons name="globe-outline" size={26} color={G} />
                  </View>
                  <Text style={[s.emptyTitle, { color: TEXT }]}>No Communities</Text>
                  <Text style={[s.emptySubtitle, { color: TEXT3 }]}>{user.displayName} hasn't created any communities yet.</Text>
                </View>
              )}
              {userCommunities.map((item: any, i: number) => (
                <TouchableOpacity
                  key={item.id}
                  style={[s.communityRow, i < userCommunities.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER }]}
                  onPress={() => router.push(`/community/${item.id}` as any)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: item.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'C')}&background=e8f5e9&color=16a34a` }}
                    style={[s.communityAvatar, { borderColor: BORDER }]}
                    contentFit="cover"
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.communityName, { color: TEXT }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[s.communityMeta, { color: TEXT3 }]} numberOfLines={1}>
                      {item.category ? `${item.category} · ` : ''}{(item.membersCount ?? 0).toLocaleString()} members
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={15} color={TEXT3} />
                </TouchableOpacity>
              ))}
            </SectionCard>
          )}

          {/* EVENTS TAB */}
          {activeTab === 'events' && (
            <SectionCard title="Events Attended" icon="calendar" color={G}>
              {eventsLoading && (
                <Text style={{ color: TEXT3, textAlign: 'center', paddingVertical: 24, fontSize: 13 }}>Loading...</Text>
              )}
              {!eventsLoading && joinedEvents.length === 0 && (
                <View style={s.emptyState}>
                  <View style={[s.emptyIconCircle, { backgroundColor: G + '12' }]}>
                    <Ionicons name="calendar-clear-outline" size={26} color={G} />
                  </View>
                  <Text style={[s.emptyTitle, { color: TEXT }]}>No Events Yet</Text>
                  <Text style={[s.emptySubtitle, { color: TEXT3 }]}>{user.displayName} hasn't joined any events yet.</Text>
                </View>
              )}
              {!eventsLoading && joinedEvents.map((event: any, i: number) => {
                const isPast = new Date(event.startsAt) < new Date();
                const dateStr = new Date(event.startsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                return (
                  <TouchableOpacity
                    key={event.id}
                    style={[s.eventRow, i < joinedEvents.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER }]}
                    onPress={() => router.push(`/events/${event.id}` as any)}
                    activeOpacity={0.7}
                  >
                    <View style={[s.eventDateBox, { backgroundColor: isPast ? colors.surfaceVariant : G + '15' }]}>
                      <Text style={[s.eventMonth, { color: isPast ? TEXT3 : G }]}>
                        {new Date(event.startsAt).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                      </Text>
                      <Text style={[s.eventDay, { color: isPast ? TEXT3 : G }]}>{new Date(event.startsAt).getDate()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.eventTitle, { color: TEXT }]} numberOfLines={1}>{event.title}</Text>
                      <Text style={[s.eventMeta, { color: TEXT3 }]}>{dateStr}</Text>
                      {event.location && <Text style={[s.eventMeta, { color: TEXT3 }]} numberOfLines={1}>{event.location}</Text>}
                    </View>
                    <Ionicons name="chevron-forward" size={15} color={TEXT3} />
                  </TouchableOpacity>
                );
              })}
            </SectionCard>
          )}
        </View>
      </ScrollView>

      <CommentSheet postId={selectedPostId} visible={commentSheetVisible} onClose={() => setCommentSheetVisible(false)} />
      <ForwardSheet
        postId={selectedForwardPostId}
        visible={forwardSheetVisible}
        onClose={() => setForwardSheetVisible(false)}
        onNativeShare={async () => { try { await Share.share({ message: `Check out ${user.displayName}'s post!` }); } catch (_) {} }}
      />

      <BottomSheet visible={optionsVisible} onClose={() => setOptionsVisible(false)} title="Profile Options">
        <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
          <View style={[s.optionsUserTile, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F4F4F5', borderColor: BORDER }]}>
            <Avatar url={user.avatarUrl} name={user.displayName} size={44} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[{ fontSize: 15, fontWeight: '700', color: TEXT }]} numberOfLines={1}>{user.displayName}</Text>
              <Text style={[{ fontSize: 12, color: TEXT3, marginTop: 2 }]} numberOfLines={1}>@{user.username}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[s.optionsItem, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}
            onPress={() => { setOptionsVisible(false); setTimeout(handleShare, 200); }}
            activeOpacity={0.7}
          >
            <View style={[s.optionsIconWrap, { backgroundColor: G + '15' }]}>
              <Ionicons name="share-social-outline" size={20} color={G} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[{ fontSize: 14.5, fontWeight: '600', color: TEXT }]}>Share Profile</Text>
              <Text style={[{ fontSize: 11.5, color: TEXT3, marginTop: 1 }]}>Share via link or social apps</Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={TEXT3} />
          </TouchableOpacity>
          {!isOwnProfile && (
            <TouchableOpacity
              style={[s.optionsItem, { borderBottomColor: 'transparent' }]}
              onPress={async () => {
                setOptionsVisible(false);
                const confirmed = await confirmAction({
                  title: `Report @${user.username}?`,
                  message: 'Our moderation team will review this profile.',
                  confirmText: 'Report User',
                  cancelText: 'Cancel',
                  isDestructive: true,
                  icon: 'flag-outline',
                });
                if (confirmed) showToast('Report submitted. Thank you.', 'success');
              }}
              activeOpacity={0.7}
            >
              <View style={[s.optionsIconWrap, { backgroundColor: '#EF444415' }]}>
                <Ionicons name="flag-outline" size={20} color="#EF4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[{ fontSize: 14.5, fontWeight: '600', color: '#EF4444' }]}>Report Profile</Text>
                <Text style={[{ fontSize: 11.5, color: TEXT3, marginTop: 1 }]}>Flag inappropriate content</Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={TEXT3} />
            </TouchableOpacity>
          )}
        </View>
      </BottomSheet>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },

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

  masthead: { borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingBottom: 0 },
  mastheadAvatarRow: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    marginTop: -50, marginBottom: 12,
  },
  avatarRing: {
    width: 104, height: 104, borderRadius: 52, borderWidth: 3, position: 'relative',
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
  connectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  connectBtnText: { fontSize: 13, fontWeight: '700' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

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
  bioText: { fontSize: 13.5, lineHeight: 20 },
  bioToggle: { fontSize: 12, fontWeight: '700', marginTop: 3 },

  statsBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth,
    marginHorizontal: -16, paddingVertical: 14,
  },
  statCell: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 2 },
  statValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  statLabel: { fontSize: 10.5, fontWeight: '600' },

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
  tabIconPill: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontSize: 13 },

  contentArea: { padding: 14, gap: 12 },

  sectionCard: {
    borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden',
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
  sectionCardAction: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  sectionCardActionText: { fontSize: 12, fontWeight: '700' },

  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 11,
  },
  infoRowIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  infoRowLabel: { fontSize: 11, fontWeight: '500', marginBottom: 1 },
  infoRowValue: { fontSize: 13.5, fontWeight: '600' },

  pillSection: { paddingHorizontal: 16, paddingVertical: 12 },
  pillSectionLabel: { fontSize: 11, fontWeight: '600', marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.4 },
  pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  tagText: { fontSize: 12, fontWeight: '600' },

  engagementGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  engagementCard: {
    width: '47%', flexGrow: 1, alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 8,
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, gap: 6,
  },
  engagementIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  engagementValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  engagementLabel: { fontSize: 11.5, fontWeight: '500' },

  communityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  communityAvatar: { width: 44, height: 44, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  communityName: { fontSize: 14, fontWeight: '700', flexShrink: 1 },
  communityMeta: { fontSize: 12, fontWeight: '500', marginTop: 2 },

  eventRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  eventDateBox: { width: 46, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  eventMonth: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  eventDay: { fontSize: 16, fontWeight: '800', marginTop: -1 },
  eventTitle: { fontSize: 14.5, fontWeight: '700' },
  eventMeta: { fontSize: 12, fontWeight: '500', marginTop: 3 },

  emptyState: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 24 },
  emptyIconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  emptyTitle: { fontSize: 15.5, fontWeight: '700', marginBottom: 4 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 18 },

  optionsUserTile: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, marginBottom: 8,
  },
  optionsItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionsIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },

  notFoundTitle: { fontSize: 22, fontWeight: '800', marginTop: 16 },
  notFoundSub: { fontSize: 15, marginTop: 6, marginBottom: 24 },
});
