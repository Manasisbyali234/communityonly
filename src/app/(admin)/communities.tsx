import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Image, ScrollView, Alert, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import AdminShell from '../../components/admin/AdminShell';
import { SearchBar, SectionCard, Skeleton, EmptyState, Pagination, ActionBtn, TableRow, T, COL, MobileCard, MobileCardRow, useIsMobile } from '../../components/admin/AdminUI';
import { adminApiClient } from '../../api/adminClient';
import { fmtDate } from '../../utils/adminUtils';
import { useToastStore } from '../../store/toastStore';
import { useConfirmStore } from '../../store/confirmStore';

const COLS_ALL: { label: string; style: object }[] = [
  { label: 'Community', style: COL.user },
  { label: 'Category',  style: COL.sm   },
  { label: 'Creator',   style: COL.lg   },
  { label: 'Members',   style: COL.xs   },
  { label: 'Posts',     style: COL.xs   },
  { label: 'Type',      style: COL.sm   },
  { label: 'Status',    style: COL.sm   },
  { label: 'Created',   style: COL.md   },
  { label: 'Actions',   style: COL.act  },
];

const COLS_PENDING: { label: string; style: object }[] = [
  { label: 'Community', style: COL.user },
  { label: 'Category',  style: COL.sm   },
  { label: 'Creator',   style: COL.lg   },
  { label: 'Type',      style: COL.sm   },
  { label: 'Submitted', style: COL.md   },
  { label: 'Actions',   style: COL.act  },
];

const STATUS_COLORS: Record<string, string> = {
  APPROVED: '#22c55e',
  PENDING: '#f59e0b',
  REJECTED: '#ef4444',
};

