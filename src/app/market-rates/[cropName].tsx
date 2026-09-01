import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '../../api/client';
import { Skeleton } from '../../components/feedback/Skeleton';
import { useUserLocation } from '../../hooks/useUserLocation';
import { useTheme } from '../../theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MarketRecord {
  crop_name: string;
  market_name: string;
  district: string;
  state: string;
  arrival_date: string;
  variety: string;
  grade: string;
  min_price: number;
  modal_price: number;
  max_price: number;
  unit: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CROP_IMAGES: Record<string, any> = {
  Coffee: require('../../../assets/images/crops/coffee.png'),
  'Black Pepper': require('../../../assets/images/crops/blackpepper.png'),
  Cardamom: require('../../../assets/images/crops/cardamom.png'),
  Vanilla: require('../../../assets/images/crops/vanilla.png'),
  Cinnamon: require('../../../assets/images/crops/cinnamon.png'),
  Arecanut: require('../../../assets/images/crops/arecanut.png'),
  Coconut: require('../../../assets/images/crops/coconut.jpg'),
  Tea: require('../../../assets/images/crops/tea.jpg'),
  Orange: require('../../../assets/images/crops/orange.jpg'),
  Jackfruit: require('../../../assets/images/crops/jackfruit.jpg'),
  Mango: require('../../../assets/images/crops/mango.jpg'),
  Banana: require('../../../assets/images/crops/banana.jpg'),
  'Paddy (Rice)': require('../../../assets/images/crops/paddy.jpg'),
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseDateLabel(iso: string) {
  const [y, m, day] = iso.split('-').map(Number);
  const d = new Date(y, m - 1, day);
  return {
    dayName: DAY_NAMES[d.getDay()],
    dayNum: d.getDate(),
    ddmm: `${String(day).padStart(2, '0')}/${String(m).padStart(2, '0')}`,
  };
}

function convertPrice(price: number, unit: 'Quintal' | '20 Kg') {
  return unit === '20 Kg' ? Math.round(price * 0.2) : price;
}

// ─── DateChip ─────────────────────────────────────────────────────────────────

function DateChip({
  iso, selected, onPress, colors,
}: {
  iso: string; selected: boolean; onPress: () => void; colors: any;
}) {
  const { dayName, dayNum, ddmm } = parseDateLabel(iso);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.dateChip,
        {
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      <Text style={[styles.dateDay, { color: selected ? '#fff' : colors.textMuted }]}>{dayName}</Text>
      <Text style={[styles.dateNum, { color: selected ? '#fff' : colors.text }]}>{dayNum}</Text>
      <Text style={[styles.dateDdmm, { color: selected ? '#C8E6C9' : colors.textMuted }]}>{ddmm}</Text>
    </TouchableOpacity>
  );
}

// ─── SummaryCard ──────────────────────────────────────────────────────────────

function SummaryCard({
  bestPrice, avgPrice, totalMarkets, colors,
}: {
  bestPrice: number; avgPrice: number; totalMarkets: number; colors: any;
}) {
  const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`;
  return (
    <View style={[styles.summaryCard, { backgroundColor: colors.primaryContainer, borderColor: colors.primary + '30' }]}>
      <View style={styles.summaryItem}>
        <Ionicons name="trophy-outline" size={20} color={colors.primary} />
        <Text style={[styles.summaryValue, { color: colors.primaryDark }]}>{fmt(bestPrice)}</Text>
        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Best Price</Text>
      </View>
      <View style={[styles.summaryDivider, { backgroundColor: colors.primary + '30' }]} />
      <View style={styles.summaryItem}>
        <Ionicons name="stats-chart-outline" size={20} color={colors.primary} />
        <Text style={[styles.summaryValue, { color: colors.primaryDark }]}>{fmt(avgPrice)}</Text>
        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Avg Price</Text>
      </View>
      <View style={[styles.summaryDivider, { backgroundColor: colors.primary + '30' }]} />
      <View style={styles.summaryItem}>
        <Ionicons name="storefront-outline" size={20} color={colors.primary} />
        <Text style={[styles.summaryValue, { color: colors.primaryDark }]}>{totalMarkets}</Text>
        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Markets</Text>
      </View>
    </View>
  );
}

// ─── MarketCard ───────────────────────────────────────────────────────────────

function MarketCard({
  record, rank, unit, colors,
}: {
  record: MarketRecord; rank: number; unit: 'Quintal' | '20 Kg'; colors: any;
}) {
  const fmt = (v: number) => `₹${convertPrice(v, unit).toLocaleString('en-IN')}`;
  const isTop = rank === 1;
  return (
    <View
      style={[
        styles.marketCard,
        {
          backgroundColor: colors.surface,
          borderColor: isTop ? colors.primary : colors.border,
          borderWidth: isTop ? 1.5 : 1,
        },
        Platform.select({
          ios: { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
          android: { elevation: isTop ? 4 : 2 },
        }),
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.rankBadge, { backgroundColor: isTop ? colors.primary : colors.surfaceVariant }]}>
          <Text style={[styles.rankText, { color: isTop ? '#fff' : colors.textSecondary }]}>#{rank}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.marketName, { color: colors.text }]} numberOfLines={1}>{record.market_name}</Text>
          <Text style={[styles.marketLocation, { color: colors.textMuted }]}>{record.district}, {record.state}</Text>
        </View>
        <View style={[styles.todayPriceBadge, { backgroundColor: colors.primary + '15' }]}>
          <Text style={[styles.todayPriceLabel, { color: colors.textMuted }]}>Modal</Text>
          <Text style={[styles.todayPrice, { color: colors.primary }]}>{fmt(record.modal_price)}</Text>
        </View>
      </View>

      <View style={styles.tagRow}>
        {[record.variety, record.grade, `/${unit}`].map((t) => (
          <View key={t} style={[styles.tag, { backgroundColor: colors.surfaceVariant }]}>
            <Text style={[styles.tagText, { color: colors.textSecondary }]}>{t}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.priceRow, { borderTopColor: colors.border }]}>
        <View style={styles.priceItem}>
          <Text style={[styles.priceLabel, { color: colors.textMuted }]}>Min</Text>
          <Text style={[styles.priceVal, { color: colors.textSecondary }]}>{fmt(record.min_price)}</Text>
        </View>
        <View style={[styles.priceItemCenter, { borderColor: colors.border }]}>
          <Text style={[styles.priceLabel, { color: colors.textMuted }]}>Modal</Text>
          <Text style={[styles.priceValModal, { color: colors.primary }]}>{fmt(record.modal_price)}</Text>
        </View>
        <View style={styles.priceItem}>
          <Text style={[styles.priceLabel, { color: colors.textMuted }]}>Max</Text>
          <Text style={[styles.priceVal, { color: colors.textSecondary }]}>{fmt(record.max_price)}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── SkeletonCard ─────────────────────────────────────────────────────────────

function SkeletonCard({ colors }: { colors: any }) {
  return (
    <View style={[styles.marketCard, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
      <View style={styles.cardHeader}>
        <Skeleton width={36} height={36} borderRadius={18} />
        <View style={{ flex: 1, gap: 6, marginLeft: 10 }}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={11} />
        </View>
        <Skeleton width={70} height={40} borderRadius={10} />
      </View>
      <View style={[styles.tagRow, { marginTop: 8 }]}>
        <Skeleton width={60} height={22} borderRadius={6} />
        <Skeleton width={80} height={22} borderRadius={6} />
      </View>
      <View style={[styles.priceRow, { borderTopColor: colors.border, marginTop: 10 }]}>
        <Skeleton width="30%" height={30} borderRadius={6} />
        <Skeleton width="30%" height={30} borderRadius={6} />
        <Skeleton width="30%" height={30} borderRadius={6} />
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CropDetailScreen() {
  const { cropName } = useLocalSearchParams<{ cropName: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const name = decodeURIComponent(cropName ?? '');
  const imageSource = CROP_IMAGES[name];
  const userLocation = useUserLocation();

  // ── State ──
  // availableDates: all unique dates from the initial full fetch (for the date strip)
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  // dateRecords: records for the currently selected date
  const [dateRecords, setDateRecords] = useState<MarketRecord[]>([]);

  const [datesLoading, setDatesLoading] = useState(true);   // initial strip load
  const [dataLoading, setDataLoading] = useState(false);    // per-date content load
  const [datesError, setDatesError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [unit, setUnit] = useState<'Quintal' | '20 Kg'>('Quintal');
  const [search, setSearch] = useState('');
  const [filterState, setFilterState] = useState<string | null>(null);
  const [filterDistrict, setFilterDistrict] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  // Abort controller ref to cancel in-flight date fetches
  const abortRef = useRef<AbortController | null>(null);

  // Auto-apply user's state once BOTH location AND dateRecords are ready
  const locationAppliedRef = useRef(false);
  useEffect(() => {
    if (
      !locationAppliedRef.current &&
      !userLocation.loading &&
      userLocation.state &&
      dateRecords.length > 0
    ) {
      locationAppliedRef.current = true;
      const detectedState = userLocation.state;
      // Find exact matching state name from actual DB records (case-insensitive)
      const matchedState = [...new Set(dateRecords.map((r) => r.state))].find(
        (s) => s.toLowerCase() === detectedState.toLowerCase()
      );
      setFilterState(matchedState ?? null);
    }
  }, [userLocation.loading, userLocation.state, dateRecords]);

  // ── Step 1: Initial load — fetch all records to extract available dates ──
  const fetchAvailableDates = useCallback(async () => {
    try {
      setDatesLoading(true);
      setDatesError(null);
      const res = await apiClient.get('/market-rates', { params: { crop: name } });
      const records: MarketRecord[] = res.data?.data ?? [];

      // Extract unique dates sorted newest first (max 7)
      const seen = new Set<string>();
      const dates: string[] = [];
      for (const r of records) {
        if (!seen.has(r.arrival_date)) {
          seen.add(r.arrival_date);
          dates.push(r.arrival_date);
          if (dates.length === 7) break;
        }
      }
      setAvailableDates(dates);

      // Auto-select newest date and load its data
      if (dates.length > 0) {
        setSelectedDate(dates[0]);
        // Populate from the already-fetched records (no extra request needed)
        const newest = records.filter((r) => r.arrival_date === dates[0])
          .sort((a, b) => b.modal_price - a.modal_price);
        setDateRecords(newest);
      }
    } catch (e: any) {
      setDatesError(e?.response?.data?.message ?? 'Unable to load market rates. Please try again.');
    } finally {
      setDatesLoading(false);
    }
  }, [name]);

  useEffect(() => { fetchAvailableDates(); }, [fetchAvailableDates]);

  // ── Step 2: Per-date fetch — called every time user taps a date chip ──
  const fetchForDate = useCallback(async (date: string) => {
    // Cancel any previous in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      setDataLoading(true);
      setDataError(null);
      setDateRecords([]); // clear stale data immediately

      const res = await apiClient.get('/market-rates', {
        params: { crop: name, date },
        signal: abortRef.current.signal,
      });
      const records: MarketRecord[] = res.data?.data ?? [];
      setDateRecords(records.sort((a, b) => b.modal_price - a.modal_price));
    } catch (e: any) {
      if (e?.code === 'ERR_CANCELED') return; // aborted — ignore
      setDataError('Unable to load market rates. Please try again.');
    } finally {
      setDataLoading(false);
    }
  }, [name]);

  // ── Date chip tap handler ──
  const handleDateSelect = useCallback((date: string) => {
    if (date === selectedDate) return; // already selected
    setSelectedDate(date);
    fetchForDate(date);
  }, [selectedDate, fetchForDate]);

  // ── Unique states & districts for filter ──
  const allStates = useMemo(() => [...new Set(dateRecords.map((r) => r.state))].sort(), [dateRecords]);
  const allDistricts = useMemo(() => {
    const base = filterState ? dateRecords.filter((r) => r.state.toLowerCase() === filterState.toLowerCase()) : dateRecords;
    return [...new Set(base.map((r) => r.district))].sort();
  }, [dateRecords, filterState]);

  // ── Haversine distance (km) ──
  function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ── Filtered + sorted records (nearby first within state) ──
  const filteredRecords = useMemo(() => {
    const filtered = dateRecords.filter((r) => {
      const q = search.toLowerCase();
      const matchSearch = !q || r.market_name.toLowerCase().includes(q) || r.district.toLowerCase().includes(q) || r.state.toLowerCase().includes(q);
      const matchState = !filterState || r.state.toLowerCase() === filterState.toLowerCase();
      const matchDistrict = !filterDistrict || r.district.toLowerCase() === filterDistrict.toLowerCase();
      return matchSearch && matchState && matchDistrict;
    });

    // If we have user coords, sort by proximity (approximate — use district name match as tiebreaker)
    if (userLocation.coords) {
      const { latitude, longitude } = userLocation.coords;
      // We don't have market coords, so sort: user's district first, then user's state, then rest by modal_price
      filtered.sort((a, b) => {
        const aDistrict = userLocation.district && a.district.toLowerCase().includes(userLocation.district.toLowerCase()) ? 0 : 1;
        const bDistrict = userLocation.district && b.district.toLowerCase().includes(userLocation.district.toLowerCase()) ? 0 : 1;
        if (aDistrict !== bDistrict) return aDistrict - bDistrict;
        return b.modal_price - a.modal_price;
      });
      void latitude; void longitude; // suppress unused warning
    }
    return filtered;
  }, [dateRecords, search, filterState, filterDistrict, userLocation.coords, userLocation.district]);

  const activeFilterCount = (filterState ? 1 : 0) + (filterDistrict ? 1 : 0);

  // ── Summary derived from current dateRecords + unit ──
  const summary = useMemo(() => {
    if (filteredRecords.length === 0) return { bestPrice: 0, avgPrice: 0, totalMarkets: 0 };
    const best = Math.max(...filteredRecords.map((r) => r.modal_price));
    const avg = Math.round(filteredRecords.reduce((s, r) => s + r.modal_price, 0) / filteredRecords.length);
    return {
      bestPrice: convertPrice(best, unit),
      avgPrice: convertPrice(avg, unit),
      totalMarkets: filteredRecords.length,
    };
  }, [filteredRecords, unit]);

  // ── Render ──
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Header */}
      <LinearGradient
        colors={['#1B5E20', '#2D6A2D', '#4CAF50']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/market-rates' as any))}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Go back to market rates"
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerImageWrap}>
            {imageSource
              ? <Image source={imageSource} style={styles.headerImage} resizeMode="cover" />
              : <Ionicons name="leaf" size={28} color="#fff" />}
          </View>
          <View>
            <Text style={styles.headerTitle}>{name}</Text>
            <Text style={styles.headerSub}>
            {userLocation.loading
              ? 'Detecting location…'
              : userLocation.district && userLocation.state
              ? `${userLocation.district}, ${userLocation.state}`
              : userLocation.state
              ? userLocation.state
              : 'All APMC Market Prices'}
          </Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setShowFilter(true)} style={styles.filterIconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="options-outline" size={22} color="#fff" />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Search Bar ── */}
        <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by market, district, state..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Location Banner ── */}
        {!userLocation.loading && (userLocation.state || userLocation.error) && (
          <TouchableOpacity
            onPress={() => setShowFilter(true)}
            activeOpacity={0.8}
            style={[styles.locationBanner, { backgroundColor: colors.primaryContainer, borderColor: colors.primary + '40' }]}
          >
            <Ionicons
              name={userLocation.error ? 'location-outline' : 'location'}
              size={14}
              color={colors.primary}
            />
            <Text style={[styles.locationBannerText, { color: colors.primaryDark }]} numberOfLines={1}>
              {userLocation.error
                ? 'Location unavailable — showing all markets'
                : filterState
                ? `Filtered: ${filterState}`
                : `Detected: ${userLocation.state} — tap to filter`}
            </Text>
            <Text style={[styles.locationBannerChange, { color: colors.primary }]}>Change</Text>
          </TouchableOpacity>
        )}

        {/* ── Date Strip ── */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Select Date</Text>

          {datesLoading ? (
            <FlatList
              horizontal
              data={[1, 2, 3, 4, 5]}
              keyExtractor={(i) => String(i)}
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 10 }}
              renderItem={() => <Skeleton width={62} height={72} borderRadius={14} style={{ marginRight: 8 }} />}
            />
          ) : datesError ? (
            <Text style={[styles.inlineError, { color: colors.error }]}>{datesError}</Text>
          ) : availableDates.length === 0 ? (
            <Text style={[styles.inlineError, { color: colors.textMuted }]}>No dates available</Text>
          ) : (
            <FlatList
              horizontal
              data={availableDates}
              keyExtractor={(iso) => iso}
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 10 }}
              nestedScrollEnabled
              renderItem={({ item: iso }) => (
                <DateChip
                  iso={iso}
                  selected={iso === selectedDate}
                  onPress={() => handleDateSelect(iso)}
                  colors={colors}
                />
              )}
            />
          )}
        </View>

        {/* ── Unit Toggle ── */}
        <View style={[styles.unitToggle, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
          {(['Quintal', '20 Kg'] as const).map((u) => (
            <TouchableOpacity
              key={u}
              onPress={() => setUnit(u)}
              style={[styles.unitBtn, { backgroundColor: unit === u ? colors.primary : 'transparent' }]}
            >
              <Text style={[styles.unitBtnText, { color: unit === u ? '#fff' : colors.textSecondary }]}>{u}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Content Area ── */}
        {dataLoading ? (
          <>
            <View style={[styles.summaryCard, { backgroundColor: colors.primaryContainer, borderColor: colors.primary + '30', justifyContent: 'center' }]}>
              <ActivityIndicator color={colors.primary} />
            </View>
            {[1, 2, 3].map((i) => <SkeletonCard key={i} colors={colors} />)}
          </>
        ) : dataError ? (
          <View style={styles.centerState}>
            <Ionicons name="cloud-offline-outline" size={52} color={colors.error} />
            <Text style={[styles.stateTitle, { color: colors.text }]}>Unable to load market rates.</Text>
            <Text style={[styles.stateBody, { color: colors.textMuted }]}>Please try again.</Text>
            <TouchableOpacity
              onPress={() => selectedDate && fetchForDate(selectedDate)}
              style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : !datesLoading && dateRecords.length === 0 ? (
          <View style={styles.centerState}>
            <Ionicons name="calendar-outline" size={52} color={colors.textMuted} />
            <Text style={[styles.stateTitle, { color: colors.text }]}>No data for this date</Text>
            <Text style={[styles.stateBody, { color: colors.textMuted }]}>
              No APMC market data available for this date.
            </Text>
          </View>
        ) : dateRecords.length > 0 ? (
          <>
            <SummaryCard {...summary} colors={colors} />
            {filteredRecords.length === 0 ? (
              <View style={styles.centerState}>
                <Ionicons name="search-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.stateTitle, { color: colors.text }]}>No markets found</Text>
                <Text style={[styles.stateBody, { color: colors.textMuted }]}>Try adjusting your search or filters.</Text>
              </View>
            ) : (
              filteredRecords.map((record, i) => (
                <MarketCard key={`${record.market_name}-${i}`} record={record} rank={i + 1} unit={unit} colors={colors} />
              ))
            )}
          </>
        ) : null}

      </ScrollView>

      {/* ── Filter Modal ── */}
      <Modal visible={showFilter} transparent animationType="slide" onRequestClose={() => setShowFilter(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowFilter(false)} />
        <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Filter Markets</Text>
            <TouchableOpacity onPress={() => { setFilterState(null); setFilterDistrict(null); }}>
              <Text style={[styles.clearText, { color: colors.primary }]}>Clear All</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>State</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {allStates.map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => { setFilterState(filterState?.toLowerCase() === s.toLowerCase() ? null : s); setFilterDistrict(null); }}
                  style={[styles.chip, { backgroundColor: filterState?.toLowerCase() === s.toLowerCase() ? colors.primary : colors.surfaceVariant, borderColor: filterState?.toLowerCase() === s.toLowerCase() ? colors.primary : colors.border }]}
                >
                  <Text style={[styles.chipText, { color: filterState?.toLowerCase() === s.toLowerCase() ? '#fff' : colors.textSecondary }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>District</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {allDistricts.map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setFilterDistrict(filterDistrict?.toLowerCase() === d.toLowerCase() ? null : d)}
                  style={[styles.chip, { backgroundColor: filterDistrict?.toLowerCase() === d.toLowerCase() ? colors.primary : colors.surfaceVariant, borderColor: filterDistrict?.toLowerCase() === d.toLowerCase() ? colors.primary : colors.border }]}
                >
                  <Text style={[styles.chipText, { color: filterDistrict?.toLowerCase() === d.toLowerCase() ? '#fff' : colors.textSecondary }]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity onPress={() => setShowFilter(false)} style={[styles.applyBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.applyBtnText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, justifyContent: 'center' },
  headerImageWrap: { width: 52, height: 52, borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.2)' },
  headerImage: { width: 52, height: 52 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '500', marginTop: 2 },

  scroll: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },

  section: { borderRadius: 16, borderWidth: 1, padding: 14 },
  sectionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  inlineError: { fontSize: 13, marginTop: 10 },

  dateChip: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 62,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 8,
    gap: 2,
  },
  dateDay: { fontSize: 11, fontWeight: '600' },
  dateNum: { fontSize: 20, fontWeight: '800', lineHeight: 24 },
  dateDdmm: { fontSize: 10, fontWeight: '500' },

  unitToggle: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 4, gap: 4 },
  unitBtn: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  unitBtnText: { fontSize: 13, fontWeight: '700' },

  summaryCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    minHeight: 80,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryDivider: { width: 1, height: 40, marginHorizontal: 4 },
  summaryValue: { fontSize: 16, fontWeight: '800' },
  summaryLabel: { fontSize: 11, fontWeight: '500' },

  marketCard: { borderRadius: 16, padding: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rankBadge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 13, fontWeight: '800' },
  marketName: { fontSize: 14, fontWeight: '700' },
  marketLocation: { fontSize: 11, marginTop: 2 },
  todayPriceBadge: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  todayPriceLabel: { fontSize: 10, fontWeight: '500' },
  todayPrice: { fontSize: 15, fontWeight: '800' },

  tagRow: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText: { fontSize: 11, fontWeight: '600' },

  priceRow: { flexDirection: 'row', borderTopWidth: 1, marginTop: 10, paddingTop: 10 },
  priceItem: { flex: 1, alignItems: 'center', gap: 3 },
  priceItemCenter: { flex: 1, alignItems: 'center', gap: 3, borderLeftWidth: 1, borderRightWidth: 1 },
  priceLabel: { fontSize: 10, fontWeight: '500' },
  priceVal: { fontSize: 13, fontWeight: '700' },
  priceValModal: { fontSize: 14, fontWeight: '800' },

  centerState: { alignItems: 'center', paddingTop: 48, gap: 10 },
  stateTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  stateBody: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  retryBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  filterIconBtn: { width: 40, alignItems: 'flex-end', position: 'relative' },
  filterBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#FF5722', borderRadius: 8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },

  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  locationBannerText: { flex: 1, fontSize: 12, fontWeight: '600' },
  locationBannerChange: { fontSize: 12, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 12 },
      android: { elevation: 16 },
    }),
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  clearText: { fontSize: 13, fontWeight: '700' },
  filterLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  applyBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  applyBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
