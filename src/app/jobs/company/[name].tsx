import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated, Platform, Pressable, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCompanyJobsQuery, EMPLOYMENT_TYPE_LABELS, WORK_MODE_LABELS, Job } from '../../../api/jobs';

const PRIMARY = '#1B5E20';
const PRIMARY_LIGHT = '#2E7D32';
const PRIMARY_PALE = '#E8F5E9';
const BG = '#F4F6F8';
const CARD = '#FFFFFF';
const BORDER = '#E8ECF0';
const TEXT_PRIMARY = '#0D1B2A';
const TEXT_SECONDARY = '#5A6A7A';
const TEXT_MUTED = '#9AA5B1';

const EMP_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  FULL_TIME:  { bg: '#E3F2FD', text: '#1565C0' },
  PART_TIME:  { bg: '#FFF3E0', text: '#E65100' },
  INTERNSHIP: { bg: '#F3E5F5', text: '#6A1B9A' },
  CONTRACT:   { bg: '#FCE4EC', text: '#AD1457' },
};

// ── Shimmer ───────────────────────────────────────────────────────────────────
function Shimmer({ style }: { style?: any }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });
  return <Animated.View style={[{ backgroundColor: '#DDE3EA', borderRadius: 6, opacity }, style]} />;
}

function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.cardAccent} />
      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
          <View style={{ flex: 1 }}>
            <Shimmer style={{ width: 170, height: 15, marginBottom: 7 }} />
            <Shimmer style={{ width: 100, height: 11 }} />
          </View>
          <Shimmer style={{ width: 72, height: 24, borderRadius: 6 }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <Shimmer style={{ width: 80, height: 28, borderRadius: 8 }} />
          <Shimmer style={{ width: 70, height: 28, borderRadius: 8 }} />
        </View>
        <Shimmer style={{ width: '100%', height: 11, marginBottom: 6 }} />
        <Shimmer style={{ width: '60%', height: 11 }} />
      </View>
    </View>
  );
}

