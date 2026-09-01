import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator, Platform, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMyJobApplicationsQuery, JobApplication } from '../../api/jobs';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  APPLIED:      { label: 'Applied',      bg: '#EFF6FF', text: '#1D4ED8', icon: 'send-outline' },
  UNDER_REVIEW: { label: 'Under Review', bg: '#FEF9C3', text: '#92400E', icon: 'eye-outline' },
  SHORTLISTED:  { label: 'Shortlisted',  bg: '#F0FDF4', text: '#166534', icon: 'star-outline' },
  REJECTED:     { label: 'Rejected',     bg: '#FEF2F2', text: '#991B1B', icon: 'close-circle-outline' },
  SELECTED:     { label: 'Selected',     bg: '#F0FDF4', text: '#15803D', icon: 'checkmark-circle-outline' },
};

export default function MyJobApplicationsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: applications = [], isLoading } = useMyJobApplicationsQuery();

  const stats = {
    total: applications.length,
    underReview: applications.filter(a => a.status === 'UNDER_REVIEW').length,
    shortlisted: applications.filter(a => a.status === 'SHORTLISTED').length,
    selected: applications.filter(a => a.status === 'SELECTED').length,
  };

  return (
    <View style={[s.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/jobs' as any))} style={s.backBtn} accessibilityLabel="Go back to hiring companies">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.text }]}>My Job Applications</Text>
          <Text style={[s.headerSub, { color: colors.textMuted }]}>
            {applications.length} application{applications.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Stats bar */}
      {!isLoading && applications.length > 0 && (
        <View style={[s.statsBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <StatBox label="Total" value={stats.total} color={colors.primary} colors={colors} />
          <StatBox label="Under Review" value={stats.underReview} color="#92400E" colors={colors} />
          <StatBox label="Shortlisted" value={stats.shortlisted} color="#166534" colors={colors} />
          <StatBox label="Selected" value={stats.selected} color="#15803D" colors={colors} />
        </View>
      )}

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : applications.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="briefcase-outline" size={52} color={colors.textMuted} />
          <Text style={[s.emptyTitle, { color: colors.text }]}>No applications yet</Text>
          <Text style={[s.emptyText, { color: colors.textMuted }]}>Browse jobs and apply to get started</Text>
          <TouchableOpacity style={[s.browseBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/jobs' as any)}>
            <Text style={s.browseBtnText}>Browse Jobs</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
          {applications.map(app => (
            <AppCard
              key={app.id}
              app={app}
              colors={colors}
              onPress={() => router.push({ pathname: '/jobs/[id]', params: { id: app.jobId, from: 'my-applications' } } as any)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function StatBox({ label, value, color, colors }: { label: string; value: number; color: string; colors: any }) {
  return (
    <View style={[s.statBox, { borderColor: colors.border }]}>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={[s.statLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function AppCard({ app, colors, onPress }: { app: JobApplication; colors: any; onPress: () => void }) {
  const sc = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.APPLIED;
  const job = app.job;
  return (
    <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={s.cardTop}>
        {job?.companyLogo ? (
          <Image source={{ uri: job.companyLogo }} style={s.logo} contentFit="contain" />
        ) : (
          <View style={[s.logo, s.logoFallback, { backgroundColor: colors.primaryContainer }]}>
            <Ionicons name="briefcase" size={20} color={colors.primary} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[s.jobTitle, { color: colors.text }]} numberOfLines={1}>{job?.jobTitle ?? 'Job'}</Text>
          <Text style={[s.companyName, { color: colors.textSecondary }]} numberOfLines={1}>{job?.companyName ?? ''}</Text>
        </View>
        <View style={[s.badge, { backgroundColor: sc.bg }]}>
          <Ionicons name={sc.icon} size={11} color={sc.text} />
          <Text style={[s.badgeText, { color: sc.text }]}>{sc.label}</Text>
        </View>
      </View>

      <View style={s.metaRow}>
        {job?.location && <MetaItem icon="location-outline" text={job.location} color={colors.textMuted} />}
        {job?.salaryLPA && <MetaItem icon="cash-outline" text={job.salaryLPA} color={colors.textMuted} />}
        <MetaItem icon="calendar-outline"
          text={`Applied ${new Date(app.appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
          color={colors.textMuted} />
      </View>

      <TouchableOpacity style={[s.viewBtn, { borderColor: colors.border }]} onPress={onPress}>
        <Text style={[s.viewBtnText, { color: colors.primary }]}>View Details</Text>
        <Ionicons name="arrow-forward" size={14} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

function MetaItem({ icon, text, color }: { icon: any; text: string; color: string }) {
  return (
    <View style={s.metaItem}>
      <Ionicons name={icon} size={13} color={color} />
      <Text style={[s.metaText, { color }]} numberOfLines={1}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 6, marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  headerSub: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center' },
  browseBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  browseBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  list: { padding: 16, gap: 12 },
  statsBar: {
    flexDirection: 'row', borderBottomWidth: 1,
    paddingVertical: 12, paddingHorizontal: 8,
  },
  statBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    borderRightWidth: 1, paddingVertical: 4,
  },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  card: {
    borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  logo: { width: 44, height: 44, borderRadius: 10 },
  logoFallback: { alignItems: 'center', justifyContent: 'center' },
  jobTitle: { fontSize: 14, fontWeight: '700' },
  companyName: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, fontWeight: '500' },
  viewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
  },
  viewBtnText: { fontSize: 13, fontWeight: '700' },
});
