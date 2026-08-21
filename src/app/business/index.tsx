import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  TextInput, FlatList, ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import {
  usePublicBusinessesQuery, BUSINESS_CATEGORIES, Business, BusinessCategory,
} from '../../api/business';

const CATEGORY_ICONS: Record<string, string> = {
  'Agriculture & Farming':    'leaf-outline',
  'Construction & Real Estate': 'business-outline',
  'Education & Coaching':     'school-outline',
  'Food & Beverages':         'restaurant-outline',
  'Healthcare & Wellness':    'medkit-outline',
  'IT & Technology':          'laptop-outline',
  'Retail & Shopping':        'bag-handle-outline',
  'Services':                 'construct-outline',
  'Transport & Logistics':    'car-outline',
  'Manufacturing':            'cog-outline',
  'Other':                    'grid-outline',
};

const CATEGORY_COLORS: Record<string, string> = {
  'Agriculture & Farming':    '#2D6A2D',
  'Construction & Real Estate': '#1565C0',
  'Education & Coaching':     '#F9A825',
  'Food & Beverages':         '#E65100',
  'Healthcare & Wellness':    '#059669',
  'IT & Technology':          '#9333EA',
  'Retail & Shopping':        '#DB2777',
  'Services':                 '#0891B2',
  'Transport & Logistics':    '#D97706',
  'Manufacturing':            '#475569',
  'Other':                    '#6B7280',
};

function StarRating({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons
          key={s}
          name={rating >= s ? 'star' : rating >= s - 0.5 ? 'star-half' : 'star-outline'}
          size={size}
          color="#F9A825"
        />
      ))}
    </View>
  );
}

