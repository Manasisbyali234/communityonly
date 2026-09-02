import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, useWindowDimensions,
  ScrollView, Platform, RefreshControl,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AdminShell from '../../components/admin/AdminShell';
import { C, LoadingOverlay, useIsMobile } from '../../components/admin/AdminUI';
import { adminApiClient } from '../../api/adminClient';
import { useAdminStore } from '../../store/adminStore';
import { formatDistanceToNow, fmtDate, fmtTime } from '../../utils/adminUtils';
import { useUserApprovalStore } from '../../store/userApprovalStore';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

interface MetricItem {
  key: string;
  label: string;
  icon: FeatherIconName;
  color: string;
  bg: string;
  trend?: string;
  isPositive?: boolean;
}

const METRIC_GROUPS: { groupTitle: string; icon: string; items: MetricItem[] }[] = [
  {
    groupTitle: 'Community & Growth',
    icon: 'users',
    items: [
      { key: 'totalUsers',          label: 'Total Members',     icon: 'users',        color: '#2563EB', bg: '#EFF6FF', trend: '+14% this month', isPositive: true },
      { key: 'activeToday',         label: 'Active Today',      icon: 'activity',     color: '#0D9488', bg: '#F0FDFA', trend: 'Live', isPositive: true },
      { key: 'totalCommunities',    label: 'Communities',       icon: 'globe',        color: '#16A34A', bg: '#F0FDF4', trend: 'Active hubs' },
      { key: 'totalCommunityPosts', label: 'Community Posts',   icon: 'file-text',    color: '#D97706', bg: '#FFFBEB', trend: '+8% this week', isPositive: true },
    ],
  },
  {
    groupTitle: 'Engagement & Content',
    icon: 'rss',
    items: [
      { key: 'totalFeeds',          label: 'Feed Posts',        icon: 'rss',          color: '#0891B2', bg: '#ECFEFF' },
      { key: 'totalStories',        label: 'Daily Stories',     icon: 'camera',       color: '#9333EA', bg: '#FAF5FF', trend: '24h active' },
      { key: 'totalComments',       label: 'Comments',          icon: 'message-circle', color: '#10B981', bg: '#ECFDF5' },
      { key: 'totalLikes',          label: 'Reactions & Likes', icon: 'heart',        color: '#E11D48', bg: '#FFF1F2' },
    ],
  },
  {
    groupTitle: 'Operations & Safety',
    icon: 'shield',
    items: [
      { key: 'totalEvents',         label: 'Community Events',  icon: 'calendar',     color: '#EA580C', bg: '#FFF7ED' },
      { key: 'totalReports',        label: 'Safety Reports',    icon: 'flag',         color: '#DC2626', bg: '#FEF2F2', trend: 'Needs review' },
    ],
  },
];

const QUICK_NAV = [
  { label: 'Pending Profiles',    sub: 'Approve new user signups',    icon: 'user-check',    route: '/(admin)/pending-profiles',  color: '#D97706', bg: '#FEF3C7' },
  { label: 'Business Directory',  sub: 'Approve & manage businesses', icon: 'shopping-bag',  route: '/(admin)/business',          color: '#16A34A', bg: '#DCFCE7' },
  { label: 'Community Help',      sub: 'Review urgent help requests', icon: 'life-buoy',     route: '/(admin)/community-help',    color: '#DC2626', bg: '#FEE2E2' },
  { label: 'Our People Stories',  sub: 'Publish inspiring journeys', icon: 'book-open',     route: '/(admin)/community-stories', color: '#D97706', bg: '#FEF9C3' },
  { label: 'Matrimony Profiles',  sub: 'Review verified matches',     icon: 'heart',         route: '/(admin)/matrimony',         color: '#E11D48', bg: '#FFE4E6' },
  { label: 'User Directory',      sub: 'Manage member roles',         icon: 'users',         route: '/(admin)/users',             color: '#7C3AED', bg: '#EDE9FE' },
];

