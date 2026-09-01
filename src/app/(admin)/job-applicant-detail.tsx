import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
  ScrollView, Alert, Linking, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import AdminShell from '../../components/admin/AdminShell';
import { C, LoadingOverlay } from '../../components/admin/AdminUI';
import { adminApiClient } from '../../api/adminClient';
import { fmtDate } from '../../utils/adminUtils';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  APPLIED:      { bg: '#EFF6FF', text: '#1D4ED8' },
  UNDER_REVIEW: { bg: '#FEF9C3', text: '#92400E' },
  SHORTLISTED:  { bg: '#DCFCE7', text: '#166534' },
  REJECTED:     { bg: '#FEE2E2', text: '#991B1B' },
  SELECTED:     { bg: '#F0FDF4', text: '#15803D' },
};

const STATUS_OPTIONS = ['APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'REJECTED', 'SELECTED'];

export default function AdminJobApplicantDetail() {
  const { applicationId, jobId } = useLocalSearchParams<{ applicationId: string; jobId: string }>();
  const router = useRouter();
  const [data, setData] = useState<{ job: any; applications: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    try {
      const res = await adminApiClient.get(`/jobs/${jobId}/applicants`);
      setData(res.data?.data ?? null);
    } catch {
      Alert.alert('Error', 'Failed to load applicant details');
    }
    setLoading(false);
  }, [jobId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const application = data?.applications.find(a => a.id === applicationId);
  const job = data?.job;

  const updateStatus = async (status: string) => {
    try {
      await adminApiClient.patch(`/jobs/applications/${applicationId}/status`, { status });
      setData(prev => prev ? {
        ...prev,
        applications: prev.applications.map(a =>
          a.id === applicationId ? { ...a, status } : a
        ),
      } : prev);
      Alert.alert('Updated', `Status changed to ${status}`);
    } catch {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  if (loading) return <AdminShell title="Applicant Detail"><LoadingOverlay /></AdminShell>;

  if (!application) {
    return (
      <AdminShell title="Applicant Detail">
        <View style={s.center}>
          <Text style={{ color: C.textMuted }}>Applicant not found</Text>
        </View>
      </AdminShell>
    );
  }

  const sc = STATUS_COLORS[application.status] ?? STATUS_COLORS.APPLIED;
  const user = application.user ?? {};

  return (
    <AdminShell title="Applicant Detail">
      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
        <Feather name="arrow-left" size={15} color={C.accent} />
        <Text style={s.backBtnText}>Back to Applicants</Text>
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* User card */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Applicant Details</Text>
          <View style={s.userRow}>
            <View style={s.avatar}>
              {user.avatarUrl
                ? <Image source={{ uri: user.avatarUrl }} style={s.avatarImg} />
                : <Text style={s.avatarFallback}>{user.displayName?.[0]?.toUpperCase() ?? '?'}</Text>
              }
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.userName}>{user.displayName ?? '—'}</Text>
              <Text style={s.userEmail}>{user.email ?? '—'}</Text>
            </View>
            <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
              <Text style={[s.statusText, { color: sc.text }]}>{application.status}</Text>
            </View>
          </View>
          <DetailRow label="Phone" value={user.phone ?? '—'} />
          <DetailRow label="Occupation" value={user.occupation ?? '—'} />
          <DetailRow label="Village / Location" value={user.village ?? '—'} />
        </View>

        {/* Job card */}
        {job && (
          <View style={s.card}>
            <Text style={s.sectionTitle}>Job Details</Text>
            <DetailRow label="Job Title" value={job.jobTitle} />
            <DetailRow label="Company" value={job.companyName} />
          </View>
        )}

        {/* Resume card */}
        {application.resumeUrl && (
          <View style={s.card}>
            <Text style={s.sectionTitle}>Resume</Text>
            <TouchableOpacity
              style={s.resumeBtn}
              onPress={() => {
                const url = application.resumeUrl;
                if (Platform.OS === 'web') {
                  window.open(url, '_blank');
                } else {
                  Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open resume'));
                }
              }}
            >
              <Feather name="file-text" size={18} color={C.accent} />
              <View style={{ flex: 1 }}>
                <Text style={s.resumeTitle}>View Resume</Text>
                <Text style={s.resumeUrl} numberOfLines={1}>
                  {application.resumeUrl.split('/').pop() ?? 'resume'}
                </Text>
              </View>
              <Feather name="external-link" size={15} color={C.accent} />
            </TouchableOpacity>
          </View>
        )}

        {/* Application card */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Application Info</Text>
          <DetailRow label="Applied At" value={fmtDate(application.appliedAt)} />
          <DetailRow label="Last Updated" value={fmtDate(application.updatedAt)} />
          <DetailRow label="Current Status" value={application.status} />
        </View>

        {/* Status update */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Update Status</Text>
          <View style={s.statusGrid}>
            {STATUS_OPTIONS.map(opt => {
              const oc = STATUS_COLORS[opt] ?? STATUS_COLORS.APPLIED;
              const isActive = application.status === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[s.statusOption, { backgroundColor: oc.bg, borderColor: isActive ? oc.text : 'transparent', borderWidth: isActive ? 2 : 1 }]}
                  onPress={() => !isActive && updateStatus(opt)}
                >
                  {isActive && <Feather name="check" size={12} color={oc.text} />}
                  <Text style={[s.statusOptionText, { color: oc.text }]}>{opt.replace('_', ' ')}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </AdminShell>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, marginBottom: 14 },
  backBtnText: { color: C.accent, fontWeight: '700', fontSize: 13 },
  card: {
    backgroundColor: C.white, borderRadius: 12,
    borderWidth: 1, borderColor: C.border,
    padding: 16, marginBottom: 14,
  },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: C.textPrimary, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: C.accentLight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImg: { width: 48, height: 48 },
  avatarFallback: { fontSize: 18, fontWeight: '700', color: C.accent },
  userName: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  userEmail: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 9, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  detailLabel: { fontSize: 12, color: C.textSecond, fontWeight: '600' },
  detailValue: { fontSize: 13, color: C.textPrimary, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusOption: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
  },
  statusOptionText: { fontSize: 12, fontWeight: '700' },
  resumeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 10, borderWidth: 1.5,
    borderColor: C.accent, backgroundColor: C.accentLight,
  },
  resumeTitle: { fontSize: 13, fontWeight: '700', color: C.accent },
  resumeUrl: { fontSize: 11, color: C.textMuted, marginTop: 2 },
});
