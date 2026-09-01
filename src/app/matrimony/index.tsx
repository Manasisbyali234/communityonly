import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useMatrimonyProfilesQuery, useMatrimonyMatchesQuery,
  useMyMatrimonyProfileQuery, MatrimonyFilters,
  MARITAL_STATUS_LABELS, EDUCATION_LABELS, MatrimonyProfile,
  useMatrimonyLikeMatchesQuery, MatrimonyLikeMatch,
} from '../../api/matrimony';
import { useTheme } from '../../theme';

const H_PAD = 14;

const AGE_RANGES = [
  { label: 'Any Age', min: undefined, max: undefined },
  { label: '18–25', min: 18, max: 25 },
  { label: '26–30', min: 26, max: 30 },
  { label: '31–35', min: 31, max: 35 },
  { label: '36–40', min: 36, max: 40 },
  { label: '40+', min: 40, max: undefined },
];

const RELIGION_OPTIONS = ['', 'Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Buddhist', 'Other'];

// ── Shimmer Skeleton ──────────────────────────────────────────────────────────
function Shimmer({ style }: { style?: any }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 850, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 850, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.75] });
  return <Animated.View style={[{ borderRadius: 8, opacity }, style]} />;
}

function SkeletonCard({ colors, cardW }: { colors: any; cardW: number }) {
  return (
    <View style={[styles.card, { width: cardW }]}>
      <Shimmer style={{ width: '100%', aspectRatio: 1 / 1.38, backgroundColor: colors.elevation2, borderRadius: 24 }} />
    </View>
  );
}

// ── Tinder-style Profile Card ─────────────────────────────────────────────────
function ProfileCard({ profile, onPress, onHide, colors, cardW }: {
  profile: MatrimonyProfile; onPress: () => void; onHide: () => void; colors: any; cardW: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const photos = profile.photos?.length ? profile.photos : (profile.avatarUrl ? [profile.avatarUrl] : []);
  const [photoIdx, setPhotoIdx] = useState(0);

  const tapZoneW = cardW / 3;

  const handleTap = (x: number) => {
    if (photos.length <= 1) return;
    if (x < tapZoneW) {
      setPhotoIdx(i => Math.max(0, i - 1));
    } else if (x > cardW - tapZoneW) {
      setPhotoIdx(i => Math.min(photos.length - 1, i + 1));
    }
  };

  const cardPhotoStyle = { width: cardW, height: cardW * 1.38 };

  return (
    <Animated.View style={[styles.card, { width: cardW, transform: [{ scale }] }]}>
      {/* Tappable photo area for navigation + photo cycling */}
      <Pressable
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
        onTouchEnd={(e) => handleTap(e.nativeEvent.locationX)}
      >
        {/* Full-bleed photo */}
        {photos.length > 0 ? (
          <Image source={{ uri: photos[photoIdx] }} style={[styles.cardPhoto, cardPhotoStyle]} contentFit="cover" />
        ) : (
          <View style={[styles.cardPhoto, cardPhotoStyle, { backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name={profile.gender === 'FEMALE' ? 'woman' : 'man'} size={80} color={colors.primary} />
          </View>
        )}

        {/* Photo dots */}
        {photos.length > 1 && (
          <View style={styles.dotsRow}>
            {photos.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: i === photoIdx ? '#fff' : 'rgba(255,255,255,0.45)' },
                  i === photoIdx && styles.dotActive,
                ]}
              />
            ))}
          </View>
        )}

        {/* Top badges */}
        <View style={styles.topBadges}>
          {profile.isVerified && (
            <View style={[styles.verifiedBadge, { backgroundColor: colors.success }]}>
              <Ionicons name="shield-checkmark" size={11} color="#fff" />
              <Text style={styles.badgeText}>Verified</Text>
            </View>
          )}
          {profile.matchScore != null && (
            <View style={[styles.matchBadge, { backgroundColor: colors.primaryDark }]}>
              <Text style={styles.matchScoreText}>{profile.matchScore}%</Text>
              <Text style={styles.matchLabelText}>Match</Text>
            </View>
          )}
        </View>

        {/* Bottom gradient + info */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.88)', 'rgba(0,0,0,0.96)']}
          locations={[0, 0.35, 0.7, 1]}
          style={styles.gradient}
        >
          {/* Name & location */}
          <View style={styles.nameRow}>
            <Text style={styles.cardName}>{profile.displayName}</Text>
            <Text style={styles.cardAge}>{profile.age}</Text>
          </View>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.85)" />
            <Text style={styles.locationText}>{profile.city}, {profile.state}</Text>
          </View>

          {/* Info pills */}
          <View style={styles.pillsRow}>
            {profile.occupation ? (
              <View style={styles.infoPill}>
                <Ionicons name="briefcase-outline" size={11} color="#fff" />
                <Text style={styles.pillText}>{profile.occupation}</Text>
              </View>
            ) : null}
            {profile.education ? (
              <View style={styles.infoPill}>
                <Ionicons name="school-outline" size={11} color="#fff" />
                <Text style={styles.pillText}>{EDUCATION_LABELS[profile.education] ?? profile.education}</Text>
              </View>
            ) : null}
            {profile.religion ? (
              <View style={styles.infoPill}>
                <Ionicons name="prism-outline" size={11} color="#fff" />
                <Text style={styles.pillText}>{profile.religion}</Text>
              </View>
            ) : null}
            <View style={styles.infoPill}>
              <Ionicons name="heart-outline" size={11} color="#fff" />
              <Text style={styles.pillText}>{MARITAL_STATUS_LABELS[profile.maritalStatus]}</Text>
            </View>
          </View>

          {profile.aboutMe ? (
            <Text style={styles.aboutText} numberOfLines={2}>{profile.aboutMe}</Text>
          ) : null}

          {/* Action buttons — rendered outside Pressable to prevent event capture */}
          <View style={styles.actionRow} />
        </LinearGradient>
      </Pressable>

      {/* Action buttons outside Pressable so onHide fires independently */}
      <View style={[styles.actionRowOverlay]}>
        <TouchableOpacity style={[styles.actionBtn, styles.passBtn]} onPress={onHide}>
          <Ionicons name="close" size={26} color="#FF6B6B" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.infoBtn]} onPress={onPress}>
          <Ionicons name="information-circle-outline" size={22} color="#fff" />
          <Text style={styles.infoBtnText}>View Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.likeBtn]} onPress={onPress}>
          <Ionicons name="heart" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

