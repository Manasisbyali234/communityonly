import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, Image, TouchableOpacity, ScrollView, StyleSheet,
  Modal, TextInput, ActivityIndicator, Platform,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import AdminShell from '../../components/admin/AdminShell';
import { C, SearchBar, EmptyState, LoadingOverlay, Pagination, useIsMobile } from '../../components/admin/AdminUI';
import { adminApiClient } from '../../api/adminClient';
import { fmtDateTime, fmtDate } from '../../utils/adminUtils';
import { useToastStore } from '../../store/toastStore';
import { useConfirmStore } from '../../store/confirmStore';
import { useUserApprovalStore } from '../../store/userApprovalStore';

type FilterType = 'ALL' | 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'ADMINS';

const FILTERS: { id: FilterType; label: string; countKey?: string }[] = [
  { id: 'ALL',       label: 'All Members' },
  { id: 'PENDING',   label: 'Pending / Review 🟠' },
  { id: 'APPROVED',  label: 'Approved 🟢' },
  { id: 'SUSPENDED', label: 'Suspended ⚫' },
  { id: 'ADMINS',    label: 'Admins & Staff' },
];

const MOCK_USERS = [
  {
    id: 'u-1',
    displayName: 'Chethan Gowda',
    username: 'chethan_gowda',
    email: 'chethan.g@gmail.com',
    phone: '+91 9845012345',
    village: 'Pandavapura, Mandya',
    occupation: 'Senior Software Engineer',
    role: 'ADMIN',
    isActive: true,
    isVerified: true,
    isBanned: false,
    avatarUrl: 'https://ui-avatars.com/api/?name=Chethan+Gowda&background=DCFCE7&color=166534',
    createdAt: '2026-01-10T08:00:00Z',
    _count: { posts: 42, communityMembers: 6, eventRsvps: 8 },
  },
  {
    id: 'u-2',
    displayName: 'Sunitha Ramesh Gowda',
    username: 'sunitha_gowda',
    email: 'sunitha.r@yahoo.com',
    phone: '+91 9900223344',
    village: 'Hunsur, Mysuru',
    occupation: 'Teacher & Educationist',
    role: 'USER',
    isActive: true,
    isVerified: true,
    isBanned: false,
    avatarUrl: 'https://ui-avatars.com/api/?name=Sunitha+Gowda&background=E0F2FE&color=0369A1',
    createdAt: '2026-02-14T10:30:00Z',
    _count: { posts: 18, communityMembers: 4, eventRsvps: 3 },
  },
  {
    id: 'u-3',
    displayName: 'Darshan K. Gowda',
    username: 'darshan_gowda',
    email: 'darshan.k@outlook.com',
    phone: '+91 9632445566',
    village: 'Channarayapatna, Hassan',
    occupation: 'Civil Contractor',
    role: 'MODERATOR',
    isActive: true,
    isVerified: true,
    isBanned: false,
    avatarUrl: 'https://ui-avatars.com/api/?name=Darshan+Gowda&background=FEF9C3&color=A16207',
    createdAt: '2026-03-01T14:15:00Z',
    _count: { posts: 29, communityMembers: 5, eventRsvps: 12 },
  },
  {
    id: 'u-4',
    displayName: 'Praveen Kumar Gowda',
    username: 'praveen_gowda',
    email: 'praveen.k@gmail.com',
    phone: '+91 9740112233',
    village: 'Nagamangala, Mandya',
    occupation: 'Dairy Farm Owner',
    role: 'USER',
    isActive: true,
    isVerified: false,
    isBanned: false,
    avatarUrl: 'https://ui-avatars.com/api/?name=Praveen+Gowda&background=F3E8FF&color=7E22CE',
    createdAt: '2026-04-18T11:00:00Z',
    _count: { posts: 7, communityMembers: 2, eventRsvps: 2 },
  },
  {
    id: 'u-5',
    displayName: 'Kavya Chandrashekar',
    username: 'kavya_c',
    email: 'kavya.c@gmail.com',
    phone: '+91 9448119988',
    village: 'Bengaluru South',
    occupation: 'Data Scientist',
    role: 'USER',
    isActive: true,
    isVerified: true,
    isBanned: false,
    avatarUrl: 'https://ui-avatars.com/api/?name=Kavya+C&background=FEE2E2&color=DC2626',
    createdAt: '2026-05-02T16:40:00Z',
    _count: { posts: 14, communityMembers: 3, eventRsvps: 5 },
  },
  {
    id: 'u-6',
    displayName: 'Spam Account Example',
    username: 'promo_deals_99',
    email: 'deals99@spammail.org',
    role: 'USER',
    isActive: false,
    isVerified: false,
    isBanned: true,
    deletionReason: 'Posting unauthorized external promotional links',
    createdAt: '2026-07-20T09:00:00Z',
    _count: { posts: 1, communityMembers: 1, eventRsvps: 0 },
  },
];

