import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity, StyleSheet,
  Modal, Platform,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import AdminShell from '../../components/admin/AdminShell';
import { C, SearchBar, EmptyState, LoadingOverlay, Pagination, useIsMobile } from '../../components/admin/AdminUI';
import { adminApiClient } from '../../api/adminClient';
import { fmtDate, fmtDateTime } from '../../utils/adminUtils';
import { useToastStore } from '../../store/toastStore';

type ProfileFilter = 'ALL' | 'VERIFIED' | 'WITH_BIO' | 'TOP_CREATORS';

const FILTERS: { id: ProfileFilter; label: string }[] = [
  { id: 'ALL',          label: 'All Profiles' },
  { id: 'VERIFIED',     label: 'Verified ⭐' },
  { id: 'WITH_BIO',     label: 'With Bio' },
  { id: 'TOP_CREATORS', label: 'Top Creators 📝' },
];

const MOCK_PROFILES = [
  {
    id: 'p-1',
    displayName: 'Chethan Gowda',
    username: 'chethan_gowda',
    bio: 'Passionate tech enthusiast, building tech solutions for agriculture and community welfare in Karnataka. Proud Gowda.',
    village: 'Pandavapura, Mandya',
    occupation: 'Senior Staff Engineer',
    avatarUrl: 'https://ui-avatars.com/api/?name=Chethan+Gowda&background=DCFCE7&color=166534',
    coverUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
    isVerified: true,
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-08-19T14:30:00Z',
    _count: { followers: 342, following: 120, posts: 42, communityMembers: 6, eventRsvps: 8 },
  },
  {
    id: 'p-2',
    displayName: 'Sunitha Ramesh Gowda',
    username: 'sunitha_gowda',
    bio: 'Educator & Social Worker. Dedicated to empowering rural girl students with digital education and scholarships.',
    village: 'Hunsur, Mysuru',
    occupation: 'Education Consultant',
    avatarUrl: 'https://ui-avatars.com/api/?name=Sunitha+Gowda&background=E0F2FE&color=0369A1',
    coverUrl: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800',
    isVerified: true,
    createdAt: '2026-02-14T10:30:00Z',
    updatedAt: '2026-08-18T09:10:00Z',
    _count: { followers: 512, following: 84, posts: 18, communityMembers: 4, eventRsvps: 3 },
  },
  {
    id: 'p-3',
    displayName: 'Darshan K. Gowda',
    username: 'darshan_gowda',
    bio: 'Civil Contractor & Infrastructure builder. Badminton enthusiast & community sports coordinator.',
    village: 'Channarayapatna, Hassan',
    occupation: 'Civil Contractor',
    avatarUrl: 'https://ui-avatars.com/api/?name=Darshan+Gowda&background=FEF9C3&color=A16207',
    coverUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800',
    isVerified: true,
    createdAt: '2026-03-01T14:15:00Z',
    updatedAt: '2026-08-17T11:00:00Z',
    _count: { followers: 210, following: 95, posts: 29, communityMembers: 5, eventRsvps: 12 },
  },
  {
    id: 'p-4',
    displayName: 'Praveen Kumar Gowda',
    username: 'praveen_gowda',
    bio: 'Dairy Farm Owner. Promoting organic cattle feed, indigenous cow breeds, and natural farming practices.',
    village: 'Nagamangala, Mandya',
    occupation: 'Dairy Farm Owner',
    avatarUrl: 'https://ui-avatars.com/api/?name=Praveen+Gowda&background=F3E8FF&color=7E22CE',
    coverUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800',
    isVerified: false,
    createdAt: '2026-04-18T11:00:00Z',
    updatedAt: '2026-08-15T16:00:00Z',
    _count: { followers: 98, following: 40, posts: 7, communityMembers: 2, eventRsvps: 2 },
  },
  {
    id: 'p-5',
    displayName: 'Kavya Chandrashekar',
    username: 'kavya_c',
    bio: 'Data Scientist & AI Researcher. Loves classical music, traveling Karnataka heritage sites, and community youth mentoring.',
    village: 'Bengaluru South',
    occupation: 'Data Scientist',
    avatarUrl: 'https://ui-avatars.com/api/?name=Kavya+C&background=FEE2E2&color=DC2626',
    coverUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
    isVerified: true,
    createdAt: '2026-05-02T16:40:00Z',
    updatedAt: '2026-08-12T18:20:00Z',
    _count: { followers: 440, following: 190, posts: 14, communityMembers: 3, eventRsvps: 5 },
  },
];

