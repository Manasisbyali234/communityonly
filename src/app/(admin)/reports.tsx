import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import AdminShell from '../../components/admin/AdminShell';
import { SearchBar, SectionCard, Skeleton, EmptyState, Pagination, ActionBtn, Badge, TableRow, T, COL, MobileCard, MobileCardRow, useIsMobile } from '../../components/admin/AdminUI';
import { adminApiClient } from '../../api/adminClient';
import { fmtDateTime } from '../../utils/adminUtils';

const STATUS_FILTERS = ['all', 'PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED'];
const COLS: { label: string; style: object }[] = [
  { label: 'Reporter',      style: COL.user },
  { label: 'Reported User', style: COL.user },
  { label: 'Reason',        style: COL.lg   },
  { label: 'Content',       style: COL.xl   },
  { label: 'Date',          style: COL.md   },
  { label: 'Status',        style: COL.sm   },
  { label: 'Actions',       style: COL.act  },
];

export default function AdminReports() {
  const isMobile = useIsMobile();
  const [reports, setReports] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { skip, take: 20, q: q || undefined };
      if (status !== 'all') params.status = status;
      const res = await adminApiClient.get('/admin-panel/reports', { params });
      setReports(res.data.data.reports);
      setTotal(res.data.data.total);
    } catch {}
    setLoading(false);
  }, [skip, q, status]);

  useEffect(() => { setSkip(0); }, [q, status]);
  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const updateStatus = async (id: string, newStatus: string) => {
    await adminApiClient.put(`/admin-panel/reports/${id}`, { status: newStatus });
    load();
  };

  return (
    <AdminShell title="Reports">
      <SectionCard>
        <View style={T.toolbar}>
          <SearchBar value={q} onChangeText={setQ} placeholder="Search reports…" />
          <View style={T.filters}>
            {STATUS_FILTERS.map((f) => (
              <TouchableOpacity key={f} style={[T.filterBtn, status === f && T.filterActive]} onPress={() => setStatus(f)}>
                <Text style={[T.filterText, status === f && T.filterTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {isMobile ? (
          <View style={{ padding: 12 }}>
            {loading ? <Skeleton rows={6} /> : reports.length === 0 ? <EmptyState /> : (
              reports.map((r) => (
                <MobileCard key={r.id}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <View>
                      <Text style={T.cellPrimary}>Reporter: {r.reporter?.username}</Text>
                      <Text style={T.cellSub}>Reported: {r.reportedUser?.username ?? '—'}</Text>
                    </View>
                    <Badge label={r.status} />
                  </View>
                  <MobileCardRow label="Reason"><Text style={T.td}>{r.reason}</Text></MobileCardRow>
                  <MobileCardRow label="Content">
                    <Text style={T.td} numberOfLines={3}>{r.post?.content ?? r.details ?? '—'}</Text>
                  </MobileCardRow>
                  <MobileCardRow label="Date"><Text style={T.tdMuted}>{fmtDateTime(r.createdAt)}</Text></MobileCardRow>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, gap: 4 }}>
                    {r.status === 'PENDING' && (
                      <>
                        <ActionBtn label="Resolve" onPress={() => updateStatus(r.id, 'RESOLVED')} variant="success" />
                        <ActionBtn label="Dismiss" onPress={() => updateStatus(r.id, 'DISMISSED')} />
                      </>
                    )}
                    {r.status !== 'REVIEWED' && (
                      <ActionBtn label="Review" onPress={() => updateStatus(r.id, 'REVIEWED')} />
                    )}
                  </View>
                </MobileCard>
              ))
            )}
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ minWidth: 1020 }}>
              <View style={T.header}>
                {COLS.map((h) => (
                  <Text key={h.label} style={[T.th, h.style]}>{h.label}</Text>
                ))}
              </View>
              {loading ? <Skeleton rows={8} /> : reports.length === 0 ? <EmptyState /> : (
                reports.map((r, i) => (
                  <TableRow key={r.id} even={i % 2 === 0}>
                    <View style={[T.td, COL.user, { flexDirection: 'row', alignItems: 'center' }]}>
                      <View style={T.avatar}>
                        <Text style={T.avatarFallback}>{r.reporter?.username?.[0]?.toUpperCase()}</Text>
                      </View>
                      <Text style={T.cellPrimary} numberOfLines={1}>{r.reporter?.username}</Text>
                    </View>
                    <View style={[T.td, COL.user, { flexDirection: 'row', alignItems: 'center' }]}>
                      <View style={T.avatar}>
                        <Text style={T.avatarFallback}>{r.reportedUser?.username?.[0]?.toUpperCase() ?? '?'}</Text>
                      </View>
                      <Text style={T.cellPrimary} numberOfLines={1}>{r.reportedUser?.username ?? '—'}</Text>
                    </View>
                    <Text style={[T.td, COL.lg]} numberOfLines={1}>{r.reason}</Text>
                    <Text style={[T.td, COL.xl]} numberOfLines={2}>{r.post?.content ?? r.details ?? '—'}</Text>
                    <Text style={[T.tdMuted, COL.md]} numberOfLines={1}>{fmtDateTime(r.createdAt)}</Text>
                    <View style={[T.td, COL.sm]}><Badge label={r.status} /></View>
                    <View style={[T.td, COL.act, { flexDirection: 'row', flexWrap: 'wrap', gap: 4 }]}>
                      {r.status === 'PENDING' && (
                        <>
                          <ActionBtn label="Resolve" onPress={() => updateStatus(r.id, 'RESOLVED')} variant="success" />
                          <ActionBtn label="Dismiss" onPress={() => updateStatus(r.id, 'DISMISSED')} />
                        </>
                      )}
                      {r.status !== 'REVIEWED' && (
                        <ActionBtn label="Review" onPress={() => updateStatus(r.id, 'REVIEWED')} />
                      )}
                    </View>
                  </TableRow>
                ))
              )}
            </View>
          </ScrollView>
        )}
        <Pagination skip={skip} take={20} total={total} onPage={setSkip} />
      </SectionCard>
    </AdminShell>
  );
}