// ── Job Card ──────────────────────────────────────────────────────────────────
function JobCard({ job, onPress }: { job: Job; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const badge = EMP_BADGE_COLORS[job.employmentType] ?? { bg: PRIMARY_PALE, text: PRIMARY_LIGHT };

  return (
    <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
      <View style={styles.cardAccent} />
      <Pressable
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.975, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
        style={{ padding: 16 }}
      >
        {/* Title row */}
        <View style={styles.cardTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.jobTitle} numberOfLines={2}>{job.jobTitle}</Text>
          </View>
          <View style={[styles.empBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.empBadgeText, { color: badge.text }]}>
              {EMPLOYMENT_TYPE_LABELS[job.employmentType]}
            </Text>
          </View>
        </View>

        {/* Meta chips */}
        <View style={styles.metaChipsRow}>
          <MetaChip icon="location-outline" text={job.location} />
          <MetaChip icon="cash-outline" text={`${job.salaryLPA} LPA`} />
          <MetaChip icon="time-outline" text={job.experience} />
          <MetaChip icon="laptop-outline" text={WORK_MODE_LABELS[job.workMode]} />
        </View>

        {/* Skills */}
        {job.requiredSkills.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 6 }}>
            {job.requiredSkills.slice(0, 5).map(skill => (
              <View key={skill} style={styles.skillChip}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
            {job.requiredSkills.length > 5 && (
              <View style={[styles.skillChip, { backgroundColor: '#F0F4F8' }]}>
                <Text style={[styles.skillText, { color: TEXT_SECONDARY }]}>+{job.requiredSkills.length - 5} more</Text>
              </View>
            )}
          </ScrollView>
        )}

        <Text style={styles.desc} numberOfLines={2}>{job.description}</Text>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <Ionicons name="people-outline" size={13} color={TEXT_MUTED} />
            <Text style={styles.footerMeta}>{job.vacancyCount} vacancies</Text>
            <View style={styles.dot} />
            <Ionicons name="person-add-outline" size={13} color={TEXT_MUTED} />
            <Text style={styles.footerMeta}>{job.applyCount} applied</Text>
          </View>
          {job.hasApplied ? (
            <View style={styles.appliedBadge}>
              <Ionicons name="checkmark-circle" size={13} color="#15803D" />
              <Text style={styles.appliedBadgeText}>Applied</Text>
            </View>
          ) : (
            <View style={styles.viewBtn}>
              <Text style={styles.viewBtnText}>View</Text>
              <Ionicons name="chevron-forward" size={13} color={PRIMARY_LIGHT} />
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

function MetaChip({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.metaChip}>
      <Ionicons name={icon} size={12} color={TEXT_SECONDARY} />
      <Text style={styles.metaChipText} numberOfLines={1}>{text}</Text>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function CompanyJobsScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: jobs = [], isLoading } = useCompanyJobsQuery(name ?? '');

  // Grab logo from first job that has one
  const companyLogo = jobs.find(j => j.companyLogo)?.companyLogo;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/jobs' as any)}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color={CARD} />
        </TouchableOpacity>

        {/* Company identity */}
        <View style={styles.headerCompany}>
          {companyLogo ? (
            <Image source={{ uri: companyLogo }} style={styles.headerLogo} contentFit="contain" />
          ) : (
            <View style={[styles.headerLogo, styles.headerLogoFallback]}>
              <Ionicons name="briefcase" size={18} color={PRIMARY_LIGHT} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{name}</Text>
            <Text style={styles.headerSub}>
              {isLoading ? 'Loading...' : `${jobs.length} open position${jobs.length !== 1 ? 's' : ''}`}
            </Text>
          </View>
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </ScrollView>
      ) : jobs.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="briefcase-outline" size={36} color={PRIMARY_LIGHT} />
          </View>
          <Text style={styles.emptyTitle}>No open positions</Text>
          <Text style={styles.emptySub}>
            {name} doesn't have any active job listings right now.
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.back()}>
            <Text style={styles.emptyBtnText}>Browse All Jobs</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {jobs.map(job => (
            <JobCard key={job.id} job={job} onPress={() => router.push(`/jobs/${job.id}` as any)} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: PRIMARY, gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCompany: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLogo: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: CARD, overflow: 'hidden',
  },
  headerLogoFallback: {
    backgroundColor: PRIMARY_PALE,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: CARD, letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 1 },

  // List
  list: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 40 },

  // Card
  card: {
    backgroundColor: CARD, borderRadius: 14,
    marginBottom: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: BORDER,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  cardAccent: { height: 3, backgroundColor: PRIMARY_LIGHT },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  jobTitle: { fontSize: 15, fontWeight: '700', color: TEXT_PRIMARY, letterSpacing: -0.2, lineHeight: 20 },
  empBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start', marginLeft: 8 },
  empBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },

  // Meta
  metaChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: BG, paddingHorizontal: 9, paddingVertical: 5,
    borderRadius: 7, borderWidth: 1, borderColor: BORDER,
  },
  metaChipText: { fontSize: 11, color: TEXT_SECONDARY, fontWeight: '500' },

  // Skills
  skillChip: { backgroundColor: PRIMARY_PALE, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6 },
  skillText: { fontSize: 11, fontWeight: '600', color: PRIMARY_LIGHT },

  desc: { fontSize: 13, color: TEXT_SECONDARY, lineHeight: 19, marginBottom: 12 },

  // Footer
  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 10,
  },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  footerMeta: { fontSize: 11, color: TEXT_MUTED, fontWeight: '500' },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: TEXT_MUTED },
  viewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: PRIMARY_PALE, borderRadius: 8,
  },
  viewBtnText: { color: PRIMARY_LIGHT, fontSize: 12, fontWeight: '700' },
  appliedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: '#F0FDF4', borderRadius: 8,
  },
  appliedBadgeText: { color: '#15803D', fontSize: 12, fontWeight: '700' },

  // Empty
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 10 },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: PRIMARY_PALE, alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: TEXT_PRIMARY },
  emptySub: { fontSize: 13, color: TEXT_SECONDARY, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { marginTop: 10, paddingHorizontal: 28, paddingVertical: 11, backgroundColor: PRIMARY, borderRadius: 10 },
  emptyBtnText: { color: CARD, fontSize: 13, fontWeight: '700' },
});
