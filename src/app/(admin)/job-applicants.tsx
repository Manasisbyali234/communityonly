import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
  ScrollView, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import AdminShell from '../../components/admin/AdminShell';
import {
  C, SearchBar, EmptyState, LoadingOverlay,
  Badge, useIsMobile,
} from '../../components/admin/AdminUI';
import { adminApiClient } from '../../api/adminClient';
import { fmtDate } from '../../utils/adminUtils';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  APPLIED:      { bg: '#EFF6FF', text: '#1D4ED8' },
  UNDER_REVIEW: { bg: '#FEF9C3', text: '#92400E' },
  SHORTLISTED:  { bg: '#DCFCE7', text: '#166534' },
  REJECTED:     { bg: '#FEE2E2', text: '#991B1B' },
  SELECTED:     { bg: '#F0FDF4', text: '#15803D' },
};

export default function AdminJobApplicants() {
  const { id: jobId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [data, setData] = useState<{ job: any; applications: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    try {
      const res = await adminApiClient.get(`/jobs/${jobId}/applicants`);
      setData(res.data?.data ?? null);
    } catch {
      Alert.alert('Error', 'Failed to load applicants');
    }
    setLoading(false);
  }, [jobId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const updateStatus = async (applicationId: string, status: string) => {
    try {
      await adminApiClient.patch(`/jobs/applications/${applicationId}/status`, { status });
      setData(prev => prev ? {
        ...prev,
        applications: prev.applications.map(a =>
          a.id === applicationId ? { ...a, status } : a
        ),
      } : prev);
    } catch {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const filtered = (data?.applications ?? []).filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.user?.displayName?.toLowerCase().includes(q) ||
      a.user?.email?.toLowerCase().includes(q)
    );
  });

  return (
    <AdminShell title={data?.job ? `Applicants — ${data.job.jobTitle}` : 'Applicants'}>
      <View style={s.toolbar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={15} color={C.accent} />
          <Text style={s.backBtnText}>Back to Jobs</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search by name or email..." />
        </View>
      </View>

      {data?.job && (
        <View style={s.jobBanner}>
          <Feather name="briefcase" size={14} color={C.accent} />
          <Text style={s.jobBannerText}>
            {data.job.companyName} · {data.job.jobTitle}
          </Text>
          <View style={s.countBadge}>
            <Text style={s.countBadgeText}>{filtered.length} applicant{filtered.length !== 1 ? 's' : ''}</Text>
          </View>
        </View>
      )}

      {loading ? (
        <LoadingOverlay />
      ) : filtered.length === 0 ? (
        <View style={s.card}>
          <EmptyState message="No applicants found for this job." />
        </View>
      ) : (
        <View style={s.card}>
          {!isMobile && (
            <View style={s.tableHeader}>
              <Text style={[s.th, { flex: 2 }]}>Applicant</Text>
              <Text style={[s.th, { flex: 2 }]}>Email</Text>
              <Text style={[s.th, { width: 120 }]}>Status</Text>
              <Text style={[s.th, { width: 140 }]}>Applied At</Text>
              <Text style={[s.th, { width: 120 }]}>Actions</Text>
            </View>
          )}
          <ScrollView>
            {filtered.map((app, i) => {
              const sc = STATUS_COLORS[app.status] ?? STATUS_COLORS.APPLIED;
              if (isMobile) {
                return (
                  <TouchableOpacity
                    key={app.id}
                    style={[s.mobileCard, i % 2 === 0 && { backgroundColor: C.rowEven }]}
                    onPress={() => router.push({ pathname: '/(admin)/job-applicant-detail', params: { applicationId: app.id, jobId } } as any)}
                  >
                    <View style={s.mobileTop}>
                      <View style={s.avatar}>
                        {app.user?.avatarUrl
                          ? <Image source={{ uri: app.user.avatarUrl }} style={s.avatarImg} />
                          : <Text style={s.avatarFallback}>{app.user?.displayName?.[0]?.toUpperCase() ?? '?'}</Text>
                        }
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.name}>{app.user?.displayName ?? '—'}</Text>
                        <Text style={s.email}>{app.user?.email ?? '—'}</Text>
                      </View>
                      <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                        <Text style={[s.statusText, { color: sc.text }]}>{app.status}</Text>
                      </View>
                    </View>
                    <Text style={s.appliedAt}>Applied: {fmtDate(app.appliedAt)}</Text>
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  key={app.id}
                  style={[s.row, i % 2 === 0 && { backgroundColor: C.rowEven }]}
                  onPress={() => router.push({ pathname: '/(admin)/job-applicant-detail', params: { applicationId: app.id, jobId } } as any)}
                >
                  <View style={[s.cell, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                    <View style={s.avatar}>
                      {app.user?.avatarUrl
                        ? <Image source={{ uri: app.user.avatarUrl }} style={s.avatarImg} />
                        : <Text style={s.avatarFallback}>{app.user?.displayName?.[0]?.toUpperCase() ?? '?'}</Text>
                      }
                    </View>
                    <Text style={s.name} numberOfLines={1}>{app.user?.displayName ?? '—'}</Text>
                  </View>
                  <Text style={[s.cell, { flex: 2, fontSize: 12, color: C.textSecond }]} numberOfLines={1}>
                    {app.user?.email ?? '—'}
                  </Text>
                  <View style={[s.cell, { width: 120 }]}>
                    <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                      <Text style={[s.statusText, { color: sc.text }]}>{app.status}</Text>
                    </View>
                  </View>
                  <Text style={[s.cell, { width: 140, fontSize: 12, color: C.textSecond }]}>
                    {fmtDate(app.appliedAt)}
                  </Text>
                  <View style={[s.cell, { width: 120, flexDirection: 'row', gap: 4 }]}>
                    {app.status === 'APPLIED' && (
                      <TouchableOpacity
                        style={[s.actionBtn, { borderColor: C.accent + '40', backgroundColor: C.accent + '12' }]}
                        onPress={() => updateStatus(app.id, 'SHORTLISTED')}
                      >
                        <Feather name="check" size={11} color={C.accent} />
                        <Text style={[s.actionBtnText, { color: C.accent }]}>Shortlist</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[s.actionBtn, { borderColor: C.danger + '40', backgroundColor: C.danger + '12' }]}
                      onPress={() => updateStatus(app.id, 'REJECTED')}
                    >
                      <Feather name="x" size={11} color={C.danger} />
                      <Text style={[s.actionBtnText, { color: C.danger }]}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </AdminShell>
  );
}

const s = StyleSheet.create({
  toolbar: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 14 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8 },
  backBtnText: { color: C.accent, fontWeight: '700', fontSize: 13 },
  jobBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.accentLight, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14,
    borderWidth: 1, borderColor: C.accentBorder,
  },
  jobBannerText: { flex: 1, fontSize: 13, fontWeight: '600', color: C.textPrimary },
  countBadge: { backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  countBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  card: {
    backgroundColor: C.white, borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: C.border, marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row', backgroundColor: C.headerBg,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 2, borderBottomColor: C.border,
  },
  th: { fontSize: 11, fontWeight: '700', color: C.textSecond, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  cell: { paddingRight: 8 },
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.accentLight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImg: { width: 34, height: 34 },
  avatarFallback: { fontSize: 14, fontWeight: '700', color: C.accent },
  name: { fontSize: 13, fontWeight: '700', color: C.textPrimary },
  email: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  statusBadge: { borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start' },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 4, borderRadius: 5, borderWidth: 1,
  },
  actionBtnText: { fontSize: 11, fontWeight: '600' },
  // Mobile
  mobileCard: { padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  mobileTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  appliedAt: { fontSize: 11, color: C.textMuted },
});