export default function AdminCommunities() {
  const isMobile = useIsMobile();
  const showToast = useToastStore((s) => s.showToast);
  const [tab, setTab] = useState<'pending' | 'approved'>('pending');

  // All communities state
  const [communities, setCommunities] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  // Pending state
  const [pending, setPending] = useState<any[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApiClient.get('/admin-panel/communities', {
        params: { skip, take: 20, q: q || undefined, status: 'APPROVED' },
      });
      setCommunities(res.data.data.communities);
      setTotal(res.data.data.total);
    } catch {}
    setLoading(false);
  }, [skip, q]);

  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const res = await adminApiClient.get('/admin-panel/communities/pending');
      setPending(res.data.data.communities);
    } catch {}
    setPendingLoading(false);
  }, []);

  useEffect(() => { setSkip(0); }, [q]);
  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { loadPending(); }, [loadPending]);
  useFocusEffect(useCallback(() => { loadAll(); loadPending(); }, [loadAll, loadPending]));

  const del = async (id: string) => {
    const ok = await useConfirmStore.getState().confirm({
      title: 'Delete community?',
      message: 'This will permanently delete this community and its posts.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDestructive: true,
      icon: 'trash-outline',
    });
    if (!ok) return;
    try {
      await adminApiClient.delete(`/admin-panel/communities/${id}`);
      loadAll(); loadPending();
    } catch (e: any) {
      useToastStore.getState().showToast(e?.response?.data?.message ?? 'Failed to delete community', 'error');
    }
  };

  const approve = async (id: string) => {
    const ok = await useConfirmStore.getState().confirm({
      title: 'Approve community?',
      message: 'This community will be approved and visible to all members.',
      confirmText: 'Approve',
      cancelText: 'Cancel',
      isDestructive: false,
      icon: 'checkmark-circle-outline',
    });
    if (!ok) return;
    try {
      await adminApiClient.put(`/admin-panel/communities/${id}/approve`);
      loadPending(); loadAll();
    } catch (e: any) {
      useToastStore.getState().showToast(e?.response?.data?.message ?? 'Failed to approve community', 'error');
    }
  };

  const reject = async (id: string) => {
    const ok = await useConfirmStore.getState().confirm({
      title: 'Reject community?',
      message: 'This community creation request will be rejected.',
      confirmText: 'Reject',
      cancelText: 'Cancel',
      isDestructive: true,
      icon: 'close-circle-outline',
    });
    if (!ok) return;
    try {
      await adminApiClient.put(`/admin-panel/communities/${id}/reject`);
      loadPending(); loadAll();
    } catch (e: any) {
      useToastStore.getState().showToast(e?.response?.data?.message ?? 'Failed to reject community', 'error');
    }
  };

  const tabStyle = (active: boolean) => ({
    paddingHorizontal: 18, paddingVertical: 10, marginRight: 8,
    borderRadius: 8, backgroundColor: active ? '#6366f1' : 'transparent',
    borderWidth: 1, borderColor: active ? '#6366f1' : '#e5e7eb',
  });
  const tabTextStyle = (active: boolean) => ({ color: active ? '#fff' : '#6b7280', fontWeight: '600' as const, fontSize: 14 });

  return (
    <AdminShell title="Communities">
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
        <View style={tabStyle(tab === 'pending')}>
          <Text style={tabTextStyle(tab === 'pending')} onPress={() => setTab('pending')}>
            Pending Approvals {pending.length > 0 ? `(${pending.length})` : ''}
          </Text>
        </View>
        <View style={tabStyle(tab === 'approved')}>
          <Text style={tabTextStyle(tab === 'approved')} onPress={() => setTab('approved')}>Approved Communities</Text>
        </View>
      </View>

      {tab === 'pending' && (
        <SectionCard>
          {isMobile ? (
            <View style={{ padding: 12 }}>
              {pendingLoading ? <Skeleton rows={4} /> : pending.length === 0 ? (
                <EmptyState />
              ) : (
                pending.map((c) => (
                  <MobileCard key={c.id}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                      <View style={[T.avatar, { borderRadius: 8 }]}>
                        {c.avatarUrl
                          ? <Image source={{ uri: c.avatarUrl }} style={T.avatarImg} />
                          : <Text style={T.avatarFallback}>{c.name?.[0]?.toUpperCase()}</Text>
                        }
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={T.cellPrimary}>{c.name}</Text>
                        <Text style={T.cellSub}>/{c.slug}</Text>
                      </View>
                    </View>
                    <MobileCardRow label="Category"><Text style={T.td}>{c.category}</Text></MobileCardRow>
                    <MobileCardRow label="Creator"><Text style={T.td}>{c.members?.[0]?.user?.displayName ?? '—'}</Text></MobileCardRow>
                    <MobileCardRow label="Creator Email"><Text style={T.td}>{c.members?.[0]?.user?.email ?? '—'}</Text></MobileCardRow>
                    <MobileCardRow label="Type"><Text style={T.td}>{c.isPrivate ? '🔒 Private' : '🌐 Public'}</Text></MobileCardRow>
                    {!!c.description && <MobileCardRow label="Description"><Text style={T.td}>{c.description}</Text></MobileCardRow>}
                    <MobileCardRow label="Submitted"><Text style={T.tdMuted}>{fmtDate(c.createdAt)}</Text></MobileCardRow>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <ActionBtn label="✅ Approve" onPress={() => approve(c.id)} variant="success" />
                      <ActionBtn label="❌ Reject" onPress={() => reject(c.id)} variant="danger" />
                    </View>
                  </MobileCard>
                ))
              )}
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ minWidth: 860 }}>
                <View style={T.header}>
                  {COLS_PENDING.map((h) => (
                    <Text key={h.label} style={[T.th, h.style]}>{h.label}</Text>
                  ))}
                </View>
                {pendingLoading ? <Skeleton rows={6} /> : pending.length === 0 ? <EmptyState /> : (
                  pending.map((c, i) => (
                    <TableRow key={c.id} even={i % 2 === 0}>
                      <View style={[T.td, COL.user, { flexDirection: 'row', alignItems: 'center' }]}>
                        <View style={[T.avatar, { borderRadius: 8 }]}>
                          {c.avatarUrl
                            ? <Image source={{ uri: c.avatarUrl }} style={T.avatarImg} />
                            : <Text style={T.avatarFallback}>{c.name?.[0]?.toUpperCase()}</Text>
                          }
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={T.cellPrimary} numberOfLines={1}>{c.name}</Text>
                          <Text style={T.cellSub} numberOfLines={1}>/{c.slug}</Text>
                          {!!c.description && <Text style={[T.cellSub, { marginTop: 2 }]} numberOfLines={2}>{c.description}</Text>}
                        </View>
                      </View>
                      <Text style={[T.td, COL.sm]} numberOfLines={1}>{c.category}</Text>
                      <View style={[T.td, COL.lg]}>
                        <Text style={T.cellPrimary} numberOfLines={1}>{c.members?.[0]?.user?.displayName ?? '—'}</Text>
                        <Text style={T.cellSub} numberOfLines={1}>{c.members?.[0]?.user?.email ?? ''}</Text>
                      </View>
                      <Text style={[T.td, COL.sm]}>{c.isPrivate ? '🔒 Private' : '🌐 Public'}</Text>
                      <Text style={[T.tdMuted, COL.md]} numberOfLines={1}>{fmtDate(c.createdAt)}</Text>
                      <View style={[T.td, COL.act, { flexDirection: 'row', gap: 6 }]}>
                        <ActionBtn label="Approve" onPress={() => approve(c.id)} variant="success" />
                        <ActionBtn label="Reject" onPress={() => reject(c.id)} variant="danger" />
                      </View>
                    </TableRow>
                  ))
                )}
              </View>
            </ScrollView>
          )}
        </SectionCard>
      )}

      {tab === 'approved' && (
        <SectionCard>
          <View style={T.toolbar}>
            <SearchBar value={q} onChangeText={setQ} placeholder="Search communities…" />
          </View>

          {isMobile ? (
            <View style={{ padding: 12 }}>
              {loading ? <Skeleton rows={6} /> : communities.length === 0 ? <EmptyState /> : (
                communities.map((c) => (
                  <MobileCard key={c.id}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                      <View style={[T.avatar, { borderRadius: 8 }]}>
                        {c.avatarUrl
                          ? <Image source={{ uri: c.avatarUrl }} style={T.avatarImg} />
                          : <Text style={T.avatarFallback}>{c.name?.[0]?.toUpperCase()}</Text>
                        }
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={T.cellPrimary}>{c.name}</Text>
                        <Text style={T.cellSub}>/{c.slug}</Text>
                      </View>
                      <Text style={T.tdMuted}>{c.isPrivate ? '🔒' : '🌐'}</Text>
                    </View>
                    <MobileCardRow label="Category"><Text style={T.td}>{c.category}</Text></MobileCardRow>
                    <MobileCardRow label="Creator"><Text style={T.td}>{c.members?.[0]?.user?.displayName ?? '—'}</Text></MobileCardRow>
                    <MobileCardRow label="Members / Posts">
                      <Text style={T.td}>{c.memberCount} members · {c._count?.posts ?? 0} posts</Text>
                    </MobileCardRow>
                    <MobileCardRow label="Status">
                      <Text style={[T.td, { color: STATUS_COLORS[c.status] ?? '#6b7280', fontWeight: '700' }]}>{c.status}</Text>
                    </MobileCardRow>
                    <MobileCardRow label="Created"><Text style={T.tdMuted}>{fmtDate(c.createdAt)}</Text></MobileCardRow>
                    <View style={{ marginTop: 6 }}>
                      <ActionBtn label="Delete" onPress={() => del(c.id)} variant="danger" />
                    </View>
                  </MobileCard>
                ))
              )}
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ minWidth: 980 }}>
                <View style={T.header}>
                  {COLS_ALL.map((h) => (
                    <Text key={h.label} style={[T.th, h.style]}>{h.label}</Text>
                  ))}
                </View>
                {loading ? <Skeleton rows={8} /> : communities.length === 0 ? <EmptyState /> : (
                  communities.map((c, i) => (
                    <TableRow key={c.id} even={i % 2 === 0}>
                      <View style={[T.td, COL.user, { flexDirection: 'row', alignItems: 'center' }]}>
                        <View style={[T.avatar, { borderRadius: 8 }]}>
                          {c.avatarUrl
                            ? <Image source={{ uri: c.avatarUrl }} style={T.avatarImg} />
                            : <Text style={T.avatarFallback}>{c.name?.[0]?.toUpperCase()}</Text>
                          }
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={T.cellPrimary} numberOfLines={1}>{c.name}</Text>
                          <Text style={T.cellSub} numberOfLines={1}>/{c.slug}</Text>
                        </View>
                      </View>
                      <Text style={[T.td, COL.sm]} numberOfLines={1}>{c.category}</Text>
                      <Text style={[T.td, COL.lg]} numberOfLines={1}>{c.members?.[0]?.user?.displayName ?? '—'}</Text>
                      <Text style={[T.td, COL.xs]}>{c.memberCount}</Text>
                      <Text style={[T.td, COL.xs]}>{c._count?.posts ?? 0}</Text>
                      <Text style={[T.td, COL.sm]}>{c.isPrivate ? '🔒 Private' : '🌐 Public'}</Text>
                      <Text style={[T.td, COL.sm, { color: STATUS_COLORS[c.status] ?? '#6b7280', fontWeight: '700' }]}>{c.status}</Text>
                      <Text style={[T.tdMuted, COL.md]} numberOfLines={1}>{fmtDate(c.createdAt)}</Text>
                      <View style={[T.td, COL.act]}>
                        <ActionBtn label="Delete" onPress={() => del(c.id)} variant="danger" />
                      </View>
                    </TableRow>
                  ))
                )}
              </View>
            </ScrollView>
          )}
          <Pagination skip={skip} take={20} total={total} onPage={setSkip} />
        </SectionCard>
      )}
    </AdminShell>
  );
}