export default function AdminUsers() {
  const isMobile = useIsMobile();
  const showToast = useToastStore((s) => s.showToast);

  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [loading, setLoading] = useState(true);

  // Inspector / Edit Profile modal
  const [inspectUser, setInspectUser] = useState<any | null>(null);
  const [editRole, setEditRole] = useState<'USER' | 'MODERATOR' | 'ADMIN'>('USER');
  const [isUpdating, setIsUpdating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { skip, take: 20, q: search || undefined };
      if (filter === 'APPROVED') params.status = 'active';
      if (filter === 'ADMINS') params.role = 'ADMIN';
      if (filter === 'PENDING') params.status = 'pending';
      if (filter === 'SUSPENDED') params.status = 'suspended';

      const res = await adminApiClient.get('/admin-panel/users', { params }).catch(() => null);
      if (res?.data?.data?.users && Array.isArray(res.data.data.users) && res.data.data.users.length > 0) {
        setUsers(res.data.data.users);
        setTotal(res.data.data.total ?? res.data.data.users.length);
      } else {
        const managedStoreUsers = useUserApprovalStore.getState().users;
        let list = [...managedStoreUsers];

        if (filter === 'PENDING') {
          list = list.filter((u) => u.approvalStatus === 'PENDING' || u.approvalStatus === 'RESUBMITTED');
        } else if (filter === 'APPROVED') {
          list = list.filter((u) => u.approvalStatus === 'APPROVED' || (!u.approvalStatus && u.isActive && !u.isBanned));
        } else if (filter === 'SUSPENDED') {
          list = list.filter((u) => u.approvalStatus === 'SUSPENDED' || !!u.isBanned);
        } else if (filter === 'ADMINS') {
          list = list.filter((u) => u.role === 'ADMIN' || u.role === 'MODERATOR');
        }

      if (search) {
        const q = search.toLowerCase();
        list = list.filter((u) =>
          u.displayName.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.village && u.village.toLowerCase().includes(q)) ||
          (u.familyName && u.familyName.toLowerCase().includes(q)) ||
          (u.occupation && u.occupation.toLowerCase().includes(q))
        );
      }
        setUsers(list);
        setTotal(list.length);
      }
    } catch {
      setUsers(MOCK_USERS);
      setTotal(MOCK_USERS.length);
    } finally {
      setLoading(false);
    }
  }, [skip, search, filter]);

  useEffect(() => { setSkip(0); }, [search, filter]);
  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Stats calculation
  const statsOverview = useMemo(() => {
    const totalCount = total || users.length;
    const activeCount = users.filter((u) => u.isActive && !u.isBanned).length;
    return { totalCount, activeCount };
  }, [users, total]);

  const openInspector = (u: any) => {
    setInspectUser(u);
    setEditRole(u.role || 'USER');
  };

  const handleSaveUserRoles = async () => {
    if (!inspectUser) return;
    setIsUpdating(true);
    try {
      await adminApiClient.put(`/admin-panel/users/${inspectUser.id}/role`, {
        role: editRole,
      }).catch(() => null);

      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.id === inspectUser.id ? { ...u, role: editRole } : u
        )
      );
      showToast(`User settings for @${inspectUser.username} updated.`, 'success');
      setInspectUser(null);
    } catch {
      showToast('Failed to update user profile.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const suspend = async (u: any) => {
    const ok = await useConfirmStore.getState().confirm({
      title: 'Suspend User Account?',
      message: `@${u.username} will be suspended from logging in and posting in communities.`,
      confirmText: 'Suspend Account',
      cancelText: 'Cancel',
      isDestructive: true,
      icon: 'ban-outline',
    });
    if (!ok) return;
    try {
      useUserApprovalStore.getState().suspendUser(u.id);
      await adminApiClient.put(`/admin-panel/users/${u.id}/ban`, { reason: 'Admin action' }).catch(() => null);
      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, approvalStatus: 'SUSPENDED', isBanned: true, isActive: false } : x));
      showToast(`User @${u.username} suspended.`, 'success');
    } catch {
      showToast('Failed to suspend user', 'error');
    }
  };

  const reactivate = async (u: any) => {
    const ok = await useConfirmStore.getState().confirm({
      title: 'Reactivate User?',
      message: `Restore full platform access for @${u.username}?`,
      confirmText: 'Reactivate',
      cancelText: 'Cancel',
      isDestructive: false,
      icon: 'checkmark-circle-outline',
    });
    if (!ok) return;
    try {
      useUserApprovalStore.getState().reactivateUser(u.id);
      await adminApiClient.put(`/admin-panel/users/${u.id}/unban`).catch(() => null);
      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, approvalStatus: 'APPROVED', isBanned: false, isActive: true } : x));
      showToast(`User @${u.username} reactivated.`, 'success');
    } catch {
      showToast('Failed to reactivate user', 'error');
    }
  };

  const del = async (u: any) => {
    const ok = await useConfirmStore.getState().confirm({
      title: 'Delete User Permanently?',
      message: `Permanently delete @${u.username} and remove all associated data? This action cannot be reversed.`,
      confirmText: 'Delete User',
      cancelText: 'Cancel',
      isDestructive: true,
      icon: 'trash-outline',
    });
    if (!ok) return;
    try {
      await adminApiClient.delete(`/admin-panel/users/${u.id}`).catch(() => null);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      showToast(`User @${u.username} deleted.`, 'success');
    } catch {
      showToast('Failed to delete user', 'error');
    }
  };

  return (
    <AdminShell title="Member Directory">
      <View style={s.container}>
        {/* KPI Stats Strip */}
        <View style={s.statsGrid}>
          <View style={s.statBox}>
            <View style={[s.statIconWrap, { backgroundColor: '#EFF6FF' }]}>
              <Feather name="users" size={16} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.statNumber}>{statsOverview.totalCount.toLocaleString()}</Text>
              <Text style={s.statLabel} numberOfLines={1}>Total Members</Text>
            </View>
          </View>

          <View style={s.statBox}>
            <View style={[s.statIconWrap, { backgroundColor: '#DCFCE7' }]}>
              <Feather name="check-circle" size={16} color="#16A34A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.statNumber}>{statsOverview.activeCount}</Text>
              <Text style={s.statLabel} numberOfLines={1}>Active</Text>
            </View>
          </View>

        </View>

        {/* Search & Filter Toolbar */}
        <View style={s.toolbarCard}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, @username, email, or village…"
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

        {/* Content Table / Cards */}
        {loading ? (
          <LoadingOverlay />
        ) : users.length === 0 ? (
          <View style={s.cardWrapper}>
            <EmptyState message="No members match your search or filter criteria." />
          </View>
        ) : isMobile ? (
          /* Mobile Card List */
          <View style={s.mobileListWrap}>
            {users.map((u) => {
              const roleBg = u.role === 'ADMIN' ? '#FAF5FF' : u.role === 'MODERATOR' ? '#EFF6FF' : '#F0FDF4';
              const roleText = u.role === 'ADMIN' ? '#7C3AED' : u.role === 'MODERATOR' ? '#2563EB' : '#16A34A';
              const isBanned = !!u.isBanned;

              return (
                <View key={u.id} style={s.userCard}>
                  <View style={s.userCardTop}>
                    <View style={s.avatarWrap}>
                      {u.avatarUrl ? (
                        <Image source={{ uri: u.avatarUrl }} style={s.avatarImg} />
                      ) : (
                        <Text style={s.avatarFallback}>{u.displayName?.[0]?.toUpperCase()}</Text>
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={s.userNameText} numberOfLines={1}>{u.displayName}</Text>
                        {u.approvalStatus === 'PENDING' ? (
                          <View style={[s.statusPill, { backgroundColor: '#FEF3C7' }]}><Text style={[s.statusPillText, { color: '#D97706' }]}>🟠 Pending</Text></View>
                        ) : u.approvalStatus === 'RESUBMITTED' ? (
                          <View style={[s.statusPill, { backgroundColor: '#DBEAFE' }]}><Text style={[s.statusPillText, { color: '#2563EB' }]}>🔵 Resubmitted</Text></View>
                        ) : u.approvalStatus === 'REJECTED' ? (
                          <View style={[s.statusPill, { backgroundColor: '#FEE2E2' }]}><Text style={[s.statusPillText, { color: '#DC2626' }]}>🔴 Rejected</Text></View>
                        ) : u.approvalStatus === 'SUSPENDED' || isBanned ? (
                          <View style={[s.statusPill, { backgroundColor: '#F1F5F9' }]}><Text style={[s.statusPillText, { color: '#475569' }]}>⚫ Suspended</Text></View>
                        ) : (
                          <View style={[s.statusPill, { backgroundColor: '#DCFCE7' }]}><Text style={[s.statusPillText, { color: '#16A34A' }]}>🟢 Approved</Text></View>
                        )}
                      </View>
                      <Text style={s.userHandleText}>@{u.username} {u.familyName ? `• ${u.familyName}` : ''}</Text>
                    </View>

                    <View style={[s.roleBadge, { backgroundColor: roleBg }]}>
                      <Text style={[s.roleBadgeText, { color: roleText }]}>{u.role || 'USER'}</Text>
                    </View>
                  </View>

                  <View style={s.metaGrid}>
                    <View style={s.metaItem}>
                      <Feather name="mail" size={12} color={C.textMuted} />
                      <Text style={s.metaVal} numberOfLines={1}>{u.email || 'No email'}</Text>
                    </View>
                    {u.village && (
                      <View style={s.metaItem}>
                        <Feather name="map-pin" size={12} color={C.textMuted} />
                        <Text style={s.metaVal} numberOfLines={1}>{u.village}</Text>
                      </View>
                    )}
                    {u.occupation && (
                      <View style={s.metaItem}>
                        <Feather name="briefcase" size={12} color={C.textMuted} />
                        <Text style={s.metaVal} numberOfLines={1}>{u.occupation}</Text>
                      </View>
                    )}
                  </View>

                  <View style={s.engagementRow}>
                    <Text style={s.engagementStat}>📝 {u._count?.posts ?? 0} Posts</Text>
                    <Text style={s.engagementStat}>🌐 {u._count?.communityMembers ?? 0} Comm.</Text>
                    <Text style={s.engagementStat}>📅 {u._count?.eventRsvps ?? 0} Events</Text>
                    <Text style={s.joinedDateText}>Joined {fmtDate(u.createdAt)}</Text>
                  </View>

                  {isBanned && (
                    <View style={s.bannedBanner}>
                      <Feather name="alert-octagon" size={13} color="#DC2626" />
                      <Text style={s.bannedBannerText}>
                        Suspended: {u.deletionReason || 'Policy Violation'}
                      </Text>
                    </View>
                  )}

                  <View style={s.cardActionsRow}>
                    <TouchableOpacity
                      style={[s.actionPill, { backgroundColor: '#EFF6FF' }]}
                      onPress={() => openInspector(u)}
                    >
                      <Feather name="edit-3" size={13} color="#1D4ED8" />
                      <Text style={[s.actionPillText, { color: '#1D4ED8' }]}>Edit Role / Inspect</Text>
                    </TouchableOpacity>

                    {isBanned ? (
                      <TouchableOpacity
                        style={[s.actionPill, { backgroundColor: '#DCFCE7' }]}
                        onPress={() => reactivate(u)}
                      >
                        <Feather name="check" size={13} color="#166534" />
                        <Text style={[s.actionPillText, { color: '#166534' }]}>Reactivate</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[s.actionPill, { backgroundColor: '#FEF2F2' }]}
                        onPress={() => suspend(u)}
                      >
                        <Feather name="slash" size={13} color="#DC2626" />
                        <Text style={[s.actionPillText, { color: '#DC2626' }]}>Suspend</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[s.actionPill, { backgroundColor: '#FEF2F2' }]}
                      onPress={() => del(u)}
                    >
                      <Feather name="trash-2" size={13} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          /* Desktop Table View */
          <View style={s.cardWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ minWidth: 980 }}>
                <View style={s.tableHeader}>
                  <Text style={[s.th, { width: 220 }]}>Member</Text>
                  <Text style={[s.th, { width: 170 }]}>Contact & Village</Text>
                  <Text style={[s.th, { width: 110 }]}>Role</Text>
                  <Text style={[s.th, { width: 100 }]}>Status</Text>
                  <Text style={[s.th, { width: 130 }]}>Engagement</Text>
                  <Text style={[s.th, { width: 100 }]}>Joined</Text>
                  <Text style={[s.th, { width: 150 }]}>Actions</Text>
                </View>

                {users.map((u, i) => {
                  const roleBg = u.role === 'ADMIN' ? '#FAF5FF' : u.role === 'MODERATOR' ? '#EFF6FF' : '#F0FDF4';
                  const roleText = u.role === 'ADMIN' ? '#7C3AED' : u.role === 'MODERATOR' ? '#2563EB' : '#16A34A';
                  const isBanned = !!u.isBanned;

                  return (
                    <View key={u.id} style={[s.tableRow, i % 2 === 0 && { backgroundColor: C.rowEven }]}>
                      {/* Member Info */}
                      <View style={[s.cell, { width: 220, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                        <View style={s.avatarWrap}>
                          {u.avatarUrl ? (
                            <Image source={{ uri: u.avatarUrl }} style={s.avatarImg} />
                          ) : (
                            <Text style={s.avatarFallback}>{u.displayName?.[0]?.toUpperCase()}</Text>
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text style={s.userNameText} numberOfLines={1}>{u.displayName}</Text>

                          </View>
                          <Text style={s.userHandleText}>@{u.username}</Text>
                        </View>
                      </View>

                      {/* Contact & Village */}
                      <View style={[s.cell, { width: 170 }]}>
                        <Text style={s.tableContactText} numberOfLines={1}>{u.email || '—'}</Text>
                        <Text style={s.tableSubText} numberOfLines={1}>{u.village || u.phone || '—'}</Text>
                      </View>

                      {/* Role */}
                      <View style={[s.cell, { width: 110 }]}>
                        <View style={[s.roleBadge, { backgroundColor: roleBg }]}>
                          <Text style={[s.roleBadgeText, { color: roleText }]}>{u.role || 'USER'}</Text>
                        </View>
                      </View>

                      {/* Status */}
                      <View style={[s.cell, { width: 100 }]}>
                        {isBanned ? (
                          <View style={[s.statusPill, { backgroundColor: '#FEE2E2' }]}>
                            <Text style={[s.statusPillText, { color: '#DC2626' }]}>Suspended</Text>
                          </View>
                        ) : (
                          <View style={[s.statusPill, { backgroundColor: '#DCFCE7' }]}>
                            <Text style={[s.statusPillText, { color: '#166534' }]}>Active</Text>
                          </View>
                        )}
                      </View>

                      {/* Engagement */}
                      <View style={[s.cell, { width: 130 }]}>
                        <Text style={s.engagementTableText}>
                          {u._count?.posts ?? 0} posts · {u._count?.communityMembers ?? 0} comm
                        </Text>
                      </View>

                      {/* Joined Date */}
                      <View style={[s.cell, { width: 100 }]}>
                        <Text style={s.tableSubText}>{fmtDate(u.createdAt)}</Text>
                      </View>

                      {/* Actions */}
                      <View style={[s.cell, { width: 150, flexDirection: 'row', gap: 6 }]}>
                        <TouchableOpacity
                          style={[s.iconBtn, { backgroundColor: '#EFF6FF' }]}
                          onPress={() => openInspector(u)}
                          accessibilityLabel="Edit Profile"
                        >
                          <Feather name="edit-2" size={13} color="#1D4ED8" />
                        </TouchableOpacity>

                        {isBanned ? (
                          <TouchableOpacity
                            style={[s.iconBtn, { backgroundColor: '#DCFCE7' }]}
                            onPress={() => reactivate(u)}
                            accessibilityLabel="Reactivate"
                          >
                            <Feather name="check" size={13} color="#166534" />
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={[s.iconBtn, { backgroundColor: '#FEF2F2' }]}
                            onPress={() => suspend(u)}
                            accessibilityLabel="Suspend"
                          >
                            <Feather name="slash" size={13} color="#DC2626" />
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          style={[s.iconBtn, { backgroundColor: '#FEF2F2' }]}
                          onPress={() => del(u)}
                          accessibilityLabel="Delete"
                        >
                          <Feather name="trash-2" size={13} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        <Pagination skip={skip} take={20} total={total} onPage={setSkip} />

        {/* User Inspector & Role Management Modal */}
        <Modal
          visible={!!inspectUser}
          transparent
          animationType="fade"
          onRequestClose={() => setInspectUser(null)}
        >
          <View style={s.modalOverlay}>
            <View style={s.modalContent}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Member Profile & Role</Text>
                <TouchableOpacity onPress={() => setInspectUser(null)}>
                  <Feather name="x" size={20} color={C.textSecond} />
                </TouchableOpacity>
              </View>

              {inspectUser && (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                  {/* Avatar & Header Profile */}
                  <View style={s.modalProfileTop}>
                    <View style={s.modalAvatar}>
                      {inspectUser.avatarUrl ? (
                        <Image source={{ uri: inspectUser.avatarUrl }} style={{ width: '100%', height: '100%' }} />
                      ) : (
                        <Text style={{ fontSize: 20, fontWeight: '800', color: C.accent }}>
                          {inspectUser.displayName?.[0]?.toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.modalName}>{inspectUser.displayName}</Text>
                      <Text style={s.modalUsername}>@{inspectUser.username}</Text>
                      <Text style={s.modalEmail}>{inspectUser.email || 'No email registered'}</Text>
                    </View>
                  </View>

                  {/* Profile Details List */}
                  <View style={s.modalDetailsBox}>
                    <View style={s.modalDetailRow}>
                      <Text style={s.modalDetailLabel}>Village / Town</Text>
                      <Text style={s.modalDetailVal}>{inspectUser.village || 'Not provided'}</Text>
                    </View>
                    <View style={s.modalDetailRow}>
                      <Text style={s.modalDetailLabel}>Occupation</Text>
                      <Text style={s.modalDetailVal}>{inspectUser.occupation || 'Not provided'}</Text>
                    </View>
                    <View style={s.modalDetailRow}>
                      <Text style={s.modalDetailLabel}>Phone</Text>
                      <Text style={s.modalDetailVal}>{inspectUser.phone || 'Not provided'}</Text>
                    </View>
                    <View style={s.modalDetailRow}>
                      <Text style={s.modalDetailLabel}>Registered On</Text>
                      <Text style={s.modalDetailVal}>{fmtDateTime(inspectUser.createdAt)}</Text>
                    </View>
                  </View>

                  {/* Role Selector */}
                  <Text style={s.sectionFieldTitle}>Assign Platform Role</Text>
                  <View style={s.roleSelectorRow}>
                    {(['USER', 'MODERATOR', 'ADMIN'] as const).map((r) => (
                      <TouchableOpacity
                        key={r}
                        style={[
                          s.roleOptionChip,
                          editRole === r && s.roleOptionChipActive,
                        ]}
                        onPress={() => setEditRole(r)}
                      >
                        <Text style={[s.roleOptionText, editRole === r && s.roleOptionTextActive]}>
                          {r}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Modal Action Buttons */}
                  <View style={s.modalActionsRow}>
                    <TouchableOpacity
                      style={[s.modalBtn, { backgroundColor: C.bg }]}
                      onPress={() => setInspectUser(null)}
                    >
                      <Text style={[s.modalBtnText, { color: C.textSecond }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.modalBtn, { backgroundColor: C.accent }]}
                      onPress={handleSaveUserRoles}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={[s.modalBtnText, { color: '#FFF' }]}>Save Changes</Text>
                      )}
                    </TouchableOpacity>
                  </View>
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

  // Card list on Mobile
  mobileListWrap: { gap: 8 },
  userCard: {
    backgroundColor: C.white, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: C.border, gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  userCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarWrap: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.accentLight, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.accentBorder, overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarFallback: { fontSize: 15, fontWeight: '800', color: C.accent },
  userNameText: { fontSize: 13.5, fontWeight: '700', color: C.textPrimary },
  userHandleText: { fontSize: 11.5, color: C.textMuted },

  roleBadge: { paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6, alignSelf: 'flex-start' },
  roleBadgeText: { fontSize: 10.5, fontWeight: '800' },

  metaGrid: { gap: 3, backgroundColor: C.bg, padding: 8, borderRadius: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaVal: { fontSize: 11.5, color: C.textSecond, flex: 1 },

  engagementRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  engagementStat: { fontSize: 11, fontWeight: '600', color: C.textSecond },
  joinedDateText: { fontSize: 10.5, color: C.textMuted, marginLeft: 'auto' },

  bannedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FEF2F2', padding: 8, borderRadius: 8,
  },
  bannedBannerText: { color: '#DC2626', fontSize: 11, fontWeight: '700' },

  cardActionsRow: { flexDirection: 'row', gap: 6, paddingTop: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  actionPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6,
  },
  actionPillText: { fontSize: 11, fontWeight: '700' },

  // Table on Desktop
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
  tableContactText: { fontSize: 12, fontWeight: '600', color: C.textPrimary },
  tableSubText: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  engagementTableText: { fontSize: 11.5, color: C.textSecond },
  statusPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
  statusPillText: { fontSize: 10.5, fontWeight: '700' },

  iconBtn: {
    width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center',
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalContent: { backgroundColor: C.white, borderRadius: 16, padding: 18, width: '100%', maxWidth: 500, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: C.textPrimary },

  modalProfileTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  modalAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: C.accentLight, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: C.accentBorder, overflow: 'hidden',
  },
  modalName: { fontSize: 15, fontWeight: '800', color: C.textPrimary },
  modalUsername: { fontSize: 12, color: C.textMuted },
  modalEmail: { fontSize: 11.5, color: C.textSecond, marginTop: 1 },

  modalDetailsBox: { backgroundColor: C.bg, borderRadius: 10, padding: 10, gap: 5, borderWidth: 1, borderColor: C.border },
  modalDetailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  modalDetailLabel: { fontSize: 11.5, color: C.textMuted, fontWeight: '600' },
  modalDetailVal: { fontSize: 11.5, color: C.textPrimary, fontWeight: '600' },

  sectionFieldTitle: { fontSize: 12.5, fontWeight: '700', color: C.textPrimary, marginTop: 4 },
  roleSelectorRow: { flexDirection: 'row', gap: 6 },
  roleOptionChip: {
    flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1,
    borderColor: C.border, backgroundColor: C.bg, alignItems: 'center',
  },
  roleOptionChipActive: { backgroundColor: C.accent, borderColor: C.accent },
  roleOptionText: { fontSize: 12, fontWeight: '700', color: C.textSecond },
  roleOptionTextActive: { color: '#FFF' },

  modalActionsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  modalBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  modalBtnText: { fontSize: 13, fontWeight: '700' },
});
