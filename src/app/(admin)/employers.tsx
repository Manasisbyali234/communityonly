import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AdminShell from '../../components/admin/AdminShell';
import { C, SearchBar, EmptyState, LoadingOverlay, useIsMobile } from '../../components/admin/AdminUI';
import { adminApiClient } from '../../api/adminClient';
import { useToastStore } from '../../store/toastStore';
import { useConfirmStore } from '../../store/confirmStore';

export default function AdminEmployers() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [employers, setEmployers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApiClient.get('/jobs/employers');
      setEmployers(res.data?.data ?? res.data ?? []);
    } catch { setEmployers([]); }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const deleteEmployer = async (id: string, name: string) => {
    const ok = await useConfirmStore.getState().confirm({
      title: 'Delete employer?',
      message: `Delete "${name}"? All linked jobs will lose the employer reference.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDestructive: true,
      icon: 'trash-outline',
    });
    if (!ok) return;

    try {
      await adminApiClient.delete(`/jobs/employers/${id}`);
      setEmployers(e => e.filter(x => x.id !== id));
    } catch {
      useToastStore.getState().showToast('Failed to delete employer', 'error');
    }
  };

  const filtered = employers.filter(e =>
    !search ||
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.industry?.toLowerCase().includes(search.toLowerCase()) ||
    e.city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminShell title="Employers">
      <View style={s.toolbar}>
        <View style={{ flex: 1 }}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search employers..." />
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => router.push('/(admin)/add-employer' as any)}>
          <Feather name="plus" size={15} color="#fff" />
          <Text style={s.addBtnText}>Add Employer</Text>
        </TouchableOpacity>
      </View>

      {loading ? <LoadingOverlay /> : filtered.length === 0 ? (
        <View style={s.card}>
          <EmptyState message="No employers yet. Add one to start posting jobs under a company." />
        </View>
      ) : (
        <View style={s.card}>
          {!isMobile && (
            <View style={s.tableHeader}>
              <Text style={[s.th, { flex: 2 }]}>Company</Text>
              <Text style={[s.th, { width: 120 }]}>Industry</Text>
              <Text style={[s.th, { width: 120 }]}>Location</Text>
              <Text style={[s.th, { width: 80 }]}>Jobs</Text>
              <Text style={[s.th, { width: 180 }]}>Actions</Text>
            </View>
          )}
          <ScrollView>
            {filtered.map((emp, i) => {
              if (isMobile) {
                return (
                  <View key={emp.id} style={[s.mobileCard, i % 2 === 0 && { backgroundColor: C.rowEven }]}>
                    <View style={s.mobileTop}>
                      {emp.logoUrl ? (
                        <Image source={{ uri: emp.logoUrl }} style={s.logo} />
                      ) : (
                        <View style={[s.logo, s.logoFallback]}>
                          <Feather name="briefcase" size={16} color={C.accent} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={s.name}>{emp.name}</Text>
                        <Text style={s.sub}>{emp.industry ?? '—'} · {emp.city ?? '—'}</Text>
                      </View>
                      <View style={s.jobCountBadge}>
                        <Text style={s.jobCountText}>{emp.jobCount ?? 0} jobs</Text>
                      </View>
                    </View>
                    <View style={s.mobileActions}>
                      <ActionBtn icon="plus" label="Post Job" onPress={() => router.push({ pathname: '/(admin)/add-job', params: { employerId: emp.id } } as any)} color="#166534" bg="#DCFCE7" />
                      <ActionBtn icon="edit-2" label="Edit" onPress={() => router.push({ pathname: '/(admin)/add-employer', params: { id: emp.id } } as any)} />
                      <ActionBtn icon="trash-2" label="Delete" onPress={() => deleteEmployer(emp.id, emp.name)} color={C.danger} bg={C.danger + '15'} />
                    </View>
                  </View>
                );
              }
              return (
                <View key={emp.id} style={[s.row, i % 2 === 0 && { backgroundColor: C.rowEven }]}>
                  <View style={[s.cell, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                    {emp.logoUrl ? (
                      <Image source={{ uri: emp.logoUrl }} style={s.logo} />
                    ) : (
                      <View style={[s.logo, s.logoFallback]}>
                        <Feather name="briefcase" size={14} color={C.accent} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={s.name} numberOfLines={1}>{emp.name}</Text>
                      {emp.website ? <Text style={s.sub} numberOfLines={1}>{emp.website}</Text> : null}
                    </View>
                  </View>
                  <Text style={[s.cell, { width: 120, fontSize: 12, color: C.textSecond }]} numberOfLines={1}>{emp.industry ?? '—'}</Text>
                  <Text style={[s.cell, { width: 120, fontSize: 12, color: C.textSecond }]} numberOfLines={1}>{[emp.city, emp.state].filter(Boolean).join(', ') || '—'}</Text>
                  <Text style={[s.cell, { width: 80, fontSize: 13, fontWeight: '700', color: C.accent, textAlign: 'center' }]}>{emp.jobCount ?? 0}</Text>
                  <View style={[s.cell, { width: 180, flexDirection: 'row', gap: 4, flexWrap: 'wrap' }]}>
                    <ActionBtn icon="plus" label="Post Job" onPress={() => router.push({ pathname: '/(admin)/add-job', params: { employerId: emp.id } } as any)} color="#166534" bg="#DCFCE7" />
                    <ActionBtn icon="edit-2" label="Edit" onPress={() => router.push({ pathname: '/(admin)/add-employer', params: { id: emp.id } } as any)} />
                    <ActionBtn icon="trash-2" label="Delete" onPress={() => deleteEmployer(emp.id, emp.name)} color={C.danger} bg={C.danger + '15'} />
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}
    </AdminShell>
  );
}

function ActionBtn({ icon, label, onPress, color = C.accent, bg }: { icon: any; label: string; onPress: () => void; color?: string; bg?: string }) {
  return (
    <TouchableOpacity style={[s.actionBtn, { borderColor: color + '50', backgroundColor: bg ?? color + '12' }]} onPress={onPress}>
      <Feather name={icon} size={11} color={color} />
      <Text style={[s.actionBtnText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  toolbar: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 14 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.accent, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  card: { backgroundColor: C.white, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: C.border, marginBottom: 20 },
  tableHeader: { flexDirection: 'row', backgroundColor: C.headerBg, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: C.border },
  th: { fontSize: 11, fontWeight: '700', color: C.textSecond, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  cell: { paddingRight: 8 },
  logo: { width: 36, height: 36, borderRadius: 8, flexShrink: 0 },
  logoFallback: { backgroundColor: C.accentLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.accentBorder },
  name: { fontSize: 13, fontWeight: '700', color: C.textPrimary },
  sub: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  jobCountBadge: { backgroundColor: C.accentLight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  jobCountText: { fontSize: 11, fontWeight: '700', color: C.accent },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 5, borderWidth: 1 },
  actionBtnText: { fontSize: 11, fontWeight: '600' },
  mobileCard: { padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  mobileTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  mobileActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
});