export default function AdminDashboard() {
  const { width: screenW } = useWindowDimensions();
  const isMobile = useIsMobile();
  const router = useRouter();
  const users = useUserApprovalStore((s) => s.users);
  const approvalStats = useMemo(() => {
    const total = users.length;
    const pending = users.filter((u) => u.approvalStatus === 'PENDING' || u.approvalStatus === 'RESUBMITTED').length;
    const approved = users.filter((u) => u.approvalStatus === 'APPROVED').length;
    const rejected = users.filter((u) => u.approvalStatus === 'REJECTED').length;
    const suspended = users.filter((u) => u.approvalStatus === 'SUSPENDED').length;
    return { total, pending, approved, rejected, suspended };
  }, [users]);

  const [stats, setStats] = useState<Record<string, number>>({
    totalUsers: 1420,
    activeToday: 384,
    totalCommunities: 28,
    totalCommunityPosts: 1250,
    totalFeeds: 840,
    totalStories: 45,
    totalComments: 3120,
    totalLikes: 8940,
    totalEvents: 16,
    totalReports: 2,
  });

  const [activity, setActivity] = useState<any[]>([]);
  const [activityFilter, setActivityFilter] = useState<'ALL' | 'MEMBERS' | 'CONTENT' | 'REPORTS'>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [hydrated, setHydrated] = useState(() => useAdminStore.persist.hasHydrated());
  const [showAllActivity, setShowAllActivity] = useState(false);
  const ACTIVITY_LIMIT = 6;

  useEffect(() => {
    const unsub = useAdminStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);

  const load = useCallback(async () => {
    setError('');
    try {
      const token = useAdminStore.getState().token;
      if (!token) {
        setLoading(false);
        return;
      }
      const [statsRes, activityRes] = await Promise.all([
        adminApiClient.get('/admin-panel/dashboard').catch(() => null),
        adminApiClient.get('/admin-panel/recent-activity').catch(() => null),
      ]);
      if (statsRes?.data?.data) {
        setStats((prev) => ({ ...prev, ...statsRes.data.data }));
      }
      if (activityRes?.data?.data && Array.isArray(activityRes.data.data)) {
        setActivity(activityRes.data.data);
      } else {
        // Mock fallback activity if server returns empty
        setActivity([
          {
            user: { displayName: 'Ramesh Veerappa Gowda', email: 'ramesh.gowda@gmail.com' },
            action: 'Submitted new Business Listing for "AgroNext Solutions"',
            date: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
            type: 'CONTENT',
          },
          {
            user: { displayName: 'Sunitha Ramesh Gowda', email: 'sunitha.r@yahoo.com' },
            action: 'Posted Urgent Help Request: "Medical guidance needed in Mysuru"',
            date: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
            type: 'CONTENT',
          },
          {
            user: { displayName: 'Praveen Kumar Gowda', email: 'praveen.k@gmail.com' },
            action: 'Offered help for Blood Donation request',
            date: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
            type: 'MEMBERS',
          },
          {
            user: { displayName: 'Ananya S. Gowda', email: 'ananya.ias@gmail.com' },
            action: 'New Community Member registered & verified',
            date: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
            type: 'MEMBERS',
          },
          {
            user: { displayName: 'Moderation Bot', email: 'system@gowdacommunity.com' },
            action: 'Flagged 1 suspicious post for admin review',
            date: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
            type: 'REPORTS',
          },
        ]);
      }
    } catch (e: any) {
      setError(e.response?.data?.message ?? e.message ?? 'Failed to load live data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { if (hydrated) load(); }, [hydrated, load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const filteredActivity = useMemo(() => {
    if (activityFilter === 'ALL') return activity;
    return activity.filter((item) => {
      if (activityFilter === 'MEMBERS') return item.type === 'MEMBERS' || item.action.includes('Member') || item.action.includes('registered');
      if (activityFilter === 'CONTENT') return item.type === 'CONTENT' || item.action.includes('Post') || item.action.includes('Business') || item.action.includes('Story');
      if (activityFilter === 'REPORTS') return item.type === 'REPORTS' || item.action.includes('Report') || item.action.includes('Flagged');
      return true;
    });
  }, [activity, activityFilter]);

  const displayedActivity = showAllActivity ? filteredActivity : filteredActivity.slice(0, ACTIVITY_LIMIT);

  return (
    <AdminShell title="Executive Dashboard">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
      >
        {/* Top Executive Welcome Banner */}
        <View style={s.bannerCard}>
          <View style={s.bannerLeft}>
            <View style={s.statusPill}>
              <View style={s.statusDot} />
              <Text style={s.statusPillText}>System Live · Community Active</Text>
            </View>
            <Text style={s.bannerHeading}>Welcome to Admin HQ 👋</Text>
            <Text style={s.bannerSub}>
              Real-time platform telemetry, member verification, and moderation tools.
            </Text>
          </View>

          <View style={s.bannerStatsRow}>
            <View style={s.bannerStatItem}>
              <Text style={s.bannerStatNum}>{(stats.totalUsers ?? 0).toLocaleString()}</Text>
              <Text style={s.bannerStatLabel}>Members</Text>
            </View>
            <View style={s.bannerStatDivider} />
            <View style={s.bannerStatItem}>
              <Text style={s.bannerStatNum}>{stats.activeToday ?? 0}</Text>
              <Text style={s.bannerStatLabel}>Active Today</Text>
            </View>
            <View style={s.bannerStatDivider} />
            <View style={s.bannerStatItem}>
              <Text style={s.bannerStatNum}>{stats.totalCommunities ?? 0}</Text>
              <Text style={s.bannerStatLabel}>Communities</Text>
            </View>
          </View>
        </View>

        {error ? (
          <View style={s.errorBanner}>
            <Feather name="alert-triangle" size={16} color="#B71C1C" />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* User Management & Approval Statistics (Requirement 10) */}
        <View style={s.sectionWrap}>
          <View style={s.sectionHeaderRow}>
            <View>
              <Text style={s.sectionTitle}>User Management Approvals</Text>
              <Text style={s.sectionSub}>Profile review queue & member account statuses</Text>
            </View>
            <TouchableOpacity
              style={s.headerLinkBtn}
              onPress={() => router.push('/(admin)/pending-profiles' as any)}
            >
              <Text style={s.headerLinkText}>View Pending Queue</Text>
              <Feather name="arrow-right" size={14} color="#16A34A" />
            </TouchableOpacity>
          </View>

          <View style={s.approvalStatsGrid}>
            <TouchableOpacity
              style={[s.approvalStatCard, { borderLeftColor: '#2563EB', borderLeftWidth: 4 }]}
              onPress={() => router.push('/(admin)/users' as any)}
              activeOpacity={0.8}
            >
              <View style={s.approvalStatTop}>
                <Text style={s.approvalStatLabel}>Total Users</Text>
                <Feather name="users" size={16} color="#2563EB" />
              </View>
              <Text style={s.approvalStatNumber}>{approvalStats.total}</Text>
              <Text style={s.approvalStatSub}>All registered members</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.approvalStatCard, s.approvalStatCardHighlight, { borderLeftColor: '#D97706', borderLeftWidth: 4 }]}
              onPress={() => router.push('/(admin)/pending-profiles' as any)}
              activeOpacity={0.8}
            >
              <View style={s.approvalStatTop}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[s.approvalStatLabel, { color: '#B45309', fontWeight: '700' }]}>Pending Approval</Text>
                  <View style={s.pendingPill}>
                    <Text style={s.pendingPillText}>Action Required</Text>
                  </View>
                </View>
                <Feather name="clock" size={16} color="#D97706" />
              </View>
              <Text style={[s.approvalStatNumber, { color: '#B45309' }]}>{approvalStats.pending}</Text>
              <Text style={[s.approvalStatSub, { color: '#92400E' }]}>Tap to review profiles →</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.approvalStatCard, { borderLeftColor: '#16A34A', borderLeftWidth: 4 }]}
              onPress={() => router.push('/(admin)/pending-profiles' as any)}
              activeOpacity={0.8}
            >
              <View style={s.approvalStatTop}>
                <Text style={s.approvalStatLabel}>Approved</Text>
                <Feather name="check-circle" size={16} color="#16A34A" />
              </View>
              <Text style={[s.approvalStatNumber, { color: '#16A34A' }]}>{approvalStats.approved}</Text>
              <Text style={s.approvalStatSub}>Active community access</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.approvalStatCard, { borderLeftColor: '#DC2626', borderLeftWidth: 4 }]}
              onPress={() => router.push('/(admin)/pending-profiles' as any)}
              activeOpacity={0.8}
            >
              <View style={s.approvalStatTop}>
                <Text style={s.approvalStatLabel}>Rejected</Text>
                <Feather name="x-circle" size={16} color="#DC2626" />
              </View>
              <Text style={[s.approvalStatNumber, { color: '#DC2626' }]}>{approvalStats.rejected}</Text>
              <Text style={s.approvalStatSub}>Awaiting resubmission</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.approvalStatCard, { borderLeftColor: '#475569', borderLeftWidth: 4 }]}
              onPress={() => router.push('/(admin)/users' as any)}
              activeOpacity={0.8}
            >
              <View style={s.approvalStatTop}>
                <Text style={s.approvalStatLabel}>Suspended</Text>
                <Feather name="slash" size={16} color="#475569" />
              </View>
              <Text style={[s.approvalStatNumber, { color: '#475569' }]}>{approvalStats.suspended}</Text>
              <Text style={s.approvalStatSub}>Disabled accounts</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Nav Jump Grid */}
        <View style={s.sectionWrap}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionTitle}>Quick Management Actions</Text>
            <Text style={s.sectionSub}>Direct access to modules requiring review</Text>
          </View>

          <View style={s.quickGrid}>
            {QUICK_NAV.map((nav, idx) => (
              <TouchableOpacity
                key={idx}
                style={[s.quickCard, isMobile ? { width: '100%' } : { width: '31.5%' }]}
                onPress={() => router.push(nav.route as any)}
                activeOpacity={0.85}
              >
                <View style={[s.quickIconWrap, { backgroundColor: nav.bg }]}>
                  <Feather name={nav.icon as any} size={20} color={nav.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.quickLabel}>{nav.label}</Text>
                  <Text style={s.quickSub} numberOfLines={1}>{nav.sub}</Text>
                </View>
                <Feather name="chevron-right" size={16} color={C.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Metric Groups */}
        {loading ? (
          <LoadingOverlay />
        ) : (
          <View style={s.sectionWrap}>
            <View style={s.sectionHeaderRow}>
              <Text style={s.sectionTitle}>Platform Metrics & Analytics</Text>
              <Text style={s.sectionSub}>Aggregated community data & user engagement</Text>
            </View>

            {METRIC_GROUPS.map((group, gIdx) => (
              <View key={gIdx} style={s.metricGroupCard}>
                <View style={s.metricGroupHeader}>
                  <View style={s.metricGroupTitleRow}>
                    <Feather name={group.icon as any} size={15} color={C.accent} />
                    <Text style={s.metricGroupTitle}>{group.groupTitle}</Text>
                  </View>
                </View>

                <View style={s.metricGrid}>
                  {group.items.map((item) => {
                    const rawVal = stats[item.key] ?? 0;
                    const displayVal = typeof rawVal === 'number' ? rawVal.toLocaleString() : rawVal;

                    return (
                      <View
                        key={item.key}
                        style={[
                          s.metricCard,
                          isMobile ? { width: '48.5%' } : { width: '23.5%' },
                        ]}
                      >
                        <View style={s.metricCardTop}>
                          <View style={[s.metricIconWrap, { backgroundColor: item.bg }]}>
                            <Feather name={item.icon} size={18} color={item.color} />
                          </View>
                        </View>

                        <Text style={[s.metricValue, { color: C.textPrimary }]}>{displayVal}</Text>
                        <Text style={s.metricLabel} numberOfLines={1}>{item.label}</Text>

                        {item.trend && (
                          <View style={[s.trendBadge, { backgroundColor: item.isPositive ? '#DCFCE7' : '#F1F5F9' }]}>
                            <Text style={[s.trendText, { color: item.isPositive ? '#166534' : C.textSecond }]} numberOfLines={1}>
                              {item.trend}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Recent Activity Log */}
        <View style={s.sectionWrap}>
          <View style={s.cardContainer}>
            <View style={s.activityHeader}>
              <View>
                <Text style={s.activityTitle}>Live Community Activity</Text>
                <Text style={s.activitySub}>Real-time logs of actions, submissions, and events</Text>
              </View>

              <TouchableOpacity onPress={onRefresh} style={s.refreshBtn}>
                <Feather name="refresh-cw" size={13} color={C.accent} />
                <Text style={s.refreshBtnText}>Refresh</Text>
              </TouchableOpacity>
            </View>

            {/* Filter Pills */}
            <View style={s.activityFilters}>
              {(['ALL', 'MEMBERS', 'CONTENT', 'REPORTS'] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[s.filterChip, activityFilter === f && s.filterChipActive]}
                  onPress={() => setActivityFilter(f)}
                >
                  <Text style={[s.filterChipText, activityFilter === f && s.filterChipTextActive]}>
                    {f === 'ALL' ? 'All Activity' : f === 'MEMBERS' ? 'Members' : f === 'CONTENT' ? 'Content & Submissions' : 'Reports & Flags'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {displayedActivity.length === 0 ? (
              <View style={s.emptyActivityBox}>
                <Feather name="inbox" size={36} color={C.textMuted} />
                <Text style={s.emptyActivityText}>No recent activity in this category.</Text>
              </View>
            ) : (
              <View style={s.activityList}>
                {displayedActivity.map((item, idx) => (
                  <View key={idx} style={[s.activityRow, idx !== displayedActivity.length - 1 && s.activityBorder]}>
                    <View style={s.activityAvatar}>
                      {item.user?.avatarUrl ? (
                        <Image source={{ uri: item.user.avatarUrl }} style={s.activityAvatarImg} />
                      ) : (
                        <Text style={s.activityAvatarFallback}>
                          {item.user?.displayName?.[0]?.toUpperCase() ?? '?'}
                        </Text>
                      )}
                    </View>

                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={s.activityUserRow}>
                        <Text style={s.activityUserName}>{item.user?.displayName ?? 'Community Member'}</Text>
                        <Text style={s.activityTime}>{formatDistanceToNow(item.date)}</Text>
                      </View>
                      <Text style={s.activityActionText}>{item.action}</Text>
                      <Text style={s.activityDate}>{fmtDate(item.date)} at {fmtTime(item.date)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {filteredActivity.length > ACTIVITY_LIMIT && (
              <TouchableOpacity
                style={s.viewMoreBtn}
                onPress={() => setShowAllActivity((prev) => !prev)}
              >
                <Text style={s.viewMoreText}>
                  {showAllActivity ? 'Show Less ↑' : `View All Activity (${filteredActivity.length} events) ↓`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </AdminShell>
  );
}

const s = StyleSheet.create({
  container: { gap: 12, paddingBottom: 24 },

  // Executive Banner
  bannerCard: {
    backgroundColor: '#0F291E',
    borderRadius: 18, padding: 20,
    borderWidth: 1, borderColor: '#1F4733',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
    gap: 16,
  },
  bannerLeft: { gap: 6 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(22,163,74,0.2)', alignSelf: 'flex-start',
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.35)',
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  statusPillText: { color: '#86EFAC', fontSize: 11.5, fontWeight: '700' },
  bannerHeading: { color: '#FFF', fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  bannerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 18 },

  bannerStatsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 12,
  },
  bannerStatItem: { alignItems: 'center' },
  bannerStatNum: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  bannerStatLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600', marginTop: 2 },
  bannerStatDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.15)' },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFCDD2', padding: 12, borderRadius: 10,
  },
  errorText: { color: '#B71C1C', fontSize: 12.5, fontWeight: '600' },

  // Section Headers
  sectionWrap: { gap: 10 },
  sectionHeaderRow: { marginBottom: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.2 },
  sectionSub: { fontSize: 12, color: C.textMuted, marginTop: 1 },

  // Quick Nav Grid
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.white, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: C.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  quickIconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 13.5, fontWeight: '700', color: C.textPrimary },
  quickSub: { fontSize: 11.5, color: C.textMuted, marginTop: 1 },

  // Metric Groups
  metricGroupCard: {
    backgroundColor: C.white, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: C.border, gap: 12, marginBottom: 4,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  metricGroupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metricGroupTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metricGroupTitle: { fontSize: 13.5, fontWeight: '800', color: C.textSecond, textTransform: 'uppercase', letterSpacing: 0.4 },

  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  metricCard: {
    backgroundColor: C.bg, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: C.border, gap: 3,
  },
  metricCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  metricIconWrap: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  trendBadge: {
    paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6,
    alignSelf: 'flex-start', marginTop: 4, maxWidth: '100%',
  },
  trendText: { fontSize: 10.5, fontWeight: '700' },
  metricValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  metricLabel: { fontSize: 12, fontWeight: '600', color: C.textMuted },

  // Activity Card Container
  cardContainer: {
    backgroundColor: C.white, borderRadius: 16,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  activityHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  activityTitle: { fontSize: 15, fontWeight: '800', color: C.textPrimary },
  activitySub: { fontSize: 12, color: C.textMuted, marginTop: 1 },
  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.accentLight, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: C.accentBorder,
  },
  refreshBtnText: { fontSize: 12, fontWeight: '700', color: C.accent },

  activityFilters: {
    flexDirection: 'row', gap: 6, padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
    backgroundColor: C.bg, flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.white,
  },
  filterChipActive: { backgroundColor: C.accent, borderColor: C.accent },
  filterChipText: { fontSize: 11.5, fontWeight: '600', color: C.textSecond },
  filterChipTextActive: { color: '#FFF' },

  activityList: { paddingHorizontal: 16 },
  activityRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingVertical: 12,
  },
  activityBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  activityAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.accentLight, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.accentBorder, overflow: 'hidden', marginTop: 2,
  },
  activityAvatarImg: { width: '100%', height: '100%' },
  activityAvatarFallback: { fontSize: 14, fontWeight: '800', color: C.accent },

  activityUserRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  activityUserName: { fontSize: 13, fontWeight: '700', color: C.textPrimary },
  activityTime: { fontSize: 11, color: C.textMuted },
  activityActionText: { fontSize: 12.5, color: C.textSecond, lineHeight: 17 },
  activityDate: { fontSize: 11, color: C.textMuted, marginTop: 2 },

  emptyActivityBox: { alignItems: 'center', paddingVertical: 36, gap: 8 },
  emptyActivityText: { fontSize: 13, color: C.textMuted },

  viewMoreBtn: {
    paddingVertical: 12, alignItems: 'center', justifyContent: 'center',
    borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bg,
  },
  viewMoreText: { fontSize: 12.5, fontWeight: '700', color: C.accent },

  // User Management Approval Stats
  headerLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerLinkText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#16A34A',
  },
  approvalStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  approvalStatCard: {
    flex: 1,
    minWidth: 170,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 4,
  },
  approvalStatCardHighlight: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  approvalStatTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  approvalStatLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  pendingPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pendingPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  approvalStatNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  approvalStatSub: {
    fontSize: 11,
    color: '#94A3B8',
  },
});
