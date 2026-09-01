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
import {
  usePublicStoriesQuery,
  useFeaturedStoriesQuery,
  STORY_CATEGORIES,
  CommunityStory,
} from '../../api/ourPeople';

function FeaturedStoryCard({
  story,
  onPress,
  colors,
}: {
  story: CommunityStory;
  onPress: () => void;
  colors: any;
}) {
  const catCfg = STORY_CATEGORIES.find((c) => c.id === story.category);

  return (
    <TouchableOpacity
      style={styles.featuredCard}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Image
        source={{ uri: story.featuredImage }}
        style={styles.featuredImage}
        contentFit="cover"
      />
      <View style={styles.featuredGradient} />

      <View style={styles.featuredContent}>
        <View style={styles.featuredBadgeRow}>
          <View style={styles.featuredTag}>
            <Ionicons name="star" size={12} color="#F59E0B" />
            <Text style={styles.featuredTagText}>Featured Story</Text>
          </View>
          <View style={[styles.featuredCatTag, { backgroundColor: (catCfg?.color || '#059669') + 'D0' }]}>
            <Text style={styles.featuredCatEmoji}>{catCfg?.emoji || '🌟'}</Text>
            <Text style={styles.featuredCatText}>{story.category}</Text>
          </View>
        </View>

        <Text style={styles.featuredTitle} numberOfLines={2}>
          {story.title}
        </Text>

        <View style={styles.featuredAuthorRow}>
          {story.personAvatarUrl ? (
            <Image source={{ uri: story.personAvatarUrl }} style={styles.featuredAvatar} contentFit="cover" />
          ) : (
            <View style={[styles.featuredAvatar, { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 11 }}>{story.personName[0]}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.featuredPersonName} numberOfLines={1}>{story.personName}</Text>
            <Text style={styles.featuredProfession} numberOfLines={1}>
              {story.profession} · {story.location}
            </Text>
          </View>
        </View>

        <View style={styles.readMoreRow}>
          <Text style={styles.readTimeText}>{story.readTimeMinutes} min read</Text>
          <View style={styles.readStoryBtn}>
            <Text style={styles.readStoryBtnText}>Read Story</Text>
            <Ionicons name="arrow-forward" size={13} color="#FFF" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function StoryCard({
  story,
  onPress,
  colors,
  isDark,
}: {
  story: CommunityStory;
  onPress: () => void;
  colors: any;
  isDark: boolean;
}) {
  const catCfg = STORY_CATEGORIES.find((c) => c.id === story.category);
  const formattedDate = new Date(story.publishedAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.cardBg,
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      {/* Cover Image */}
      <View style={styles.cardImageWrap}>
        <Image
          source={{ uri: story.featuredImage }}
          style={styles.cardImage}
          contentFit="cover"
        />
        <View style={[styles.cardCatBadge, { backgroundColor: (catCfg?.color || colors.primary) }]}>
          <Text style={styles.cardCatEmoji}>{catCfg?.emoji || '🌟'}</Text>
          <Text style={styles.cardCatText}>{story.category}</Text>
        </View>
      </View>

      {/* Card Content */}
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
          {story.title}
        </Text>

        <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={2}>
          {story.shortDescription}
        </Text>

        {/* Profile line */}
        <View style={styles.profileRow}>
          {story.personAvatarUrl ? (
            <Image source={{ uri: story.personAvatarUrl }} style={styles.profileAvatar} contentFit="cover" />
          ) : (
            <View style={[styles.profileAvatar, { backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 11 }}>{story.personName[0]}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.personName, { color: colors.text }]} numberOfLines={1}>
              {story.personName}
            </Text>
            <Text style={[styles.personMeta, { color: colors.textMuted }]} numberOfLines={1}>
              {story.profession} · {story.location}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={[styles.cardFooter, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
          <View style={styles.dateMeta}>
            <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
            <Text style={[styles.dateText, { color: colors.textMuted }]}>{formattedDate}</Text>
            <Text style={[styles.dot, { color: colors.textMuted }]}>•</Text>
            <Text style={[styles.dateText, { color: colors.textMuted }]}>{story.readTimeMinutes} min read</Text>
          </View>

          <View style={[styles.ctaBtn, { backgroundColor: colors.primaryContainer }]}>
            <Text style={[styles.ctaBtnText, { color: colors.primary }]}>Read</Text>
            <Ionicons name="chevron-forward" size={13} color={colors.primary} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function OurPeopleScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [refreshing, setRefreshing] = useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: featuredStories = [] } = useFeaturedStoriesQuery();
  const { data: stories = [], isLoading, refetch } = usePublicStoriesQuery(
    useMemo(
      () => ({
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        search: debouncedSearch || undefined,
      }),
      [selectedCategory, debouncedSearch]
    )
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const G = colors.primary;
  const BG = colors.background;
  const SURF = colors.surface;
  const BORDER = colors.border;
  const TEXT = colors.text;
  const TEXT3 = colors.textMuted;

  const topFeatured = featuredStories[0];

  return (
    <View style={[styles.root, { backgroundColor: BG, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: SURF, borderBottomColor: BORDER }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.primaryContainer }]}
          onPress={() => router.replace('/(tabs)/explore?tab=stories' as any)}
          accessibilityLabel="Go back to discover"
        >
          <Ionicons name="arrow-back" size={19} color={G} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: TEXT }]}>Our People</Text>
          <Text style={[styles.headerSub, { color: TEXT3 }]}>
            Inspiring journeys & contributions from our community
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchWrap, { backgroundColor: SURF, borderBottomColor: BORDER }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.inputBg }]}>
          <Ionicons name="search" size={16} color={TEXT3} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search stories, people, achievements..."
            placeholderTextColor={TEXT3}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: TEXT }]}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); setDebouncedSearch(''); }}>
              <Ionicons name="close-circle" size={16} color={TEXT3} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Pills */}
      <View style={[styles.categoriesWrap, { backgroundColor: SURF, borderBottomColor: BORDER }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          <TouchableOpacity
            onPress={() => setSelectedCategory('All')}
            style={[
              styles.catChip,
              {
                backgroundColor: selectedCategory === 'All' ? G : isDark ? 'rgba(255,255,255,0.06)' : colors.surfaceSecondary,
                borderColor: selectedCategory === 'All' ? G : BORDER,
              },
            ]}
          >
            <Text style={[styles.catChipText, { color: selectedCategory === 'All' ? '#FFF' : TEXT3 }]}>
              All Stories
            </Text>
          </TouchableOpacity>

          {STORY_CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCategory(cat.id)}
                style={[
                  styles.catChip,
                  {
                    backgroundColor: active ? cat.color : isDark ? 'rgba(255,255,255,0.06)' : colors.surfaceSecondary,
                    borderColor: active ? cat.color : BORDER,
                  },
                ]}
              >
                <Text style={{ fontSize: 13 }}>{cat.emoji}</Text>
                <Text style={[styles.catChipText, { color: active ? '#FFF' : TEXT }]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content List */}
      {isLoading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={G} />
          <Text style={[styles.loadingText, { color: TEXT3 }]}>Loading community stories...</Text>
        </View>
      ) : (
        <FlatList
          data={stories}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <StoryCard
              story={item}
              onPress={() => router.push(`/our-people/${item.id}` as any)}
              colors={colors}
              isDark={isDark}
            />
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 90 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={G} colors={[G]} />}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          ListHeaderComponent={
            topFeatured && selectedCategory === 'All' && !debouncedSearch ? (
              <View style={{ marginBottom: 18 }}>
                <FeaturedStoryCard
                  story={topFeatured}
                  onPress={() => router.push(`/our-people/${topFeatured.id}` as any)}
                  colors={colors}
                />
                <Text style={[styles.allStoriesHeading, { color: TEXT }]}>All Community Stories</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={[styles.emptyBox, { backgroundColor: SURF, borderColor: BORDER }]}>
              <View style={[styles.emptyIconBg, { backgroundColor: colors.primaryContainer }]}>
                <Ionicons name="book-outline" size={40} color={G} />
              </View>
              <Text style={[styles.emptyTitle, { color: TEXT }]}>No Stories Found</Text>
              <Text style={[styles.emptySub, { color: TEXT3 }]}>
                {debouncedSearch
                  ? `No stories match "${debouncedSearch}". Try another search.`
                  : selectedCategory !== 'All'
                  ? `No stories in "${selectedCategory}" right now.`
                  : 'New inspiring stories are added regularly. Check back soon!'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  headerSub: { fontSize: 11.5, fontWeight: '500', marginTop: 1 },

  searchWrap: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    height: 40, borderRadius: 12, paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 13.5, padding: 0 },

  categoriesWrap: { borderBottomWidth: StyleSheet.hairlineWidth },
  catScroll: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5,
  },
  catChipText: { fontSize: 12.5, fontWeight: '600' },

  listContent: { padding: 16 },
  centerLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { fontSize: 13.5, fontWeight: '500' },
  allStoriesHeading: { fontSize: 16, fontWeight: '800', marginTop: 8, marginBottom: -4 },

  // Featured Story Card
  featuredCard: {
    height: 280, borderRadius: 22, overflow: 'hidden', position: 'relative',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 5 },
    }),
  },
  featuredImage: { width: '100%', height: '100%' },
  featuredGradient: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  featuredContent: {
    position: 'absolute', bottom: 0, left: 0, right: 0, top: 0,
    padding: 16, justifyContent: 'flex-end', gap: 10,
  },
  featuredBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featuredTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  featuredTagText: { color: '#F59E0B', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  featuredCatTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  featuredCatEmoji: { fontSize: 11 },
  featuredCatText: { color: '#FFF', fontSize: 11, fontWeight: '700' },

  featuredTitle: { color: '#FFF', fontSize: 18, fontWeight: '800', lineHeight: 24 },
  featuredAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featuredAvatar: { width: 30, height: 30, borderRadius: 15, overflow: 'hidden' },
  featuredPersonName: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  featuredProfession: { color: 'rgba(255,255,255,0.85)', fontSize: 11.5 },

  readMoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  readTimeText: { color: 'rgba(255,255,255,0.8)', fontSize: 11.5, fontWeight: '600' },
  readStoryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#059669', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
  },
  readStoryBtnText: { color: '#FFF', fontSize: 12.5, fontWeight: '700' },

  // Story Card
  card: {
    borderRadius: 18, borderWidth: 1, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  cardImageWrap: { height: 160, position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  cardCatBadge: {
    position: 'absolute', top: 10, left: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  cardCatEmoji: { fontSize: 11 },
  cardCatText: { color: '#FFF', fontSize: 11, fontWeight: '700' },

  cardBody: { padding: 14, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '800', lineHeight: 22 },
  cardDesc: { fontSize: 13, lineHeight: 18 },

  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  profileAvatar: { width: 28, height: 28, borderRadius: 14, overflow: 'hidden' },
  personName: { fontSize: 13, fontWeight: '700' },
  personMeta: { fontSize: 11.5 },

  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 4,
  },
  dateMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dateText: { fontSize: 11.5 },
  dot: { fontSize: 11.5 },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  ctaBtnText: { fontSize: 12, fontWeight: '700' },

  // Empty
  emptyBox: {
    alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24,
    borderRadius: 18, borderWidth: 1, gap: 10, marginTop: 10,
  },
  emptyIconBg: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