type TabKey = 'discover' | 'matches' | 'liked';

export default function MatrimonyScreen() {
  const { width: screenW } = useWindowDimensions();
  const cardW = Math.min(screenW - H_PAD * 2, 480);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabKey>('discover');
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<MatrimonyFilters>({});
  const [ageRangeIdx, setAgeRangeIdx] = useState(0);

  const { data: myProfile, isLoading: myProfileLoading, isError: myProfileError } = useMyMatrimonyProfileQuery();

  // Derive explicit profile status — never fall back to REJECTED for unknown/error states
  const profileStatus: 'NO_PROFILE' | 'PENDING' | 'APPROVED' | 'REJECTED' = (() => {
    if (!myProfile || !myProfile.id) return 'NO_PROFILE';
    if (myProfile.approvalStatus === 'APPROVED') return 'APPROVED';
    if (myProfile.approvalStatus === 'PENDING') return 'PENDING';
    if (myProfile.approvalStatus === 'REJECTED') return 'REJECTED';
    return 'PENDING'; // safe default for unknown status on existing profile
  })();

  const isApproved = profileStatus === 'APPROVED';
  const { data: profiles = [], isLoading } = useMatrimonyProfilesQuery({ ...filters, search: query || undefined }, isApproved);
  const { data: matches = [], isLoading: matchesLoading } = useMatrimonyMatchesQuery(isApproved);
  const { data: likeMatches = [], isLoading: likeMatchesLoading } = useMatrimonyLikeMatchesQuery(isApproved);

  const applyAgeRange = (idx: number) => {
    setAgeRangeIdx(idx);
    const r = AGE_RANGES[idx];
    setFilters(f => ({ ...f, minAge: r.min, maxAge: r.max }));
  };

  const list = activeTab === 'matches' ? matches : profiles;
  const loading = activeTab === 'matches' ? matchesLoading : activeTab === 'liked' ? likeMatchesLoading : isLoading;

  // ── Gate: show loading spinner ─────────────────────────────────────────────
  if (myProfileLoading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (myProfileError) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="alert-circle-outline" size={44} color={colors.textMuted} />
        <Text style={[styles.gateTitle, { color: colors.text, marginTop: 12 }]}>Something went wrong</Text>
        <Text style={[styles.gateSub, { color: colors.textSecondary }]}>Could not load your profile. Please try again.</Text>
      </View>
    );
  }

  if (profileStatus !== 'APPROVED') {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.header, { backgroundColor: colors.primaryDark }]}>
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: 'rgba(255,255,255,0.18)' }]}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as any))}
          >
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mana Sangama 💍</Text>
        </View>
        <View style={styles.gateContainer}>
          <View style={[styles.gateIconWrap, { backgroundColor: colors.primaryContainer }]}>
            <Ionicons
              name={profileStatus === 'REJECTED' ? 'close-circle-outline' : profileStatus === 'PENDING' ? 'time-outline' : 'lock-closed'}
              size={44}
              color={profileStatus === 'REJECTED' ? colors.error ?? '#EF4444' : colors.primary}
            />
          </View>
          {profileStatus === 'NO_PROFILE' && (
            <>
              <Text style={[styles.gateTitle, { color: colors.text }]}>Create Your Profile First</Text>
              <Text style={[styles.gateSub, { color: colors.textSecondary }]}>
                You need to create and get your matrimony profile approved by admin before you can browse and connect with others.
              </Text>
              <TouchableOpacity
                style={[styles.gateBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/matrimony/create-profile' as any)}
              >
                <Ionicons name="person-add-outline" size={18} color="#fff" />
                <Text style={styles.gateBtnText}>Create Profile</Text>
              </TouchableOpacity>
            </>
          )}
          {profileStatus === 'PENDING' && (
            <>
              <Text style={[styles.gateTitle, { color: colors.text }]}>Profile Under Review</Text>
              <Text style={[styles.gateSub, { color: colors.textSecondary }]}>
                Your profile is awaiting admin approval. You will be able to browse and connect with others once approved.
              </Text>
              <TouchableOpacity
                style={[styles.gateBtn, { backgroundColor: colors.primaryContainer }]}
                onPress={() => router.push(`/matrimony/${myProfile!.id}` as any)}
              >
                <Ionicons name="eye-outline" size={18} color={colors.primary} />
                <Text style={[styles.gateBtnText, { color: colors.primary }]}>View My Profile</Text>
              </TouchableOpacity>
            </>
          )}
          {profileStatus === 'REJECTED' && (
            <>
              <Text style={[styles.gateTitle, { color: colors.text }]}>Profile Rejected</Text>
              <Text style={[styles.gateSub, { color: colors.textSecondary }]}>
                {myProfile!.rejectionReason
                  ? `Your profile was rejected: ${myProfile!.rejectionReason}`
                  : 'Your profile was rejected. Please update and resubmit for approval.'}
              </Text>
              <TouchableOpacity
                style={[styles.gateBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/matrimony/create-profile' as any)}
              >
                <Ionicons name="create-outline" size={18} color="#fff" />
                <Text style={styles.gateBtnText}>Update Profile</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primaryDark }]}>
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: 'rgba(255,255,255,0.18)' }]}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as any))}
        >
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Mana Sangama 💍</Text>
          <Text style={styles.headerSub}>
            {loading ? 'Loading...' : `${list.length} profiles found`}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: 'rgba(255,255,255,0.18)' }]}
          onPress={() => router.push('/matrimony/interests' as any)}
        >
          <Ionicons name="heart-outline" size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: 'rgba(255,255,255,0.18)' }]}
          onPress={() => {
            if (myProfileLoading) return;
            const dest = myProfile?.id ? `/matrimony/${myProfile.id}` : '/matrimony/create-profile';
            router.push(dest as any);
          }}
        >
          <Ionicons name="person-circle-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
          {([
            { key: 'discover', label: 'Discover', icon: 'search-outline' },
            { key: 'matches', label: 'Best Matches', icon: 'heart-outline' },
            { key: 'liked', label: 'Liked Matches', icon: 'chatbubble-ellipses-outline' },
          ] as { key: TabKey; label: string; icon: any }[]).map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 }]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons name={tab.icon} size={15} color={activeTab === tab.key ? colors.primary : colors.textMuted} />
              <Text style={[styles.tabText, { color: activeTab === tab.key ? colors.primary : colors.textMuted }]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.tab, { borderBottomWidth: 2.5, borderBottomColor: 'transparent' }]}
            onPress={() => router.push('/matrimony/interests' as any)}
          >
            <Ionicons name="mail-outline" size={15} color={colors.textMuted} />
            <Text style={[styles.tabText, { color: colors.textMuted }]}>Interests</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Search + filter */}
      <View style={[styles.searchSection, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.elevation1, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={17} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, city, caste..."
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            onSubmitEditing={() => setQuery(search)}
          />
          {search ? (
            <TouchableOpacity onPress={() => { setSearch(''); setQuery(''); }}>
              <Ionicons name="close-circle" size={17} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, { backgroundColor: showFilters ? colors.primary : colors.primaryContainer, borderColor: colors.primary }]}
          onPress={() => setShowFilters(v => !v)}
        >
          <Ionicons name="options-outline" size={18} color={showFilters ? '#fff' : colors.primary} />
        </TouchableOpacity>
      </View>



      {/* Filters panel */}
      {showFilters && (
        <View style={[styles.filtersPanel, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Age Range</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
            {AGE_RANGES.map((r, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.chip, { backgroundColor: ageRangeIdx === i ? colors.primary : colors.primaryContainer, borderColor: colors.primary }]}
                onPress={() => applyAgeRange(i)}
              >
                <Text style={[styles.chipText, { color: ageRangeIdx === i ? '#fff' : colors.primary }]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={[styles.filterLabel, { color: colors.textSecondary, marginTop: 10 }]}>Religion</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
            {RELIGION_OPTIONS.map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.chip, { backgroundColor: filters.religion === (r || undefined) ? colors.primary : colors.primaryContainer, borderColor: colors.primary }]}
                onPress={() => setFilters(f => ({ ...f, religion: r || undefined }))}
              >
                <Text style={[styles.chipText, { color: filters.religion === (r || undefined) ? '#fff' : colors.primary }]}>
                  {r || 'Any Religion'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Results bar */}
      {!loading && (
        <View style={styles.resultsBar}>
          <Text style={[styles.resultsText, { color: colors.textMuted }]}>
            {list.length} {activeTab === 'matches' ? 'best matches' : 'profiles'}
          </Text>
          {!myProfile && (
            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: colors.primaryContainer }]}
              onPress={() => router.push('/matrimony/create-profile' as any)}
            >
              <Ionicons name="add" size={13} color={colors.primary} />
              <Text style={[styles.createBtnText, { color: colors.primary }]}>Create Profile</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Pending approval banner */}
      {myProfile && myProfile.approvalStatus === 'PENDING' && (
        <View style={{ marginHorizontal: 14, marginBottom: 8, padding: 12, borderRadius: 12, backgroundColor: '#FEF9C3', borderWidth: 1, borderColor: '#EAB308', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="time-outline" size={18} color="#92400E" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#92400E' }}>Profile Under Review</Text>
            <Text style={{ fontSize: 11, color: '#92400E', marginTop: 2 }}>Your profile is awaiting admin approval before you can browse and connect with others.</Text>
          </View>
        </View>
      )}

      {/* Cards list */}
      {activeTab === 'liked' ? (
        likeMatchesLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : likeMatches.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.primaryContainer }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={38} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No matches yet</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Like profiles to get mutual matches and start chatting.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {(likeMatches as MatrimonyLikeMatch[]).map((m) => (
              <View key={m.matchId} style={[styles.matchCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.matchCardLeft}>
                  {m.profile.photos?.[0] || m.profile.avatarUrl ? (
                    <Image
                      source={{ uri: (m.profile.photos?.[0] ?? m.profile.avatarUrl)! }}
                      style={styles.matchAvatar}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.matchAvatar, { backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center' }]}>
                      <Ionicons name="person" size={28} color={colors.primary} />
                    </View>
                  )}
                </View>
                <View style={styles.matchCardInfo}>
                  <Text style={[styles.matchName, { color: colors.text }]}>{m.profile.displayName}</Text>
                  <Text style={[styles.matchSub, { color: colors.textSecondary }]}>
                    {m.profile.age ? `${m.profile.age} yrs` : ''}{m.profile.city ? ` • ${m.profile.city}` : ''}
                  </Text>
                  {m.profile.occupation ? (
                    <Text style={[styles.matchSub, { color: colors.textMuted }]} numberOfLines={1}>{m.profile.occupation}</Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={[styles.chatBtn, { backgroundColor: colors.primaryContainer }]}
                  onPress={() => router.push(`/matrimony/${m.profile.id}` as any)}
                >
                  <Ionicons name="eye-outline" size={16} color={colors.primary} />
                  <Text style={[styles.chatBtnText, { color: colors.primary }]}>View</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )
      ) : loading ? (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {[1, 2].map(i => <SkeletonCard key={i} colors={colors} cardW={cardW} />)}
        </ScrollView>
      ) : list.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.primaryContainer }]}>
            <Ionicons name="heart-outline" size={38} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No profiles found</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Try adjusting your filters or search.</Text>
          <TouchableOpacity
            style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
            onPress={() => { setFilters({}); setAgeRangeIdx(0); setSearch(''); setQuery(''); }}
          >
            <Text style={styles.emptyBtnText}>Reset Filters</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
        >
          {list.filter(p => !hiddenIds.has(p.id)).map(profile => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              colors={colors}
              cardW={cardW}
              onPress={() => router.push(`/matrimony/${profile.id}` as any)}
              onHide={() => setHiddenIds(prev => new Set(prev).add(profile.id))}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 12,
  },
  headerBtn: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 },

  tabBar: { borderBottomWidth: 1 },
  tabScrollContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  tab: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 11, paddingHorizontal: 14,
    borderBottomWidth: 2.5, borderBottomColor: 'transparent',
  },
  tabText: { fontSize: 12, fontWeight: '600' },

  searchSection: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1,
  },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 10, height: 42,
    minWidth: 0,
  },
  searchInput: { flex: 1, fontSize: 13, minWidth: 0 },
  filterBtn: {
    width: 42, height: 42, borderRadius: 10,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },


  filtersPanel: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  filterLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5 },
  chipText: { fontSize: 12, fontWeight: '600' },

  resultsBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 8, flexWrap: 'nowrap',
  },
  resultsText: { fontSize: 12, fontWeight: '500' },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  createBtnText: { fontSize: 12, fontWeight: '700' },

  list: { paddingHorizontal: H_PAD, paddingTop: 8, paddingBottom: 40, gap: 20, alignItems: 'center', width: '100%' },

  // ── Tinder Card ──────────────────────────────────────────────────────────────
  card: {
    borderRadius: 24, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20 },
      android: { elevation: 10 },
    }),
  },
  cardPhoto: {},  // width/height set dynamically per card

  dotsRow: {
    position: 'absolute', top: 12, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 5,
  },
  dot: { height: 3, borderRadius: 2, width: 20 },
  dotActive: { width: 28 },

  topBadges: {
    position: 'absolute', top: 28, left: 12, right: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  matchBadge: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  matchScoreText: { color: '#fff', fontSize: 14, fontWeight: '900', lineHeight: 16 },
  matchLabelText: { color: 'rgba(255,255,255,0.8)', fontSize: 9, fontWeight: '600' },

  gradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 100, paddingBottom: 18,
  },

  nameRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 7, marginBottom: 5 },
  cardName: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.3, flexShrink: 1 },
  cardAge: {
    color: 'rgba(255,255,255,0.92)', fontSize: 20, fontWeight: '400',
    marginBottom: 1, flexShrink: 0,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  locationText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '500' },

  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  infoPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  pillText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  aboutText: { color: 'rgba(255,255,255,0.88)', fontSize: 13, lineHeight: 19, marginBottom: 14 },

  actionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, marginTop: 6,
    height: 52, // reserve space so gradient height matches overlay
  },
  actionRowOverlay: {
    position: 'absolute',
    bottom: 18,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  actionBtn: {
    alignItems: 'center', justifyContent: 'center', borderRadius: 50,
  },
  passBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1.5, borderColor: 'rgba(255,107,107,0.75)',
  },
  likeBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)',
  },
  infoBtn: {
    flex: 1, flexDirection: 'row', gap: 6,
    height: 46, borderRadius: 23,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.45)',
  },
  infoBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 24, paddingTop: 40, gap: 10,
  },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { marginTop: 10, paddingHorizontal: 28, paddingVertical: 11, borderRadius: 10, alignSelf: 'center' },
  emptyBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // ── Gate Screen ───────────────────────────────────────────────────────────────
  gateContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 36, gap: 14,
  },
  gateIconWrap: {
    width: 96, height: 96, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  gateTitle: { fontSize: 20, fontWeight: '900', textAlign: 'center' },
  gateSub: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  gateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 8, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14,
  },
  gateBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  // ── Liked Matches Card ────────────────────────────────────────────────────────
  matchCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, borderWidth: 1, padding: 12,
    width: '100%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },
  matchCardLeft: {},
  matchAvatar: { width: 60, height: 60, borderRadius: 30 },
  matchCardInfo: { flex: 1 },
  matchName: { fontSize: 15, fontWeight: '700' },
  matchSub: { fontSize: 12, marginTop: 2 },
  chatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  chatBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