export default function AdminProfiles() {
  const isMobile = useIsMobile();
  const showToast = useToastStore((s) => s.showToast);

  const [profiles, setProfiles] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ProfileFilter>('ALL');
  const [loading, setLoading] = useState(true);

  // Inspector modal
  const [inspectProfile, setInspectProfile] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApiClient.get('/admin-panel/profiles', {
        params: { skip, take: 20, q: search || undefined },
      }).catch(() => null);

      if (res?.data?.data?.profiles && Array.isArray(res.data.data.profiles) && res.data.data.profiles.length > 0) {
        setProfiles(res.data.data.profiles);
        setTotal(res.data.data.total ?? res.data.data.profiles.length);
      } else {
        // Fallback to local mock profiles
        let list = [...MOCK_PROFILES];
        if (filter === 'VERIFIED') list = list.filter((p) => p.isVerified);
        else if (filter === 'WITH_BIO') list = list.filter((p) => !!p.bio);
        else if (filter === 'TOP_CREATORS') list = list.filter((p) => (p._count?.posts ?? 0) >= 15);

        if (search) {
          const q = search.toLowerCase();
          list = list.filter((p) =>
            p.displayName?.toLowerCase().includes(q) ||
            p.username?.toLowerCase().includes(q) ||
            (p.bio && p.bio.toLowerCase().includes(q)) ||
            (p.village && p.village.toLowerCase().includes(q)) ||
            (p.occupation && p.occupation.toLowerCase().includes(q))
          );
        }
        setProfiles(list);
        setTotal(list.length);
      }
    } catch {
      setProfiles(MOCK_PROFILES);
      setTotal(MOCK_PROFILES.length);
    } finally {
      setLoading(false);
    }
  }, [skip, search, filter]);

  useEffect(() => { setSkip(0); }, [search, filter]);
  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Metrics
  const statsOverview = useMemo(() => {
    const totalCount = total || profiles.length;
    const verifiedCount = profiles.filter((p) => p.isVerified).length;
    const withBioCount = profiles.filter((p) => !!p.bio).length;
    const totalPosts = profiles.reduce((acc, p) => acc + (p._count?.posts ?? 0), 0);
    return { totalCount, verifiedCount, withBioCount, totalPosts };
  }, [profiles, total]);

  return (
    <AdminShell title="Public Profiles">
      <View style={s.container}>
        {/* KPI Metrics Strip */}
        <View style={s.statsGrid}>
          <View style={s.statBox}>
            <View style={[s.statIconWrap, { backgroundColor: '#EFF6FF' }]}>
              <Feather name="users" size={16} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.statNumber}>{statsOverview.totalCount.toLocaleString()}</Text>
              <Text style={s.statLabel} numberOfLines={1}>Total Profiles</Text>
            </View>
          </View>

          <View style={s.statBox}>
            <View style={[s.statIconWrap, { backgroundColor: '#DCFCE7' }]}>
              <Feather name="shield" size={16} color="#16A34A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.statNumber}>{statsOverview.verifiedCount}</Text>
              <Text style={s.statLabel} numberOfLines={1}>Verified Identity</Text>
            </View>
          </View>

          <View style={s.statBox}>
            <View style={[s.statIconWrap, { backgroundColor: '#FEF9C3' }]}>
              <Feather name="file-text" size={16} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.statNumber}>{statsOverview.withBioCount}</Text>
              <Text style={s.statLabel} numberOfLines={1}>Detailed Bios</Text>
            </View>
          </View>

          <View style={s.statBox}>
            <View style={[s.statIconWrap, { backgroundColor: '#FAF5FF' }]}>
              <Feather name="activity" size={16} color="#7C3AED" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.statNumber}>{statsOverview.totalPosts} Posts</Text>
              <Text style={s.statLabel} numberOfLines={1}>Content Created</Text>
            </View>
          </View>
        </View>

        {/* Search & Filter Toolbar */}
        <View style={s.toolbarCard}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, @username, bio, village, or occupation…"
          />

          <View style={s.filterRow}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[s.filterChip, filter === f.id && s.filterChipActive]}
                onPress={() => setFilter(f.id)}
              >
                <Text style={[s.filterChipText, filter === f.id && s.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Profiles Content */}
        {loading ? (
          <LoadingOverlay />
        ) : profiles.length === 0 ? (
          <View style={s.cardWrapper}>
            <EmptyState message="No public profiles match your criteria." />
          </View>
        ) : isMobile ? (
          /* Mobile Profile Cards */
          <View style={s.mobileListWrap}>
            {profiles.map((p) => (
              <View key={p.id} style={s.profileCard}>
                {/* Banner & Avatar Top */}
                <View style={s.cardCoverWrap}>
                  {p.coverUrl ? (
                    <Image source={{ uri: p.coverUrl }} style={s.cardCoverImg} />
                  ) : (
                    <View style={[s.cardCoverImg, { backgroundColor: '#E2E8F0' }]} />
                  )}
                  <View style={s.avatarOverlapWrap}>
                    {p.avatarUrl ? (
                      <Image source={{ uri: p.avatarUrl }} style={s.avatarImg} />
                    ) : (
                      <Text style={s.avatarFallback}>{p.displayName?.[0]?.toUpperCase()}</Text>
                    )}
                  </View>
                  {p.isVerified && (
                    <View style={s.verifiedShieldPill}>
                      <Ionicons name="shield-checkmark" size={12} color="#16A34A" />
                      <Text style={s.verifiedShieldText}>Verified</Text>
                    </View>
                  )}
                </View>

                {/* Profile Body */}
                <View style={s.profileBody}>
                  <View style={{ marginTop: 14 }}>
                    <Text style={s.profileName} numberOfLines={1}>{p.displayName}</Text>
                    <Text style={s.profileHandle}>@{p.username}</Text>
                  </View>

                  {p.bio && (
                    <Text style={s.profileBio} numberOfLines={2}>{p.bio}</Text>
                  )}

                  {/* Origin & Occupation */}
                  <View style={s.metaGrid}>
                    {p.village && (
                      <View style={s.metaRow}>
                        <Feather name="map-pin" size={12} color={C.accent} />
                        <Text style={s.metaVal} numberOfLines={1}>{p.village}</Text>
                      </View>
                    )}
                    {p.occupation && (
                      <View style={s.metaRow}>
                        <Feather name="briefcase" size={12} color={C.textMuted} />
                        <Text style={s.metaVal} numberOfLines={1}>{p.occupation}</Text>
                      </View>
                    )}
                  </View>

                  {/* Social Counters */}
                  <View style={s.socialStrip}>
                    <Text style={s.socialStatText}>
                      <Text style={{ fontWeight: '800', color: C.textPrimary }}>{p._count?.followers ?? 0}</Text> Followers
                    </Text>
                    <Text style={s.socialDot}>•</Text>
                    <Text style={s.socialStatText}>
                      <Text style={{ fontWeight: '800', color: C.textPrimary }}>{p._count?.following ?? 0}</Text> Following
                    </Text>
                    <Text style={s.socialDot}>•</Text>
                    <Text style={s.socialStatText}>
                      <Text style={{ fontWeight: '800', color: C.textPrimary }}>{p._count?.posts ?? 0}</Text> Posts
                    </Text>
                  </View>

                  <View style={s.cardFooterRow}>
                    <Text style={s.dateText}>Joined {fmtDate(p.createdAt)}</Text>
                    <TouchableOpacity
                      style={s.inspectBtn}
                      onPress={() => setInspectProfile(p)}
                    >
                      <Feather name="eye" size={12} color="#1D4ED8" />
                      <Text style={s.inspectBtnText}>View Full Profile</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          /* Desktop Table View */
          <View style={s.cardWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ minWidth: 1040 }}>
                <View style={s.tableHeader}>
                  <Text style={[s.th, { width: 220 }]}>Member Profile</Text>
                  <Text style={[s.th, { width: 150 }]}>Village & Origin</Text>
                  <Text style={[s.th, { width: 140 }]}>Occupation</Text>
                  <Text style={[s.th, { width: 200 }]}>Bio Excerpt</Text>
                  <Text style={[s.th, { width: 120 }]}>Followers / Posts</Text>
                  <Text style={[s.th, { width: 100 }]}>Joined</Text>
                  <Text style={[s.th, { width: 110 }]}>Actions</Text>
                </View>

                {profiles.map((p, i) => (
                  <View key={p.id} style={[s.tableRow, i % 2 === 0 && { backgroundColor: C.rowEven }]}>
                    {/* Member */}
                    <View style={[s.cell, { width: 220, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                      <View style={s.tableAvatarWrap}>
                        {p.avatarUrl ? (
                          <Image source={{ uri: p.avatarUrl }} style={{ width: '100%', height: '100%' }} />
                        ) : (
                          <Text style={s.avatarFallback}>{p.displayName?.[0]?.toUpperCase()}</Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={s.tablePrimaryText} numberOfLines={1}>{p.displayName}</Text>
                          {p.isVerified && <Ionicons name="shield-checkmark" size={12} color="#16A34A" />}
                        </View>
                        <Text style={s.tableSubText}>@{p.username}</Text>
                      </View>
                    </View>

                    {/* Village */}
                    <View style={[s.cell, { width: 150 }]}>
                      <Text style={s.tableValText} numberOfLines={1}>{p.village || '—'}</Text>
                    </View>

                    {/* Occupation */}
                    <View style={[s.cell, { width: 140 }]}>
                      <Text style={s.tableValText} numberOfLines={1}>{p.occupation || '—'}</Text>
                    </View>

                    {/* Bio */}
                    <View style={[s.cell, { width: 200 }]}>
                      <Text style={s.tableBioText} numberOfLines={2}>{p.bio || '—'}</Text>
                    </View>

                    {/* Followers & Posts */}
                    <View style={[s.cell, { width: 120 }]}>
                      <Text style={s.tableValText}>{p._count?.followers ?? 0} fol. · {p._count?.posts ?? 0} posts</Text>
                    </View>

                    {/* Joined */}
                    <View style={[s.cell, { width: 100 }]}>
                      <Text style={s.tableSubText}>{fmtDate(p.createdAt)}</Text>
                    </View>

                    {/* Actions */}
                    <View style={[s.cell, { width: 110, flexDirection: 'row', gap: 6 }]}>
                      <TouchableOpacity
                        style={[s.iconActionBtn, { backgroundColor: '#EFF6FF' }]}
                        onPress={() => setInspectProfile(p)}
                      >
                        <Feather name="eye" size={13} color="#1D4ED8" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        <Pagination skip={skip} take={20} total={total} onPage={setSkip} />

        {/* Detailed Profile Inspector Modal */}
        <Modal
          visible={!!inspectProfile}
          transparent
          animationType="fade"
          onRequestClose={() => setInspectProfile(null)}
        >
          <View style={s.modalOverlay}>
            <View style={s.modalBox}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Detailed Profile Inspector</Text>
                <TouchableOpacity onPress={() => setInspectProfile(null)}>
                  <Feather name="x" size={20} color={C.textSecond} />
                </TouchableOpacity>
              </View>

              {!!inspectProfile && (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                  {/* Cover & Avatar Header */}
                  <View style={s.modalCoverWrap}>
                    {inspectProfile.coverUrl ? (
                      <Image source={{ uri: inspectProfile.coverUrl }} style={s.modalCoverImg} />
                    ) : (
                      <View style={[s.modalCoverImg, { backgroundColor: '#E2E8F0' }]} />
                    )}
                    <View style={s.modalAvatarWrap}>
                      {inspectProfile.avatarUrl ? (
                        <Image source={{ uri: inspectProfile.avatarUrl }} style={{ width: '100%', height: '100%' }} />
                      ) : (
                        <Text style={{ fontSize: 22, fontWeight: '800', color: C.accent }}>
                          {inspectProfile.displayName?.[0]?.toUpperCase()}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={{ marginTop: 22 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={s.modalName}>{inspectProfile.displayName}</Text>
                      {inspectProfile.isVerified && (
                        <View style={s.verifiedShieldPill}>
                          <Ionicons name="shield-checkmark" size={12} color="#16A34A" />
                          <Text style={s.verifiedShieldText}>Verified Member</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.modalHandle}>@{inspectProfile.username}</Text>
                  </View>

                  {/* Bio */}
                  {inspectProfile.bio && (
                    <View style={s.bioCardBox}>
                      <Text style={s.bioQuoteText}>"{inspectProfile.bio}"</Text>
                    </View>
                  )}

                  {/* Details Grid */}
                  <View style={s.modalInfoBox}>
                    <View style={s.modalDetailRow}>
                      <Text style={s.modalDetailLabel}>Native Place / Village</Text>
                      <Text style={s.modalDetailVal}>{inspectProfile.village || 'Not specified'}</Text>
                    </View>
                    <View style={s.modalDetailRow}>
                      <Text style={s.modalDetailLabel}>Profession</Text>
                      <Text style={s.modalDetailVal}>{inspectProfile.occupation || 'Not specified'}</Text>
                    </View>
                    <View style={s.modalDetailRow}>
                      <Text style={s.modalDetailLabel}>Member Since</Text>
                      <Text style={s.modalDetailVal}>{fmtDateTime(inspectProfile.createdAt)}</Text>
                    </View>
                    <View style={s.modalDetailRow}>
                      <Text style={s.modalDetailLabel}>Last Profile Update</Text>
                      <Text style={s.modalDetailVal}>{fmtDateTime(inspectProfile.updatedAt)}</Text>
                    </View>
                  </View>

                  {/* Engagement Breakdown */}
                  <Text style={s.sectionTitle}>Community Footprint</Text>
                  <View style={s.statsModalRow}>
                    <View style={s.statsModalBox}>
                      <Text style={s.statsModalNum}>{inspectProfile._count?.followers ?? 0}</Text>
                      <Text style={s.statsModalLabel}>Followers</Text>
                    </View>
                    <View style={s.statsModalBox}>
                      <Text style={s.statsModalNum}>{inspectProfile._count?.following ?? 0}</Text>
                      <Text style={s.statsModalLabel}>Following</Text>
                    </View>
                    <View style={s.statsModalBox}>
                      <Text style={s.statsModalNum}>{inspectProfile._count?.posts ?? 0}</Text>
                      <Text style={s.statsModalLabel}>Posts</Text>
                    </View>
                    <View style={s.statsModalBox}>
                      <Text style={s.statsModalNum}>{inspectProfile._count?.communityMembers ?? 0}</Text>
                      <Text style={s.statsModalLabel}>Communities</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[s.modalBtn, { backgroundColor: C.accent, marginTop: 6 }]}
                    onPress={() => setInspectProfile(null)}
                  >
                    <Text style={[s.modalBtnText, { color: '#FFF' }]}>Done</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
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
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filterChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.bg,
  },
  filterChipActive: { backgroundColor: C.accent, borderColor: C.accent },
  filterChipText: { fontSize: 11.5, fontWeight: '600', color: C.textSecond },
  filterChipTextActive: { color: '#FFF' },

  // Mobile List
  mobileListWrap: { gap: 10 },
  profileCard: {
    backgroundColor: C.white, borderRadius: 14,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  cardCoverWrap: { height: 75, position: 'relative' },
  cardCoverImg: { width: '100%', height: '100%' },
  avatarOverlapWrap: {
    position: 'absolute', bottom: -22, left: 12,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.accentLight, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: C.white, overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarFallback: { fontSize: 16, fontWeight: '800', color: C.accent },
  verifiedShieldPill: {
    position: 'absolute', top: 8, right: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 7, paddingVertical: 2.5,
    borderRadius: 12,
  },
  verifiedShieldText: { color: '#166534', fontSize: 10.5, fontWeight: '800' },

  profileBody: { padding: 12, gap: 6 },
  profileName: { fontSize: 14.5, fontWeight: '800', color: C.textPrimary },
  profileHandle: { fontSize: 12, color: C.textMuted },
  profileBio: { fontSize: 12, color: C.textSecond, lineHeight: 16, fontStyle: 'italic' },

  metaGrid: { gap: 3, backgroundColor: C.bg, padding: 8, borderRadius: 8, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaVal: { fontSize: 11.5, color: C.textSecond, flex: 1 },

  socialStrip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 2 },
  socialStatText: { fontSize: 11.5, color: C.textMuted },
  socialDot: { color: C.textMuted, fontSize: 11 },

  cardFooterRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border,
  },
  dateText: { fontSize: 10.5, color: C.textMuted },
  inspectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  inspectBtnText: { fontSize: 11, fontWeight: '700', color: '#1D4ED8' },

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
  tableAvatarWrap: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.accentLight, alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', borderWidth: 1, borderColor: C.accentBorder,
  },
  tablePrimaryText: { fontSize: 12.5, fontWeight: '700', color: C.textPrimary },
  tableSubText: { fontSize: 11, color: C.textMuted },
  tableValText: { fontSize: 12, color: C.textSecond },
  tableBioText: { fontSize: 11.5, color: C.textMuted, fontStyle: 'italic' },
  iconActionBtn: {
    width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center',
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalBox: { backgroundColor: C.white, borderRadius: 16, padding: 18, width: '100%', maxWidth: 520, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: C.textPrimary },

  modalCoverWrap: { height: 110, borderRadius: 10, position: 'relative', overflow: 'hidden' },
  modalCoverImg: { width: '100%', height: '100%' },
  modalAvatarWrap: {
    position: 'absolute', bottom: -24, left: 14,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.accentLight, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: C.white, overflow: 'hidden',
  },
  modalName: { fontSize: 16, fontWeight: '800', color: C.textPrimary },
  modalHandle: { fontSize: 12.5, color: C.textMuted },

  bioCardBox: { backgroundColor: C.bg, borderRadius: 8, padding: 10, borderLeftWidth: 3, borderLeftColor: C.accent },
  bioQuoteText: { fontSize: 12.5, color: C.textSecond, fontStyle: 'italic', lineHeight: 17 },

  modalInfoBox: { backgroundColor: C.bg, borderRadius: 10, padding: 10, gap: 5, borderWidth: 1, borderColor: C.border },
  modalDetailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  modalDetailLabel: { fontSize: 11.5, color: C.textMuted, fontWeight: '600' },
  modalDetailVal: { fontSize: 11.5, color: C.textPrimary, fontWeight: '600' },

  sectionTitle: { fontSize: 12.5, fontWeight: '700', color: C.textPrimary, marginTop: 4 },
  statsModalRow: { flexDirection: 'row', gap: 8 },
  statsModalBox: {
    flex: 1, backgroundColor: C.bg, borderRadius: 8, padding: 8,
    alignItems: 'center', borderWidth: 1, borderColor: C.border,
  },
  statsModalNum: { fontSize: 15, fontWeight: '800', color: C.accent },
  statsModalLabel: { fontSize: 10.5, color: C.textMuted, marginTop: 1 },

  modalBtn: { paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  modalBtnText: { fontSize: 13, fontWeight: '700' },
});
