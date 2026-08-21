import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
  ScrollView, useWindowDimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AdminShell from '../../components/admin/AdminShell';
import { C, SearchBar, EmptyState, LoadingOverlay } from '../../components/admin/AdminUI';
import { adminApiClient } from '../../api/adminClient';

// ── Responsive breakpoints ────────────────────────────────────────────────────
function useBreakpoint() {
  const { width } = useWindowDimensions();
  return {
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    width,
  };
}

// ── Fixed column widths (desktop) — header + row must share these exactly ─────
const COL = {
  company:      { flex: 2, minWidth: 180 },   // logo + name + url
  industry:     { width: 110 },
  location:     { width: 130 },
  totalJobs:    { width: 88 },
  active:       { width: 72 },
  applications: { width: 110 },               // wide enough to never wrap
  actions:      { width: 108 },
} as const;

export default function AdminJobs() {
  const router = useRouter();
  const { isMobile, isTablet, width } = useBreakpoint();
  const [employers, setEmployers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, jobsRes] = await Promise.all([
        adminApiClient.get('/jobs/employers'),
        adminApiClient.get('/jobs/admin/all'),
      ]);
      const emps = empRes.data?.data ?? empRes.data ?? [];
      const jobs = jobsRes.data?.data ?? jobsRes.data ?? [];

      const enriched = emps.map((e: any) => {
        const empJobs = jobs.filter((j: any) => j.employerId === e.id || j.companyName === e.name);
        return {
          ...e,
          jobCount: empJobs.length,
          activeJobs: empJobs.filter((j: any) => j.status === 'ACTIVE').length,
          totalApplications: empJobs.reduce((sum: number, j: any) => sum + (j.applyCount ?? 0), 0),
        };
      });

      const orphanJobs = jobs.filter((j: any) => !j.employerId);
      if (orphanJobs.length > 0) {
        enriched.push({
          id: '__orphan__',
          name: 'Unassigned Jobs',
          logoUrl: null,
          industry: null,
          city: null,
          state: null,
          website: null,
          jobCount: orphanJobs.length,
          activeJobs: orphanJobs.filter((j: any) => j.status === 'ACTIVE').length,
          totalApplications: orphanJobs.reduce((sum: number, j: any) => sum + (j.applyCount ?? 0), 0),
        });
      }

      setEmployers(enriched);
    } catch { setEmployers([]); }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = employers.filter(e =>
    !search ||
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.industry?.toLowerCase().includes(search.toLowerCase()) ||
    e.city?.toLowerCase().includes(search.toLowerCase())
  );

  const goToJobs = (emp: any) =>
    router.push({ pathname: '/(admin)/company-jobs', params: { employerId: emp.id, name: emp.name } } as any);

  return (
    <AdminShell title="Jobs">
      {/* ── Toolbar ── */}
      <View style={[s.toolbar, isMobile && s.toolbarMobile]}>
        <View style={s.searchWrap}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search companies..." />
        </View>
        <View style={[s.btnRow, isMobile && s.btnRowMobile]}>
          <TouchableOpacity style={s.outlineBtn} onPress={() => router.push('/(admin)/employers' as any)}>
            <Feather name="briefcase" size={14} color={C.accent} />
            <Text style={s.outlineBtnText} numberOfLines={1}>Manage Employers</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.addBtn} onPress={() => router.push('/(admin)/add-job' as any)}>
            <Feather name="plus" size={15} color="#fff" />
            <Text style={s.addBtnText}>Post Job</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? <LoadingOverlay /> : filtered.length === 0 ? (
        <View style={s.card}>
          <EmptyState message="No companies found. Add an employer first, then post jobs." />
        </View>
      ) : (
        <View style={s.card}>
          {/* ── Desktop / Tablet table header ── */}
          {!isMobile && (
            <View style={s.tableHeader}>
              <Text style={[s.th, COL.company]}>Company</Text>
              <Text style={[s.th, COL.industry]}>Industry</Text>
              <Text style={[s.th, COL.location]}>Location</Text>
              <Text style={[s.th, COL.totalJobs, s.thCenter]}>Total Jobs</Text>
              <Text style={[s.th, COL.active, s.thCenter]}>Active</Text>
              <Text style={[s.th, COL.applications, s.thCenter]}>Applications</Text>
              <Text style={[s.th, COL.actions]}>Actions</Text>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false}>
            {filtered.map((emp, i) => {
              const isEven = i % 2 === 0;

              /* ── Mobile card ── */
              if (isMobile) {
                return (
                  <TouchableOpacity
                    key={emp.id}
                    style={[s.mobileCard, isEven && s.mobileCardEven]}
                    onPress={() => goToJobs(emp)}
                    activeOpacity={0.75}
                  >
                    {/* Company info row */}
                    <View style={s.mobileHeader}>
                      <CompanyLogo logoUrl={emp.logoUrl} size={40} />
                      <View style={s.mobileNameWrap}>
                        <Text style={s.mobileName} numberOfLines={1}>{emp.name}</Text>
                        {emp.website ? (
                          <Text style={s.mobileUrl} numberOfLines={1}>{emp.website}</Text>
                        ) : (
                          <Text style={s.mobileSubMeta} numberOfLines={1}>
                            {[emp.industry, emp.city].filter(Boolean).join(' · ') || '—'}
                          </Text>
                        )}
                      </View>
                      <Feather name="chevron-right" size={18} color={C.textMuted} style={s.mobileChevron} />
                    </View>

                    {/* Stat boxes */}
                    <View style={s.mobileStats}>
                      <StatBox value={emp.jobCount} label="Total Jobs" color={C.accent} bg={C.accentLight} />
                      <StatBox value={emp.activeJobs} label="Active" color="#166534" bg="#DCFCE7" />
                      <StatBox value={emp.totalApplications} label="Applications" color="#1D4ED8" bg="#EFF6FF" />
                    </View>
                  </TouchableOpacity>
                );
              }

              /* ── Desktop / Tablet row ── */
              return (
                <TouchableOpacity
                  key={emp.id}
                  style={[s.row, isEven && s.rowEven]}
                  onPress={() => goToJobs(emp)}
                  activeOpacity={0.75}
                >
                  {/* COMPANY */}
                  <View style={[s.cell, COL.company, s.companyCell]}>
                    <CompanyLogo logoUrl={emp.logoUrl} size={36} />
                    <View style={s.companyText}>
                      <Text style={s.name} numberOfLines={1}>{emp.name}</Text>
                      {emp.website ? (
                        <Text style={s.sub} numberOfLines={1}>{emp.website}</Text>
                      ) : null}
                    </View>
                  </View>

                  {/* INDUSTRY */}
                  <Text style={[s.cell, COL.industry, s.tdMuted]} numberOfLines={1}>
                    {emp.industry ?? '—'}
                  </Text>

                  {/* LOCATION */}
                  <Text style={[s.cell, COL.location, s.tdMuted]} numberOfLines={1}>
                    {[emp.city, emp.state].filter(Boolean).join(', ') || '—'}
                  </Text>

                  {/* TOTAL JOBS */}
                  <Text style={[s.cell, COL.totalJobs, s.tdCenter, s.tdBold, { color: C.textPrimary }]}>
                    {emp.jobCount}
                  </Text>

                  {/* ACTIVE */}
                  <View style={[s.cell, COL.active, s.tdCenterWrap]}>
                    <View style={s.activeBadge}>
                      <Text style={s.activeBadgeText}>{emp.activeJobs}</Text>
                    </View>
                  </View>

                  {/* APPLICATIONS */}
                  <Text style={[s.cell, COL.applications, s.tdCenter, s.tdBold, { color: '#1D4ED8' }]}>
                    {emp.totalApplications}
                  </Text>

                  {/* ACTIONS */}
                  <View style={[s.cell, COL.actions, s.actionsCell]}>
                    <TouchableOpacity style={s.viewBtn} onPress={() => goToJobs(emp)}>
                      <Text style={s.viewBtnText}>View Jobs</Text>
                      <Feather name="chevron-right" size={12} color={C.accent} />
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

// ── Company Logo ──────────────────────────────────────────────────────────────
function CompanyLogo({ logoUrl, size }: { logoUrl: string | null; size: number }) {
  const radius = Math.round(size * 0.22);
  if (logoUrl) {
    return <Image source={{ uri: logoUrl }} resizeMode="contain" style={{ width: size, height: size, borderRadius: radius, flexShrink: 0, backgroundColor: C.white }} />;
  }
  return (
    <View style={[
      { width: size, height: size, borderRadius: radius, flexShrink: 0 },
      s.logoFallback,
    ]}>
      <Feather name="briefcase" size={Math.round(size * 0.42)} color={C.accent} />
    </View>
  );
}

// ── Mobile Stat Box ───────────────────────────────────────────────────────────
function StatBox({ value, label, color, bg }: { value: number; label: string; color: string; bg: string }) {
  return (
    <View style={[s.statBox, { backgroundColor: bg }]}>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={[s.statLabel, { color }]}>{label}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Toolbar
  toolbar: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginBottom: 14,
    flexWrap: 'nowrap',
  },
  toolbarMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
  },
  searchWrap: { flex: 1, minWidth: 0 },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    flexShrink: 0,
  },
  btnRowMobile: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    flexShrink: 0,
  },

  // Buttons
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    flexShrink: 0,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.accent,
    backgroundColor: C.bg,
    flexShrink: 1,
    minWidth: 0,
  },
  outlineBtnText: { color: C.accent, fontWeight: '700', fontSize: 13, flexShrink: 1 },

  // Card container
  card: {
    backgroundColor: C.white,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 20,
  },

  // Desktop table header
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.headerBg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: C.border,
  },
  th: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textSecond,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingRight: 8,
  },
  thCenter: { textAlign: 'center' },

  // Desktop row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.white,
  },
  rowEven: { backgroundColor: C.rowEven },

  // Desktop cells
  cell: { paddingRight: 8 },
  companyCell: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  companyText: { flex: 1, minWidth: 0 },
  tdMuted: { fontSize: 12, color: C.textSecond },
  tdCenter: { textAlign: 'center' },
  tdCenterWrap: { alignItems: 'center', justifyContent: 'center' },
  tdBold: { fontSize: 13, fontWeight: '700' },
  actionsCell: { alignItems: 'flex-start', justifyContent: 'center' },

  // Logo fallback
  logoFallback: {
    backgroundColor: C.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.accentBorder,
  },

  // Text
  name: { fontSize: 13, fontWeight: '700', color: C.textPrimary },
  sub: { fontSize: 11, color: C.textMuted, marginTop: 1 },

  // Active badge
  activeBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'center',
  },
  activeBadgeText: { fontSize: 12, fontWeight: '700', color: '#166534' },

  // View Jobs button
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: C.accentLight,
    borderWidth: 1,
    borderColor: C.accentBorder,
    alignSelf: 'flex-start',
  },
  viewBtnText: { fontSize: 12, fontWeight: '700', color: C.accent },

  // ── Mobile card ──────────────────────────────────────────────────────────
  mobileCard: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.white,
  },
  mobileCardEven: { backgroundColor: C.rowEven },

  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  mobileNameWrap: { flex: 1, minWidth: 0 },
  mobileName: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  mobileUrl: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  mobileSubMeta: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  mobileChevron: { flexShrink: 0, marginLeft: 4 },

  // Mobile stat boxes — three equal-width boxes in a row
  mobileStats: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 8,
    minWidth: 0,
  },
  statValue: { fontSize: 16, fontWeight: '800', lineHeight: 20 },
  statLabel: { fontSize: 10, fontWeight: '600', marginTop: 2, textAlign: 'center', opacity: 0.85 },
});
