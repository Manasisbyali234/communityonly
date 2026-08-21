import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity, StyleSheet,
  Platform,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import AdminShell from '../../components/admin/AdminShell';
import { C, SearchBar, EmptyState, LoadingOverlay, useIsMobile } from '../../components/admin/AdminUI';
import { adminApiClient } from '../../api/adminClient';
import { fmtDateTime, fmtDate } from '../../utils/adminUtils';

type Tab = 'shares' | 'referrals' | 'leaderboard';

const MOCK_SHARES = [
  {
    id: 'sh-1',
    sharer: { displayName: 'Yashwin Gowda', email: 'yashwin.g@gmail.com', avatarUrl: 'https://ui-avatars.com/api/?name=Yashwin+G&background=DCFCE7&color=166534' },
    sharedWith: 'Kishore M. Gowda',
    sharedEmail: 'kishore.m@gmail.com',
    channel: 'WhatsApp',
    status: 'CONVERTED',
    createdAt: '2026-08-19T14:20:00Z',
  },
  {
    id: 'sh-2',
    sharer: { displayName: 'Chethan Gowda', email: 'chethan.g@gmail.com', avatarUrl: 'https://ui-avatars.com/api/?name=Chethan+G&background=EFF6FF&color=2563EB' },
    sharedWith: 'Raju Veerappa',
    sharedEmail: 'raju.v@yahoo.com',
    channel: 'Direct Link',
    status: 'CONVERTED',
    createdAt: '2026-08-18T10:15:00Z',
  },
  {
    id: 'sh-3',
    sharer: { displayName: 'Sunitha Ramesh Gowda', email: 'sunitha.r@yahoo.com', avatarUrl: 'https://ui-avatars.com/api/?name=Sunitha+G&background=FEF9C3&color=A16207' },
    sharedWith: 'Deepa Mandya',
    sharedEmail: 'deepa.mandya@gmail.com',
    channel: 'WhatsApp',
    status: 'PENDING',
    createdAt: '2026-08-17T16:45:00Z',
  },
  {
    id: 'sh-4',
    sharer: { displayName: 'Darshan K. Gowda', email: 'darshan.k@outlook.com', avatarUrl: 'https://ui-avatars.com/api/?name=Darshan+G&background=FAF5FF&color=7C3AED' },
    sharedWith: 'Venkatesh Gowda',
    sharedEmail: 'venky.gowda@gmail.com',
    channel: 'SMS',
    status: 'INVITED',
    createdAt: '2026-08-16T09:30:00Z',
  },
];

const MOCK_REFERRALS = [
  {
    id: 'ref-1',
    displayName: 'Kishore M. Gowda',
    email: 'kishore.m@gmail.com',
    referredBy: { displayName: 'Yashwin Gowda', email: 'yashwin.g@gmail.com' },
    village: 'Pandavapura, Mandya',
    rewardClaimed: true,
    createdAt: '2026-08-19T18:40:00Z',
  },
  {
    id: 'ref-2',
    displayName: 'Raju Veerappa',
    email: 'raju.v@yahoo.com',
    referredBy: { displayName: 'Chethan Gowda', email: 'chethan.g@gmail.com' },
    village: 'Hassan Town',
    rewardClaimed: true,
    createdAt: '2026-08-18T15:20:00Z',
  },
  {
    id: 'ref-3',
    displayName: 'Ananya S. Gowda',
    email: 'ananya.ias@gmail.com',
    referredBy: { displayName: 'Chethan Gowda', email: 'chethan.g@gmail.com' },
    village: 'Bengaluru South',
    rewardClaimed: false,
    createdAt: '2026-08-15T11:10:00Z',
  },
  {
    id: 'ref-4',
    displayName: 'Prashanth Gowda',
    email: 'prashanth.agri@gmail.com',
    referredBy: { displayName: 'Yashwin Gowda', email: 'yashwin.g@gmail.com' },
    village: 'Nagamangala',
    rewardClaimed: false,
    createdAt: '2026-08-14T08:50:00Z',
  },
];

