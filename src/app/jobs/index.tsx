import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePublicEmployersQuery, Employer } from '../../api/jobs';

const PRIMARY = '#166534';
const PRIMARY_ACCENT = '#22C55E';
const PRIMARY_LIGHT = '#DCFCE7';
const BG = '#F8FAFC';
const CARD = '#FFFFFF';
const BORDER = '#E2E8F0';
const TEXT_PRIMARY = '#0F172A';
const TEXT_SECONDARY = '#475569';
const TEXT_MUTED = '#94A3B8';

const { width: SCREEN_W } = Dimensions.get('window');
const IS_TABLET = SCREEN_W >= 768;

type FilterMode = 'ALL' | 'HIRING';

// ── Shimmer & Skeleton ────────────────────────────────────────────────────────
function Shimmer({ style }: { style?: any }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 850, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 850, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });
  return <Animated.View style={[{ backgroundColor: '#E2E8F0', borderRadius: 8, opacity }, style]} />;
}

function SkeletonCard() {
  return (
    <View style={styles.companyCard}>
      <View style={styles.cardHeader}>
        <Shimmer style={{ width: 48, height: 48, borderRadius: 12 }} />
        <View style={{ flex: 1, gap: 6 }}>
          <Shimmer style={{ width: '65%', height: 15 }} />
          <Shimmer style={{ width: '40%', height: 11 }} />
        </View>
      </View>
      <Shimmer style={{ width: '100%', height: 12, marginBottom: 6 }} />
      <Shimmer style={{ width: '70%', height: 12, marginBottom: 14 }} />
      <View style={styles.cardFooter}>
        <Shimmer style={{ width: 110, height: 26, borderRadius: 13 }} />
        <Shimmer style={{ width: 70, height: 26, borderRadius: 13 }} />
      </View>
    </View>
  );
}

