import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import AdminShell from '../../components/admin/AdminShell';
import { C, SearchBar, EmptyState, LoadingOverlay, useIsMobile } from '../../components/admin/AdminUI';
import { adminApiClient } from '../../api/adminClient';
import { fmtDate } from '../../utils/adminUtils';
import { useToastStore } from '../../store/toastStore';
import { useConfirmStore } from '../../store/confirmStore';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: '#DCFCE7', text: '#166534' },
  CLOSED: { bg: '#FEE2E2', text: '#991B1B' },
  DRAFT:  { bg: '#FEF9C3', text: '#92400E' },
};

const EMP_LABELS: Record<string, string> = {
  FULL_TIME: 'Full Time', PART_TIME: 'Part Time',
  INTERNSHIP: 'Internship', CONTRACT: 'Contract',
};

export default function AdminCompanyJobs() {
  const { employerId, name } = useLocalSearchParams<{ employerId: string; name: string }>();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [jobs, setJobs] = useState<any[]>([]);
  const [employer, setEmployer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const jobsRes = await adminApiClient.get('/jobs/admin/all');
      const all = jobsRes.data?.data ?? jobsRes.data ?? [];

      const filtered = employerId === '__orphan__'
        ? all.filter((j: any) => !j.employerId)
        : all.filter((j: any) => j.employerId === employerId || j.companyName === name);

      setJobs(filtered);

      if (employerId !== '__orphan__') {
        try {
          const empRes = await adminApiClient.get(`/jobs/employers/${employerId}`);
          setEmployer(empRes.data?.data ?? empRes.data);
        } catch {}
      }
    } catch { setJobs([]); }
    setLoading(false);
  }, [employerId, name]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const closeJob = async (id: string) => {
    const ok = await useConfirmStore.getState().confirm({
      title: 'Close job opening?',
      message: 'This job posting will be closed and applicants will no longer be able to apply.',
      confirmText: 'Close Job',
      cancelText: 'Cancel',
      isDestructive: true,
      icon: 'lock-closed-outline',
    });
    if (!ok) return;

    try {
      await adminApiClient.put(`/jobs/${id}`, { status: 'CLOSED' });
      setJobs(j => j.map(x => x.id === id ? { ...x, status: 'CLOSED' } : x));
    } catch {
      useToastStore.getState().showToast('Failed to close job', 'error');
    }
  };

  const deleteJob = async (id: string, title: string) => {
    const ok = await useConfirmStore.getState().confirm({
      title: 'Delete job?',
      message: `Permanently delete "${title}"? This cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDestructive: true,
      icon: 'trash-outline',
    });
    if (!ok) return;

    try {
      await adminApiClient.delete(`/jobs/${id}`);
      setJobs(j => j.filter(x => x.id !== id));
    } catch {
      useToastStore.getState().showToast('Failed to delete job', 'error');
    }
  };

  const filtered = jobs.filter(j =>
    !search ||
    j.jobTitle?.toLowerCase().includes(search.toLowerCase()) ||
    j.location?.toLowerCase().includes(search.toLowerCase())
  );

  const totalApps = filtered.reduce((s, j) => s + (j.applyCount ?? 0), 0);

  return (
    <AdminShell title={name ?? 'Company Jobs'}>
      {/* Back + toolbar */}
      <View style={s.toolbar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={15} color={C.accent} />
          <Text style={s.backBtnText}>Companies</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search jobs..." />
        </View>
        <TouchableOpacity style={s.addBtn}
          onPress={() => router.push({ pathname: '/(admin)/add-job', params: { employerId } } as any)}>
          <Feather name="plus" size={14} color="#fff" />
          <Text style={s.addBtnText}>Post Job</Text>
        </TouchableOpacity>
      </View>

      {/* Company banner */}
      <View style={s.banner}>
        {employer?.logoUrl ? (
          <Image source={{ uri: employer.logoUrl }} style={s.bannerLogo} />
        ) : (
          <View style={[s.bannerLogo, s.bannerLogoFallback]}>
            <Feather name="briefcase" size={18} color={C.accent} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={s.bannerName}>{name}</Text>
          {employer?.industry ? <Text style={s.bannerSub}>{employer.industry}</Text> : null}
        </View>
        <View style={s.bannerStats}>
          <View style={s.bannerStat}>
            <Text style={s.bannerStatVal}>{filtered.length}</Text>
            <Text style={s.bannerStatLabel}>Jobs</Text>
          </View>
          <View style={s.bannerStat}>
            <Text style={[s.bannerStatVal, { color: '#1D4ED8' }]}>{totalApps}</Text>
            <Text style={s.bannerStatLabel}>Applications</Text>
          </View>
        </View>
      </View>

      {loading ? <LoadingOverlay /> : filtered.length === 0 ? (
        <View style={s.card}>
          <EmptyState message={`No jobs posted under ${name} yet.`} />
        </View>
      ) : (
        <View style={s.card}>
          {!isMobile && (
            <View style={s.tableHeader}>
              <Text style={[s.th, { flex: 2 }]}>Job Title</Text>
              <Text style={[s.th, { width: 100 }]}>Type</Text>
              <Text style={[s.th, { width: 110 }]}>Salary</Text>
              <Text style={[s.th, { width: 120 }]}>Location</Text>
              <Text style={[s.th, { width: 70 }]}>Vacancies</Text>
              <Text style={[s.th, { width: 80 }]}>Applied</Text>
              <Text style={[s.th, { width: 80 }]}>Status</Text>
              <Text style={[s.th, { width: 180 }]}>Actions</Text>
            </View>
          )}
          <ScrollView>
            {filtered.map((job, i) => {
              const sc = STATUS_COLORS[job.status] ?? STATUS_COLORS.DRAFT;
              if (isMobile) {
                return (
                  <TouchableOpacity
                    key={job.id}
                    style={[s.mobileCard, i % 2 === 0 && { backgroundColor: C.rowEven }]}
                    onPress={() => router.push({ pathname: '/(admin)/job-applicants', params: { id: job.id } } as any)}
                  >
                    <View style={s.mobileTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.jobTitle} numberOfLines={1}>{job.jobTitle}</Text>
                        <Text style={s.jobMeta}>{EMP_LABELS[job.employmentType] ?? job.employmentType} · {job.location}</Text>
                      </View>
                      <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                        <Text style={[s.statusText, { color: sc.text }]}>{job.status}</Text>
                      </View>
                    </View>
                    <View style={s.mobileRow}>
                      <Text style={s.jobMeta}>💰 {job.salaryLPA}</Text>
                      <Text style={s.jobMeta}>👥 {job.vacancyCount} vacancies</Text>
                      <View style={s.appliedBadge}>
                        <Text style={s.appliedBadgeText}>{job.applyCount} applied</Text>
                      </View>
                    </View>
                    <View style={s.mobileActions}>
                      <ActionBtn icon="users" label={`${job.applyCount} Applicants`} color="#1D4ED8"
                        onPress={() => router.push({ pathname: '/(admin)/job-applicants', params: { id: job.id } } as any)} />
                      <ActionBtn icon="edit-2" label="Edit"
                        onPress={() => router.push({ pathname: '/(admin)/add-job', params: { id: job.id } } as any)} />
                      {job.status === 'ACTIVE' && <ActionBtn icon="x-circle" label="Close" color={C.warn} onPress={() => closeJob(job.id)} />}
                      <ActionBtn icon="trash-2" label="Delete" color={C.danger} onPress={() => deleteJob(job.id, job.jobTitle)} />
                    </View>
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  key={job.id}
                  style={[s.row, i % 2 === 0 && { backgroundColor: C.rowEven }]}
                  onPress={() => router.push({ pathname: '/(admin)/job-applicants', params: { id: job.id } } as any)}
                >
                  <View style={[s.cell, { flex: 2 }]}>
                    <Text style={s.jobTitle} numberOfLines={1}>{job.jobTitle}</Text>
                    <Text style={s.jobMeta} numberOfLines={1}>{fmtDate(job.createdAt)}</Text>
                  </View>
                  <Text style={[s.cell, { width: 100, fontSize: 12, color: C.textSecond }]} numberOfLines={1}>
                    {EMP_LABELS[job.employmentType] ?? job.employmentType}
                  </Text>
                  <Text style={[s.cell, { width: 110, fontSize: 12, color: C.textSecond }]} numberOfLines={1}>{job.salaryLPA}</Text>
                  <Text style={[s.cell, { width: 120, fontSize: 12, color: C.textSecond }]} numberOfLines={1}>{job.location}</Text>
                  <Text style={[s.cell, { width: 70, fontSize: 13, fontWeight: '700', color: C.textPrimary, textAlign: 'center' }]}>{job.vacancyCount}</Text>
                  <View style={[s.cell, { width: 80, alignItems: 'center' }]}>
                    <View style={s.appliedBadge}>
                      <Text style={s.appliedBadgeText}>{job.applyCount}</Text>
                    </View>
                  </View>
                  <View style={[s.cell, { width: 80 }]}>
                    <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                      <Text style={[s.statusText, { color: sc.text }]}>{job.status}</Text>
                    </View>
                  </View>
                  <View style={[s.cell, { width: 180, flexDirection: 'row', gap: 4, flexWrap: 'wrap' }]}>
                    <ActionBtn icon="users" label="Applicants" color="#1D4ED8"
                      onPress={() => router.push({ pathname: '/(admin)/job-applicants', params: { id: job.id } } as any)} />
                    <ActionBtn icon="edit-2" label="Edit"
                      onPress={() => router.push({ pathname: '/(admin)/add-job', params: { id: job.id } } as any)} />
                    {job.status === 'ACTIVE' && <ActionBtn icon="x-circle" label="Close" color={C.warn} onPress={() => closeJob(job.id)} />}
                    <ActionBtn icon="trash-2" label="Delete" color={C.danger} onPress={() => deleteJob(job.id, job.jobTitle)} />
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

function ActionBtn({ icon, label, onPress, color = C.accent }: { icon: any; label: string; onPress: () => void; color?: string }) {
  return (
    <TouchableOpacity style={[s.actionBtn, { borderColor: color + '40', backgroundColor: color + '12' }]} onPress={onPress}>
      <Feather name={icon} size={11} color={color} />
      <Text style={[s.actionBtnText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  toolbar: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 14 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8 },
  backBtnText: { color: C.accent, fontWeight: '700', fontSize: 13 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.accent, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  // Banner
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: C.border },
  bannerLogo: { width: 48, height: 48, borderRadius: 10 },
  bannerLogoFallback: { backgroundColor: C.accentLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.accentBorder },
  bannerName: { fontSize: 15, fontWeight: '800', color: C.textPrimary },
  bannerSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  bannerStats: { flexDirection: 'row', gap: 16 },
  bannerStat: { alignItems: 'center' },
  bannerStatVal: { fontSize: 18, fontWeight: '800', color: C.accent },
  bannerStatLabel: { fontSize: 10, color: C.textMuted, fontWeight: '600' },
  // Table
  card: { backgroundColor: C.white, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: C.border, marginBottom: 20 },
  tableHeader: { flexDirection: 'row', backgroundColor: C.headerBg, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: C.border },
  th: { fontSize: 11, fontWeight: '700', color: C.textSecond, textTransform: 'uppercase', letterSpacing: 0.5, paddingRight: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  cell: { paddingRight: 8 },
  jobTitle: { fontSize: 13, fontWeight: '700', color: C.textPrimary },
  jobMeta: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  statusBadge: { borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start' },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  appliedBadge: { backgroundColor: '#EFF6FF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  appliedBadgeText: { fontSize: 11, fontWeight: '700', color: '#1D4ED8' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 5, borderWidth: 1 },
  actionBtnText: { fontSize: 11, fontWeight: '600' },
  // Mobile
  mobileCard: { padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  mobileTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  mobileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  mobileActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
});