function BusinessCard({ business, onPress, colors, isDark }: {
  business: Business; onPress: () => void; colors: any; isDark: boolean;
}) {
  const catColor = CATEGORY_COLORS[business.category] ?? '#2D6A2D';
  const catIcon = CATEGORY_ICONS[business.category] ?? 'grid-outline';

  return (
    <TouchableOpacity
      style={[
        styles.businessCard,
        {
          backgroundColor: colors.cardBg,
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Cover / Banner */}
      <View style={styles.cardBannerWrap}>
        {business.coverUrl ? (
          <Image source={{ uri: business.coverUrl }} style={styles.cardBanner} contentFit="cover" />
        ) : (
          <View style={[styles.cardBanner, styles.cardBannerFallback, { backgroundColor: catColor + '20' }]}>
            <Ionicons name={catIcon as any} size={36} color={catColor} />
          </View>
        )}
        {/* Category badge on banner */}
        <View style={[styles.cardCategoryBadge, { backgroundColor: catColor }]}>
          <Ionicons name={catIcon as any} size={10} color="#FFF" />
          <Text style={styles.cardCategoryBadgeText}>{business.category}</Text>
        </View>
        {/* Verified badge */}
        {business.isVerified && (
          <View style={[styles.verifiedBadge, { backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.95)' }]}>
            <Ionicons name="shield-checkmark" size={12} color="#16A34A" />
            <Text style={[styles.verifiedText, { color: '#16A34A' }]}>Verified</Text>
          </View>
        )}
      </View>

      {/* Card Body */}
      <View style={styles.cardBody}>
        {/* Header row: Logo + Business Name & Owner */}
        <View style={styles.cardHeaderRow}>
          <View style={[styles.cardLogoWrap, { backgroundColor: catColor + '18', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB' }]}>
            {business.logoUrl ? (
              <Image source={{ uri: business.logoUrl }} style={styles.cardLogo} contentFit="cover" />
            ) : (
              <Ionicons name={catIcon as any} size={22} color={catColor} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardBusinessName, { color: colors.text }]} numberOfLines={1}>
              {business.businessName}
            </Text>
            <View style={styles.cardOwnerRow}>
              <Ionicons name="person-outline" size={12} color={colors.textMuted} />
              <Text style={[styles.cardOwnerName, { color: colors.textSecondary }]} numberOfLines={1}>
                {business.ownerName}
              </Text>
            </View>
          </View>
        </View>

        {/* Location */}
        <View style={styles.cardMetaRow}>
          <Ionicons name="location-outline" size={12} color={colors.textMuted} />
          <Text style={[styles.cardMetaText, { color: colors.textSecondary }]} numberOfLines={1}>
            {business.location}
          </Text>
        </View>

        {/* Description */}
        <Text style={[styles.cardDescription, { color: colors.textSecondary }]} numberOfLines={2}>
          {business.description}
        </Text>

        {/* Products / Services */}
        <View style={[styles.servicesWrap, { backgroundColor: isDark ? 'rgba(45,106,45,0.15)' : '#F4F9F4', borderColor: isDark ? 'rgba(76,175,80,0.25)' : '#D1E7D1' }]}>
          <Ionicons name="cube-outline" size={11} color={colors.primary} />
          <Text style={[styles.servicesText, { color: colors.primary }]} numberOfLines={1}>
            {business.productsServices}
          </Text>
        </View>

        {/* Footer: Rating + CTA */}
        <View style={[styles.cardFooter, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : '#E5E7EB' }]}>
          {(business.reviewCount ?? 0) > 0 ? (
            <View style={styles.ratingRow}>
              <StarRating rating={business.averageRating ?? 0} />
              <Text style={[styles.ratingCount, { color: colors.textMuted }]}>
                ({business.reviewCount})
              </Text>
            </View>
          ) : (
            <Text style={[styles.noReviews, { color: colors.textMuted }]}>No reviews yet</Text>
          )}
          <View style={[styles.viewBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.viewBtnText}>View Details</Text>
            <Ionicons name="chevron-forward" size={13} color="#FFF" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function BusinessDirectoryScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  React.useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(h);
  }, [search]);

  const { data: businesses = [], isLoading, refetch } = usePublicBusinessesQuery(
    useMemo(() => ({
      category: selectedCategory !== 'All' ? selectedCategory : undefined,
      search: debouncedSearch || undefined,
    }), [selectedCategory, debouncedSearch])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleAddBusiness = () => {
    if (!user) {
      router.push('/(auth)/login' as any);
      return;
    }
    router.push('/business/submit' as any);
  };

  const G = colors.primary;
  const BG = colors.background;
  const SURF = colors.surface;
  const BORDER = colors.border;
  const TEXT = colors.text;
  const TEXT2 = colors.textSecondary;
  const TEXT3 = colors.textMuted;

  return (
    <View style={[styles.root, { backgroundColor: BG, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: SURF, borderBottomColor: BORDER }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.primaryContainer }]}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={19} color={G} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: TEXT }]}>Business Directory</Text>
          <Text style={[styles.headerSub, { color: TEXT3 }]}>
            {isLoading ? 'Loading...' : `${businesses.length} verified businesses`}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.myBizBtn, { backgroundColor: colors.primaryContainer }]}
          onPress={() => router.push('/business/my-businesses' as any)}
          accessibilityLabel="My businesses"
        >
          <Ionicons name="briefcase-outline" size={17} color={G} />
        </TouchableOpacity>
      </View>

      {/* Promo banner */}
      <View style={[styles.promoBanner, { backgroundColor: G }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.promoTitle}>🏪 Gowda Business Network</Text>
          <Text style={styles.promoSub}>
            Discover and support businesses owned by community members
          </Text>
        </View>
        <Ionicons name="storefront" size={40} color="rgba(255,255,255,0.3)" />
      </View>

      {/* Search Bar */}
      <View style={[styles.searchWrap, { backgroundColor: SURF, borderBottomColor: BORDER }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.inputBg }]}>
          <Ionicons name="search" size={17} color={TEXT3} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search businesses, services..."
            placeholderTextColor={TEXT3}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: TEXT }]}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); setDebouncedSearch(''); }}>
              <Ionicons name="close-circle" size={17} color={TEXT3} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filters */}
      <View style={[styles.filtersWrap, { backgroundColor: SURF, borderBottomColor: BORDER }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
          {['All', ...BUSINESS_CATEGORIES].map((cat) => {
            const active = selectedCategory === cat;
            const catColor = cat === 'All' ? G : (CATEGORY_COLORS[cat] ?? G);
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? catColor : isDark ? 'rgba(255,255,255,0.06)' : colors.surfaceSecondary,
                    borderColor: active ? catColor : BORDER,
                  },
                ]}
              >
                {cat !== 'All' && (
                  <Ionicons
                    name={CATEGORY_ICONS[cat] as any ?? 'grid-outline'}
                    size={12}
                    color={active ? '#FFF' : TEXT3}
                  />
                )}
                <Text style={[styles.filterChipText, { color: active ? '#FFF' : TEXT3 }]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Business List */}
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={G} />
          <Text style={[styles.loadingText, { color: TEXT3 }]}>Loading businesses...</Text>
        </View>
      ) : (
        <FlatList
          data={businesses}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BusinessCard
              business={item}
              onPress={() => router.push(`/business/${item.id}` as any)}
              colors={colors}
              isDark={isDark}
            />
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={G} colors={[G]} />}
          ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
          ListHeaderComponent={
            businesses.length > 0 ? (
              <Text style={[styles.resultCount, { color: TEXT3 }]}>
                {businesses.length} business{businesses.length !== 1 ? 'es' : ''} found
                {selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}
                {debouncedSearch ? ` for "${debouncedSearch}"` : ''}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={[styles.emptyState, { backgroundColor: SURF, borderColor: BORDER }]}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.primaryContainer }]}>
                <Ionicons name="storefront-outline" size={38} color={G} />
              </View>
              <Text style={[styles.emptyTitle, { color: TEXT }]}>No Businesses Found</Text>
              <Text style={[styles.emptySub, { color: TEXT3 }]}>
                {debouncedSearch
                  ? `No businesses match "${debouncedSearch}". Try a different search.`
                  : selectedCategory !== 'All'
                  ? `No businesses in "${selectedCategory}" yet.`
                  : 'Be the first to add your business to the directory!'}
              </Text>
              <TouchableOpacity
                style={[styles.emptyAddBtn, { backgroundColor: G }]}
                onPress={handleAddBusiness}
              >
                <Ionicons name="add" size={18} color="#FFF" />
                <Text style={styles.emptyAddBtnText}>Add Your Business</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Floating Add Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: G, shadowColor: G }]}
        onPress={handleAddBusiness}
        activeOpacity={0.85}
        accessibilityLabel="Add my business"
      >
        <Ionicons name="add" size={22} color="#FFF" />
        <Text style={styles.fabText}>Add My Business</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  headerSub: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  myBizBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  // Promo Banner
  promoBanner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  promoTitle: { color: '#FFF', fontSize: 14.5, fontWeight: '800', marginBottom: 2 },
  promoSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12.5, lineHeight: 17 },

  // Search
  searchWrap: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    height: 42, borderRadius: 12, paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 14.5, fontWeight: '400', padding: 0 },

  // Category Filters
  filtersWrap: { borderBottomWidth: StyleSheet.hairlineWidth },
  filtersScroll: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1.5,
  },
  filterChipText: { fontSize: 12.5, fontWeight: '600' },

  // List
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { fontSize: 14, fontWeight: '500' },
  listContent: { padding: 16 },
  resultCount: { fontSize: 12.5, fontWeight: '500', marginBottom: 12 },

  // Business Card
  businessCard: {
    borderRadius: 20, borderWidth: 1, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  cardBannerWrap: { height: 130, position: 'relative' },
  cardBanner: { width: '100%', height: '100%' },
  cardBannerFallback: { alignItems: 'center', justifyContent: 'center' },
  cardCategoryBadge: {
    position: 'absolute', top: 10, left: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  cardCategoryBadgeText: { color: '#FFF', fontSize: 10.5, fontWeight: '700' },
  verifiedBadge: {
    position: 'absolute', top: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 4, borderRadius: 10,
  },
  verifiedText: { fontSize: 10.5, fontWeight: '700' },
  cardBody: { padding: 14, gap: 6 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  cardLogoWrap: {
    width: 42, height: 42, borderRadius: 12, borderWidth: 1,
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
  },
  cardLogo: { width: '100%', height: '100%' },
  cardBusinessName: { fontSize: 15.5, fontWeight: '800', letterSpacing: -0.2 },
  cardOwnerRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  cardOwnerName: { fontSize: 12.5, fontWeight: '500' },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardMetaText: { fontSize: 12.5, flex: 1 },
  cardDescription: { fontSize: 13.5, lineHeight: 19 },
  servicesWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
    marginTop: 2,
  },
  servicesText: { flex: 1, fontSize: 12, fontWeight: '600' },
  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 6, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ratingCount: { fontSize: 12, fontWeight: '500' },
  noReviews: { fontSize: 12 },
  viewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
  },
  viewBtnText: { color: '#FFF', fontSize: 12.5, fontWeight: '700' },

  // Empty State
  emptyState: {
    alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24,
    borderRadius: 20, borderWidth: 1, gap: 10,
  },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginTop: 4,
  },
  emptyAddBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  // FAB
  fab: {
    position: 'absolute', bottom: 20, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 18, paddingVertical: 13, borderRadius: 30,
    ...Platform.select({
      ios: { shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  fabText: { color: '#FFF', fontSize: 14.5, fontWeight: '700' },
});