// ── Company Card ──────────────────────────────────────────────────────────────
function CompanyCard({ employer, onPress }: { employer: Employer; onPress?: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const isHiring = employer.jobCount > 0;

  return (
    <Animated.View style={[styles.companyCardWrapper, { transform: [{ scale }] }]}>
      <Pressable
        onPress={isHiring ? onPress : undefined}
        onPressIn={() => isHiring && Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start()}
        onPressOut={() => isHiring && Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
        style={[styles.companyCard, !isHiring && { opacity: 0.88 }]}
      >
        {/* Header: Logo, Name, Location & Status */}
        <View style={styles.cardHeader}>
          {employer.logoUrl ? (
            <Image
              source={{ uri: employer.logoUrl }}
              style={styles.logo}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={[styles.logo, styles.logoFallback]}>
              <Ionicons name="business" size={22} color={PRIMARY} />
            </View>
          )}

          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.companyName} numberOfLines={1}>
                {employer.name}
              </Text>
              {isHiring && (
                <View style={styles.hiringDotPulse}>
                  <View style={styles.hiringDot} />
                </View>
              )}
            </View>

            <View style={styles.metaRow}>
              {employer.industry ? (
                <Text style={styles.metaText} numberOfLines={1}>
                  {employer.industry}
                </Text>
              ) : null}
              {employer.industry && (employer.city || employer.state) ? (
                <Text style={styles.metaDot}>•</Text>
              ) : null}
              {employer.city || employer.state ? (
                <View style={styles.locationInline}>
                  <Ionicons name="location-sharp" size={11} color={TEXT_MUTED} />
                  <Text style={styles.metaText} numberOfLines={1}>
                    {[employer.city, employer.state].filter(Boolean).join(', ')}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Bio / Description */}
        {employer.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {employer.description}
          </Text>
        ) : null}

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={[styles.jobPill, isHiring ? styles.jobPillActive : styles.jobPillInactive]}>
            <Ionicons
              name={isHiring ? 'briefcase' : 'briefcase-outline'}
              size={12}
              color={isHiring ? PRIMARY : TEXT_MUTED}
            />
            <Text style={[styles.jobPillText, { color: isHiring ? PRIMARY : TEXT_MUTED }]}>
              {isHiring
                ? `${employer.jobCount} open ${employer.jobCount === 1 ? 'role' : 'roles'}`
                : 'No open roles'}
            </Text>
          </View>

          {isHiring && (
            <View style={styles.exploreAction}>
              <Text style={styles.exploreText}>View jobs</Text>
              <Ionicons name="arrow-forward" size={12} color={PRIMARY} />
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function JobsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('ALL');

  const { data: employers = [], isLoading } = usePublicEmployersQuery();

  const filteredEmployers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return employers
      .filter((e) => {
        const matchesSearch =
          !query ||
          e.name.toLowerCase().includes(query) ||
          e.industry?.toLowerCase().includes(query) ||
          e.city?.toLowerCase().includes(query) ||
          e.state?.toLowerCase().includes(query);

        const matchesFilter = filterMode === 'ALL' || (filterMode === 'HIRING' && e.jobCount > 0);
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        if (a.jobCount > 0 && b.jobCount === 0) return -1;
        if (a.jobCount === 0 && b.jobCount > 0) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [employers, search, filterMode]);

  const activeHiringCount = useMemo(
    () => employers.filter((e) => e.jobCount > 0).length,
    [employers]
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── App Header ────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as any))}
          style={styles.headerIconBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={TEXT_PRIMARY} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Hiring Companies</Text>
          <Text style={styles.headerSubtitle}>
            {isLoading ? 'Fetching listings...' : `${activeHiringCount} active recruiters`}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.applicationsBtn}
          onPress={() => router.push('/jobs/my-applications' as any)}
          activeOpacity={0.75}
        >
          <Ionicons name="reader-outline" size={15} color={PRIMARY} />
          <Text style={styles.applicationsBtnText}>My Apps</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search & Filter Controls ──────────────────────────────── */}
      <View style={styles.controlsContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={17} color={TEXT_MUTED} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search company, title, or location..."
            placeholderTextColor={TEXT_MUTED}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {search && Platform.OS === 'android' ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={TEXT_MUTED} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter Pills */}
        <View style={styles.filterPillsRow}>
          <TouchableOpacity
            style={[
              styles.filterPill,
              filterMode === 'ALL' ? styles.filterPillActive : styles.filterPillInactive,
            ]}
            onPress={() => setFilterMode('ALL')}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.filterPillText,
                { color: filterMode === 'ALL' ? '#FFF' : TEXT_SECONDARY },
              ]}
            >
              All ({employers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              filterMode === 'HIRING' ? styles.filterPillActive : styles.filterPillInactive,
            ]}
            onPress={() => setFilterMode('HIRING')}
            activeOpacity={0.75}
          >
            <View style={[styles.pillDot, { backgroundColor: filterMode === 'HIRING' ? '#FFF' : PRIMARY_ACCENT }]} />
            <Text
              style={[
                styles.filterPillText,
                { color: filterMode === 'HIRING' ? '#FFF' : TEXT_SECONDARY },
              ]}
            >
              Hiring Now ({activeHiringCount})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Content Stream ────────────────────────────────────────── */}
      {isLoading ? (
        <View style={styles.listPadding}>
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </View>
      ) : (
        <FlatList
          data={filteredEmployers}
          key={IS_TABLET ? 'tablet-grid' : 'single-col'}
          numColumns={IS_TABLET ? 2 : 1}
          columnWrapperStyle={IS_TABLET ? styles.tabletGridWrapper : undefined}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CompanyCard
              employer={item}
              onPress={() =>
                router.push({
                  pathname: '/jobs/company/[name]',
                  params: { name: item.name },
                } as any)
              }
            />
          )}
          contentContainerStyle={styles.listPadding}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="search-outline" size={32} color={TEXT_MUTED} />
              </View>
              <Text style={styles.emptyTitle}>No matching companies</Text>
              <Text style={styles.emptySubtitle}>
                {search
                  ? `We couldn't find anything matching "${search}".`
                  : 'There are currently no registered employers under this filter.'}
              </Text>
              {(search || filterMode !== 'ALL') && (
                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={() => {
                    setSearch('');
                    setFilterMode('ALL');
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.resetBtnText}>Clear filters</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: CARD,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: TEXT_MUTED,
    fontWeight: '500',
    marginTop: 1,
  },
  applicationsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: PRIMARY_LIGHT,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
  },
  applicationsBtnText: {
    color: PRIMARY,
    fontSize: 12,
    fontWeight: '700',
  },

  // Controls & Filters
  controlsContainer: {
    backgroundColor: CARD,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    gap: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 42,
    backgroundColor: BG,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: TEXT_PRIMARY,
    paddingVertical: 0,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 5,
  },
  filterPillActive: {
    backgroundColor: PRIMARY,
  },
  filterPillInactive: {
    backgroundColor: BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Lists & Grid Layout
  listPadding: {
    padding: 16,
    gap: 12,
    paddingBottom: 48,
  },
  tabletGridWrapper: {
    gap: 12,
  },
  companyCardWrapper: {
    flex: 1,
  },

  // Card Structure
  companyCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1.5,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  logo: {
    width: 46,
    height: 46,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    backgroundColor: BG,
  },
  logoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY_LIGHT,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  companyName: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  hiringDotPulse: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiringDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PRIMARY_ACCENT,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 2,
    gap: 4,
  },
  metaText: {
    fontSize: 11.5,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  metaDot: {
    fontSize: 10,
    color: TEXT_MUTED,
  },
  locationInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  description: {
    fontSize: 12.5,
    color: TEXT_SECONDARY,
    lineHeight: 18,
    marginBottom: 10,
  },

  // Card Footer & Badges
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
  },
  jobPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  jobPillActive: {
    backgroundColor: PRIMARY_LIGHT,
  },
  jobPillInactive: {
    backgroundColor: BG,
  },
  jobPillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  exploreAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  exploreText: {
    fontSize: 12,
    fontWeight: '700',
    color: PRIMARY,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 18,
  },
  resetBtn: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
});