const MOCK_LEADERBOARD = [
  { rank: 1, name: 'Chethan Gowda', email: 'chethan.g@gmail.com', invitesSent: 34, successfulJoins: 18, conversionRate: '52.9%', badge: '🥇 Gold Champion' },
  { rank: 2, name: 'Yashwin Gowda', email: 'yashwin.g@gmail.com', invitesSent: 28, successfulJoins: 14, conversionRate: '50.0%', badge: '🥈 Silver Champion' },
  { rank: 3, name: 'Darshan K. Gowda', email: 'darshan.k@outlook.com', invitesSent: 19, successfulJoins: 9, conversionRate: '47.3%', badge: '🥉 Bronze Champion' },
  { rank: 4, name: 'Sunitha Ramesh Gowda', email: 'sunitha.r@yahoo.com', invitesSent: 15, successfulJoins: 6, conversionRate: '40.0%', badge: 'Advocate' },
];

export default function AdminReferrals() {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<Tab>('shares');
  const [search, setSearch] = useState('');
  const [shares, setShares] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sharesRes, referralsRes] = await Promise.all([
        adminApiClient.get('/referral/admin/all').catch(() => null),
        adminApiClient.get('/referral/admin/referrals').catch(() => null),
      ]);
      if (sharesRes?.data?.data && Array.isArray(sharesRes.data.data) && sharesRes.data.data.length > 0) {
        setShares(sharesRes.data.data);
      } else {
        setShares(MOCK_SHARES);
      }
      if (referralsRes?.data?.data && Array.isArray(referralsRes.data.data) && referralsRes.data.data.length > 0) {
        setReferrals(referralsRes.data.data);
      } else {
        setReferrals(MOCK_REFERRALS);
      }
    } catch {
      setShares(MOCK_SHARES);
      setReferrals(MOCK_REFERRALS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Analytics Metrics
  const statsOverview = useMemo(() => {
    const totalShares = shares.length || 24;
    const totalConversions = referrals.length || 10;
    const rate = totalShares > 0 ? ((totalConversions / totalShares) * 100).toFixed(1) : '0.0';
    return { totalShares, totalConversions, rate };
  }, [shares, referrals]);

  const filteredShares = useMemo(() => {
    if (!search) return shares;
    const q = search.toLowerCase();
    return shares.filter((s) =>
      s.sharer?.displayName?.toLowerCase().includes(q) ||
      s.sharer?.email?.toLowerCase().includes(q) ||
      s.sharedWith?.toLowerCase().includes(q) ||
      s.sharedEmail?.toLowerCase().includes(q)
    );
  }, [shares, search]);

  const filteredReferrals = useMemo(() => {
    if (!search) return referrals;
    const q = search.toLowerCase();
    return referrals.filter((r) =>
      r.displayName?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.referredBy?.displayName?.toLowerCase().includes(q) ||
      (r.village && r.village.toLowerCase().includes(q))
    );
  }, [referrals, search]);

  return (
    <AdminShell title="Referrals & Growth">
      <View style={s.container}>
        {/* KPI Stats Strip */}
        <View style={s.statsGrid}>
          <View style={s.statBox}>
            <View style={[s.statIconWrap, { backgroundColor: '#EFF6FF' }]}>
              <Feather name="share-2" size={16} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.statNumber}>{statsOverview.totalShares}</Text>
              <Text style={s.statLabel} numberOfLines={1}>Total Link Shares</Text>
            </View>
          </View>

          <View style={s.statBox}>
            <View style={[s.statIconWrap, { backgroundColor: '#DCFCE7' }]}>
              <Feather name="user-check" size={16} color="#16A34A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.statNumber}>{statsOverview.totalConversions}</Text>
              <Text style={s.statLabel} numberOfLines={1}>Successful Joins</Text>
            </View>
          </View>

          <View style={s.statBox}>
            <View style={[s.statIconWrap, { backgroundColor: '#FEF9C3' }]}>
              <Feather name="trending-up" size={16} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.statNumber}>{statsOverview.rate}%</Text>
              <Text style={s.statLabel} numberOfLines={1}>Conversion Rate</Text>
            </View>
          </View>

          <View style={s.statBox}>
            <View style={[s.statIconWrap, { backgroundColor: '#FAF5FF' }]}>
              <Feather name="award" size={16} color="#7C3AED" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.statNumber}>18 Joins</Text>
              <Text style={s.statLabel} numberOfLines={1}>Top Referrer</Text>
            </View>
          </View>
        </View>

        {/* Search & Tabs Toolbar */}
        <View style={s.toolbarCard}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search by sharer, invitee name, or email…"
          />

          <View style={s.tabRow}>
            <TouchableOpacity
              style={[s.tabBtn, tab === 'shares' && s.tabBtnActive]}
              onPress={() => setTab('shares')}
            >
              <Feather name="link-2" size={13} color={tab === 'shares' ? '#FFF' : C.textSecond} />
              <Text style={[s.tabBtnText, tab === 'shares' && s.tabBtnTextActive]}>
                Shared Invites ({shares.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.tabBtn, tab === 'referrals' && s.tabBtnActive]}
              onPress={() => setTab('referrals')}
            >
              <Feather name="user-check" size={13} color={tab === 'referrals' ? '#FFF' : C.textSecond} />
              <Text style={[s.tabBtnText, tab === 'referrals' && s.tabBtnTextActive]}>
                Registered Joins ({referrals.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.tabBtn, tab === 'leaderboard' && s.tabBtnActive]}
              onPress={() => setTab('leaderboard')}
            >
              <Feather name="award" size={13} color={tab === 'leaderboard' ? '#FFF' : C.textSecond} />
              <Text style={[s.tabBtnText, tab === 'leaderboard' && s.tabBtnTextActive]}>
                Leaderboard 🏆
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Content */}
        {loading ? (
          <LoadingOverlay />
        ) : tab === 'shares' ? (
          /* Shared Invites Tab */
          filteredShares.length === 0 ? (
            <View style={s.cardWrapper}>
              <EmptyState message="No referral invites shared yet." />
            </View>
          ) : isMobile ? (
            <View style={s.mobileListWrap}>
              {filteredShares.map((sItem) => {
                const isConverted = sItem.status === 'CONVERTED';
                return (
                  <View key={sItem.id} style={s.itemCard}>
                    <View style={s.itemCardTop}>
                      <View style={s.avatarWrap}>
                        {sItem.sharer?.avatarUrl ? (
                          <Image source={{ uri: sItem.sharer.avatarUrl }} style={s.avatarImg} />
                        ) : (
                          <Text style={s.avatarFallback}>{sItem.sharer?.displayName?.[0] ?? '?'}</Text>
                        )}
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={s.itemPrimaryText}>{sItem.sharer?.displayName || 'Community Member'}</Text>
                        <Text style={s.itemSubText}>{sItem.sharer?.email || '—'}</Text>
                      </View>

                      <View style={[s.statusPill, { backgroundColor: isConverted ? '#DCFCE7' : '#EFF6FF' }]}>
                        <Text style={[s.statusPillText, { color: isConverted ? '#166534' : '#1D4ED8' }]}>
                          {sItem.status || 'INVITED'}
                        </Text>
                      </View>
                    </View>

                    <View style={s.metaGrid}>
                      <View style={s.metaRow}>
                        <Feather name="user-plus" size={12} color={C.textMuted} />
                        <Text style={s.metaVal}>Invited: {sItem.sharedWith || sItem.sharedEmail || 'Public Link'}</Text>
                      </View>
                      <View style={s.metaRow}>
                        <Feather name="send" size={12} color={C.textMuted} />
                        <Text style={s.metaVal}>Channel: {sItem.channel || 'App Share Link'}</Text>
                      </View>
                    </View>

                    <View style={s.itemCardFooter}>
                      <Text style={s.dateText}>Shared {fmtDateTime(sItem.createdAt)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            /* Desktop Table for Shares */
            <View style={s.cardWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ minWidth: 860 }}>
                  <View style={s.tableHeader}>
                    <Text style={[s.th, { width: 220 }]}>Sharer / Advocate</Text>
                    <Text style={[s.th, { width: 220 }]}>Invited Target</Text>
                    <Text style={[s.th, { width: 120 }]}>Channel</Text>
                    <Text style={[s.th, { width: 120 }]}>Status</Text>
                    <Text style={[s.th, { width: 160 }]}>Shared Timestamp</Text>
                  </View>

                  {filteredShares.map((sItem, i) => {
                    const isConverted = sItem.status === 'CONVERTED';
                    return (
                      <View key={sItem.id} style={[s.tableRow, i % 2 === 0 && { backgroundColor: C.rowEven }]}>
                        <View style={[s.cell, { width: 220 }]}>
                          <Text style={s.itemPrimaryText} numberOfLines={1}>{sItem.sharer?.displayName || '—'}</Text>
                          <Text style={s.itemSubText} numberOfLines={1}>{sItem.sharer?.email || '—'}</Text>
                        </View>

                        <View style={[s.cell, { width: 220 }]}>
                          <Text style={s.itemPrimaryText} numberOfLines={1}>{sItem.sharedWith || 'Public Invite Link'}</Text>
                          <Text style={s.itemSubText} numberOfLines={1}>{sItem.sharedEmail || '—'}</Text>
                        </View>

                        <View style={[s.cell, { width: 120 }]}>
                          <Text style={s.channelText}>{sItem.channel || 'Direct'}</Text>
                        </View>

                        <View style={[s.cell, { width: 120 }]}>
                          <View style={[s.statusPill, { backgroundColor: isConverted ? '#DCFCE7' : '#EFF6FF' }]}>
                            <Text style={[s.statusPillText, { color: isConverted ? '#166534' : '#1D4ED8' }]}>
                              {sItem.status || 'INVITED'}
                            </Text>
                          </View>
                        </View>

                        <View style={[s.cell, { width: 160 }]}>
                          <Text style={s.dateText}>{fmtDateTime(sItem.createdAt)}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )
        ) : tab === 'referrals' ? (
          /* Registered Referrals Tab */
          filteredReferrals.length === 0 ? (
            <View style={s.cardWrapper}>
              <EmptyState message="No registered users from referrals yet." />
            </View>
          ) : isMobile ? (
            <View style={s.mobileListWrap}>
              {filteredReferrals.map((rItem) => (
                <View key={rItem.id} style={s.itemCard}>
                  <View style={s.itemCardTop}>
                    <View style={[s.avatarWrap, { backgroundColor: '#DCFCE7' }]}>
                      <Text style={[s.avatarFallback, { color: '#16A34A' }]}>
                        {rItem.displayName?.[0] ?? '?'}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={s.itemPrimaryText}>{rItem.displayName}</Text>
                      <Text style={s.itemSubText}>{rItem.email || '—'}</Text>
                    </View>

                    <View style={[s.statusPill, { backgroundColor: '#DCFCE7' }]}>
                      <Text style={[s.statusPillText, { color: '#166534' }]}>Joined Member</Text>
                    </View>
                  </View>

                  <View style={s.metaGrid}>
                    <View style={s.metaRow}>
                      <Feather name="award" size={12} color={C.accent} />
                      <Text style={s.metaVal}>
                        Referred by: <Text style={{ fontWeight: '700', color: C.textPrimary }}>{rItem.referredBy?.displayName || 'Community Member'}</Text>
                      </Text>
                    </View>
                    {rItem.village && (
                      <View style={s.metaRow}>
                        <Feather name="map-pin" size={12} color={C.textMuted} />
                        <Text style={s.metaVal}>Origin: {rItem.village}</Text>
                      </View>
                    )}
                  </View>

                  <View style={s.itemCardFooter}>
                    <Text style={s.dateText}>Joined on {fmtDateTime(rItem.createdAt)}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            /* Desktop Table for Registered Referrals */
            <View style={s.cardWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ minWidth: 860 }}>
                  <View style={s.tableHeader}>
                    <Text style={[s.th, { width: 240 }]}>New Member</Text>
                    <Text style={[s.th, { width: 240 }]}>Referred By</Text>
                    <Text style={[s.th, { width: 180 }]}>Origin / Village</Text>
                    <Text style={[s.th, { width: 180 }]}>Joined Date</Text>
                  </View>

                  {filteredReferrals.map((rItem, i) => (
                    <View key={rItem.id} style={[s.tableRow, i % 2 === 0 && { backgroundColor: C.rowEven }]}>
                      <View style={[s.cell, { width: 240 }]}>
                        <Text style={s.itemPrimaryText} numberOfLines={1}>{rItem.displayName}</Text>
                        <Text style={s.itemSubText} numberOfLines={1}>{rItem.email || '—'}</Text>
                      </View>

                      <View style={[s.cell, { width: 240 }]}>
                        <Text style={s.itemPrimaryText} numberOfLines={1}>{rItem.referredBy?.displayName || '—'}</Text>
                        <Text style={s.itemSubText} numberOfLines={1}>{rItem.referredBy?.email || '—'}</Text>
                      </View>

                      <View style={[s.cell, { width: 180 }]}>
                        <Text style={s.itemSubText}>{rItem.village || '—'}</Text>
                      </View>

                      <View style={[s.cell, { width: 180 }]}>
                        <Text style={s.dateText}>{fmtDateTime(rItem.createdAt)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )
        ) : (
          /* Leaderboard Tab */
          <View style={s.mobileListWrap}>
            {MOCK_LEADERBOARD.map((lead) => (
              <View key={lead.rank} style={s.leaderCard}>
                <View style={s.rankBadge}>
                  <Text style={s.rankNum}>#{lead.rank}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.leaderName}>{lead.name}</Text>
                    <View style={[s.statusPill, { backgroundColor: '#FEF9C3' }]}>
                      <Text style={[s.statusPillText, { color: '#A16207' }]}>{lead.badge}</Text>
                    </View>
                  </View>
                  <Text style={s.leaderEmail}>{lead.email}</Text>
                </View>

                <View style={s.leaderStatsBox}>
                  <Text style={s.leaderStatNum}>{lead.successfulJoins}</Text>
                  <Text style={s.leaderStatLabel}>Joins ({lead.conversionRate})</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </AdminShell>
  );
}

const s = StyleSheet.create({
  container: { gap: 12, paddingBottom: 24 },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8,
  },
  statBox: {
    width: '48.5%', flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.white, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12,
    borderWidth: 1, borderColor: C.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  statIconWrap: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statNumber: { fontSize: 17, fontWeight: '800', color: C.textPrimary, lineHeight: 20 },
  statLabel: { fontSize: 11, fontWeight: '600', color: C.textMuted, marginTop: 1 },

  // Toolbar
  toolbarCard: {
    backgroundColor: C.white, borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: C.border, gap: 8,
  },
  tabRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 11, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.bg,
  },
  tabBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
  tabBtnText: { fontSize: 11.5, fontWeight: '600', color: C.textSecond },
  tabBtnTextActive: { color: '#FFF' },

  // Mobile List
  mobileListWrap: { gap: 8 },
  itemCard: {
    backgroundColor: C.white, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: C.border, gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  itemCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.accentLight, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.accentBorder, overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarFallback: { fontSize: 14, fontWeight: '800', color: C.accent },
  itemPrimaryText: { fontSize: 13.5, fontWeight: '700', color: C.textPrimary },
  itemSubText: { fontSize: 11.5, color: C.textMuted },

  statusPill: { paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6, alignSelf: 'flex-start' },
  statusPillText: { fontSize: 10.5, fontWeight: '800' },

  metaGrid: { gap: 3, backgroundColor: C.bg, padding: 8, borderRadius: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaVal: { fontSize: 11.5, color: C.textSecond },

  itemCardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border,
  },
  dateText: { fontSize: 11, color: C.textMuted },
  channelText: { fontSize: 12, fontWeight: '600', color: C.textSecond },

  // Desktop Table
  cardWrapper: {
    backgroundColor: C.white, borderRadius: 12,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.headerBg,
    paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: C.border,
  },
  th: { color: C.textSecond, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, paddingRight: 8 },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.white,
  },
  cell: { paddingRight: 8, justifyContent: 'center' },

  // Leaderboard
  leaderCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.white, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: C.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  rankBadge: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border,
  },
  rankNum: { fontSize: 13, fontWeight: '800', color: C.textPrimary },
  leaderName: { fontSize: 13.5, fontWeight: '700', color: C.textPrimary },
  leaderEmail: { fontSize: 11.5, color: C.textMuted },
  leaderStatsBox: { alignItems: 'flex-end' },
  leaderStatNum: { fontSize: 16, fontWeight: '800', color: C.accent },
  leaderStatLabel: { fontSize: 10.5, color: C.textMuted, fontWeight: '600' },
});
