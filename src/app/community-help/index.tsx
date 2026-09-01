import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  TextInput, FlatList, ActivityIndicator, RefreshControl, Platform, Modal, Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { confirmAction } from '../../store/confirmStore';
import {
  usePublicHelpRequestsQuery,
  useOfferHelpMutation,
  useReportHelpRequestMutation,
  HELP_CATEGORIES,
  HelpRequest,
  HelpCategory,
  HelpUrgency,
  HelpReport,
} from '../../api/communityHelp';

function HelpCard({
  item,
  onPress,
  onOfferHelp,
  onReport,
  colors,
  isDark,
  hasOfferedHelp,
  isMyRequest,
}: {
  item: HelpRequest;
  onPress: () => void;
  onOfferHelp: (item: HelpRequest) => void;
  onReport: (item: HelpRequest) => void;
  colors: any;
  isDark: boolean;
  hasOfferedHelp: boolean;
  isMyRequest: boolean;
}) {
  const catConfig = HELP_CATEGORIES.find((c) => c.id === item.category);
  const isUrgent = item.urgency === 'URGENT';
  const timeAgo = new Date(item.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.cardBg,
          borderColor: isUrgent
            ? isDark ? 'rgba(239,68,68,0.4)' : '#FECACA'
            : isDark ? 'rgba(255,255,255,0.08)' : colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Top row: Category, Urgency & Report Menu */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View
            style={[
              styles.catPill,
              { backgroundColor: (catConfig?.color || colors.primary) + '15' },
            ]}
          >
            <Text style={styles.catEmoji}>{catConfig?.emoji || '🤝'}</Text>
            <Text
              style={[
                styles.catText,
                { color: catConfig?.color || colors.primary },
              ]}
            >
              {item.category}
            </Text>
          </View>

          {isUrgent && (
            <View style={styles.urgentPill}>
              <View style={styles.urgentDot} />
              <Text style={styles.urgentText}>Urgent</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={() => onReport(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.moreBtn}
        >
          <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Title */}
      <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
        {item.title}
      </Text>

      {/* Description */}
      <Text
        style={[styles.cardDesc, { color: colors.textSecondary }]}
        numberOfLines={3}
      >
        {item.description}
      </Text>

      {/* Metadata Row: Location & Date */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={13} color={colors.textMuted} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.location}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={13} color={colors.textMuted} />
          <Text style={[styles.metaText, { color: colors.textMuted }]}>
            {timeAgo}
          </Text>
        </View>
      </View>

      {/* Requester Badge */}
      <View style={[styles.requesterBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F9FAFB', borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }]}>
        <View style={styles.requesterInfo}>
          {item.requesterAvatarUrl ? (
            <Image
              source={{ uri: item.requesterAvatarUrl }}
              style={styles.requesterAvatar}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.requesterAvatar, { backgroundColor: colors.primaryContainer, justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 11 }}>
                {item.requesterName[0]?.toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={[styles.requesterName, { color: colors.text }]} numberOfLines={1}>
            Posted by <Text style={{ fontWeight: '700' }}>{item.requesterName}</Text>
          </Text>
        </View>

        {item.helpers.length > 0 && (
          <View style={styles.helperCountTag}>
            <Ionicons name="people" size={12} color="#059669" />
            <Text style={styles.helperCountText}>
              {item.helpers.length} offered help
            </Text>
          </View>
        )}
      </View>

      {/* Footer CTA: "I Can Help" & "View Details" */}
      <View style={[styles.cardFooter, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
        {isMyRequest ? (
          <View style={[styles.myRequestBadge, { backgroundColor: colors.primaryContainer }]}>
            <Ionicons name="person-circle-outline" size={15} color={colors.primary} />
            <Text style={[styles.myRequestText, { color: colors.primary }]}>Your Request</Text>
          </View>
        ) : hasOfferedHelp ? (
          <View style={styles.offeredBadge}>
            <Ionicons name="checkmark-circle" size={15} color="#059669" />
            <Text style={styles.offeredText}>You offered help</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.helpBtn,
              { backgroundColor: isUrgent ? '#DC2626' : colors.primary },
            ]}
            onPress={() => onOfferHelp(item)}
            activeOpacity={0.85}
          >
            <Ionicons name="heart" size={15} color="#FFF" />
            <Text style={styles.helpBtnText}>I Can Help</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.detailsLink}
          onPress={onPress}
          activeOpacity={0.7}
        >
          <Text style={[styles.detailsLinkText, { color: colors.primary }]}>
            View Details
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function CommunityHelpScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.showToast);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [onlyUrgent, setOnlyUrgent] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Report modal state
  const [reportingItem, setReportingItem] = useState<HelpRequest | null>(null);
  const [reportReason, setReportReason] = useState<HelpReport['reason']>('Fake / Suspicious');
  const [reportDetails, setReportDetails] = useState('');

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: requests = [], isLoading, refetch } = usePublicHelpRequestsQuery(
    useMemo(
      () => ({
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        urgency: onlyUrgent ? 'URGENT' : undefined,
        search: debouncedSearch || undefined,
      }),
      [selectedCategory, onlyUrgent, debouncedSearch]
    )
  );

  const offerHelpMutation = useOfferHelpMutation();
  const reportMutation = useReportHelpRequestMutation();

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleOfferHelp = async (item: HelpRequest) => {
    if (!user) {
      router.push('/(auth)/login' as any);
      return;
    }

    const confirmed = await confirmAction({
      title: 'Offer Help?',
      message: 'Your contact interest will be shared with the person who created this request.',
      confirmText: 'I Can Help',
      cancelText: 'Cancel',
      isDestructive: false,
      icon: 'heart-outline',
    });

    if (!confirmed) return;

    try {
      await offerHelpMutation.mutateAsync({
        requestId: item.id,
        helperName: user.displayName || 'Community Member',
        helperAvatarUrl: user.avatarUrl,
        helperPhone: user.phoneNumber,
        message: 'I am ready to help with this request.',
      });
      showToast('Thank you! The requester has been notified.', 'success');
    } catch {
      showToast('Failed to submit offer. Please try again.', 'error');
    }
  };

  const handleOpenReport = (item: HelpRequest) => {
    setReportingItem(item);
    setReportReason('Fake / Suspicious');
    setReportDetails('');
  };

  const handleSubmitReport = async () => {
    if (!reportingItem) return;
    try {
      await reportMutation.mutateAsync({
        requestId: reportingItem.id,
        reason: reportReason,
        details: reportDetails.trim() || undefined,
      });
      setReportingItem(null);
      showToast('Report submitted for admin review.', 'success');
    } catch {
      showToast('Failed to submit report.', 'error');
    }
  };

  const G = colors.primary;
  const BG = colors.background;
  const SURF = colors.surface;
  const BORDER = colors.border;
  const TEXT = colors.text;
  const TEXT3 = colors.textMuted;

  return (
    <View style={[styles.root, { backgroundColor: BG, paddingTop: insets.top }]}>
      {/* ── Header ────────────────────────────────────────────── */}
      <View style={[styles.header, { backgroundColor: SURF, borderBottomColor: BORDER }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.primaryContainer }]}
          onPress={() => router.replace('/(tabs)/explore?tab=help' as any)}
          accessibilityLabel="Go back to discover"
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={19} color={G} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: TEXT }]}>Community Help</Text>
          <Text style={[styles.headerSub, { color: TEXT3 }]}>
            {isLoading ? 'Loading requests...' : `${requests.length} active request${requests.length !== 1 ? 's' : ''}`}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.myRequestsBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.primaryContainer }]}
          onPress={() => router.push('/community-help/my-requests' as any)}
          accessibilityLabel="My help requests"
          activeOpacity={0.75}
        >
          <Ionicons name="hand-left-outline" size={17} color={G} />
        </TouchableOpacity>
      </View>

      {/* ── Modern Hero Banner Card ───────────────────────────── */}
      <LinearGradient
        colors={isDark ? ['#14532D', '#052E16'] : ['#16A34A', '#15803D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroTopRow}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Direct Member Help</Text>
            <Text style={styles.heroSub}>
              All requests are verified by admins · Connect directly with people in need
            </Text>
          </View>
        </View>

        <View style={styles.heroActionRow}>
          <TouchableOpacity
            style={styles.heroPrimaryBtn}
            onPress={() => router.push('/(tabs)/community-help/create' as any)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={16} color="#15803D" />
            <Text style={styles.heroPrimaryBtnText}>Request Help</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.heroSecondaryBtn}
            onPress={() => router.push('/community-help/my-requests' as any)}
            activeOpacity={0.85}
          >
            <Ionicons name="hand-left-outline" size={14} color="#FFFFFF" />
            <Text style={styles.heroSecondaryBtnText}>My Requests</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── Search & Urgency Filter Row ───────────────────────── */}
      <View style={styles.controlsWrap}>
        <View style={[styles.searchBox, { backgroundColor: colors.inputBg, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]}>
          <Ionicons name="search" size={16} color={TEXT3} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search by title, location, need..."
            placeholderTextColor={TEXT3}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: TEXT }]}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {search.length > 0 && Platform.OS === 'android' && (
            <TouchableOpacity onPress={() => { setSearch(''); setDebouncedSearch(''); }}>
              <Ionicons name="close-circle" size={16} color={TEXT3} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.urgentToggleBtn,
            {
              backgroundColor: onlyUrgent ? '#DC2626' : isDark ? 'rgba(255,255,255,0.06)' : colors.cardBg,
              borderColor: onlyUrgent ? '#DC2626' : isDark ? 'rgba(255,255,255,0.08)' : colors.border,
            },
          ]}
          onPress={() => setOnlyUrgent((prev) => !prev)}
          activeOpacity={0.75}
        >
          <Ionicons
            name={onlyUrgent ? 'alert-circle' : 'alert-circle-outline'}
            size={16}
            color={onlyUrgent ? '#FFF' : '#DC2626'}
          />
          <Text style={[styles.urgentToggleText, { color: onlyUrgent ? '#FFF' : TEXT }]}>
            Urgent Only
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Category Chips ────────────────────────────────────── */}
      <View style={styles.categoriesWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catScroll}
        >
          <TouchableOpacity
            onPress={() => setSelectedCategory('All')}
            style={[
              styles.catChip,
              {
                backgroundColor: selectedCategory === 'All' ? G : isDark ? 'rgba(255,255,255,0.06)' : colors.cardBg,
                borderColor: selectedCategory === 'All' ? G : isDark ? 'rgba(255,255,255,0.08)' : colors.border,
              },
            ]}
            activeOpacity={0.75}
          >
            <Text style={[styles.catChipText, { color: selectedCategory === 'All' ? '#FFF' : TEXT3 }]}>
              All Requests
            </Text>
          </TouchableOpacity>

          {HELP_CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCategory(cat.id)}
                style={[
                  styles.catChip,
                  {
                    backgroundColor: active ? cat.color : isDark ? 'rgba(255,255,255,0.06)' : colors.cardBg,
                    borderColor: active ? cat.color : isDark ? 'rgba(255,255,255,0.08)' : colors.border,
                  },
                ]}
                activeOpacity={0.75}
              >
                <Text style={styles.catChipEmoji}>{cat.emoji}</Text>
                <Text style={[styles.catChipText, { color: active ? '#FFF' : TEXT }]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Requests Feed List ────────────────────────────────── */}
      {isLoading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={G} />
          <Text style={[styles.loadingText, { color: TEXT3 }]}>Loading help requests...</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const hasOfferedHelp = item.helpers.some((h) => h.helperId === (user?.id || 'current-user'));
            const isMyRequest = item.userId === (user?.id || 'current-user');
            return (
              <HelpCard
                item={item}
                onPress={() => router.push(`/community-help/${item.id}` as any)}
                onOfferHelp={handleOfferHelp}
                onReport={handleOpenReport}
                colors={colors}
                isDark={isDark}
                hasOfferedHelp={hasOfferedHelp}
                isMyRequest={isMyRequest}
              />
            );
          }}
          contentContainerStyle={[styles.listContainer, { paddingBottom: insets.bottom + 90 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={G}
              colors={[G]}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
          ListEmptyComponent={
            <View style={[styles.emptyBox, { backgroundColor: colors.cardBg, borderColor: BORDER }]}>
              <View style={[styles.emptyIconBg, { backgroundColor: colors.primaryContainer }]}>
                <Ionicons name="heart-outline" size={36} color={G} />
              </View>
              <Text style={[styles.emptyTitle, { color: TEXT }]}>No Help Requests Found</Text>
              <Text style={[styles.emptySub, { color: TEXT3 }]}>
                {debouncedSearch
                  ? `No requests match "${debouncedSearch}". Try a different keyword.`
                  : selectedCategory !== 'All'
                  ? `No requests under "${selectedCategory}" at this time.`
                  : 'There are currently no active help requests in the community.'}
              </Text>
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: G }]}
                onPress={() => router.push('/(tabs)/community-help/create' as any)}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={18} color="#FFF" />
                <Text style={styles.emptyBtnText}>Post a Help Request</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}



      {/* ── Report Modal ──────────────────────────────────────── */}
      <Modal
        visible={!!reportingItem}
        transparent
        animationType="fade"
        onRequestClose={() => setReportingItem(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setReportingItem(null)}>
          <Pressable
            style={[styles.modalContent, { backgroundColor: colors.cardBg }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: TEXT }]}>Report Request</Text>
              <TouchableOpacity onPress={() => setReportingItem(null)}>
                <Ionicons name="close" size={20} color={TEXT3} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Why are you reporting "{reportingItem?.title}"?
            </Text>

            {(['Fake / Suspicious', 'Incorrect Information', 'Inappropriate Content', 'Other'] as HelpReport['reason'][]).map((r) => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.reportOption,
                  {
                    backgroundColor: reportReason === r ? (isDark ? 'rgba(239,68,68,0.15)' : '#FEF2F2') : 'transparent',
                    borderColor: reportReason === r ? '#DC2626' : BORDER,
                  },
                ]}
                onPress={() => setReportReason(r)}
              >
                <Text style={[styles.reportOptionText, { color: reportReason === r ? '#DC2626' : TEXT }]}>
                  {r}
                </Text>
                {reportReason === r && <Ionicons name="checkmark-circle" size={18} color="#DC2626" />}
              </TouchableOpacity>
            ))}

            <TextInput
              style={[
                styles.reportInput,
                { color: TEXT, backgroundColor: colors.inputBg, borderColor: BORDER },
              ]}
              placeholder="Additional details (optional)..."
              placeholderTextColor={TEXT3}
              value={reportDetails}
              onChangeText={setReportDetails}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }]}
                onPress={() => setReportingItem(null)}
              >
                <Text style={[styles.modalBtnText, { color: TEXT }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#DC2626' }]}
                onPress={handleSubmitReport}
                disabled={reportMutation.isPending}
              >
                {reportMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Submit Report</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: { flex: 1 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 2,
  },
  myRequestsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero Card
  heroCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
    padding: 16,
    borderRadius: 18,
    ...Platform.select({
      ios: { shadowColor: '#16A34A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  heroIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  heroSub: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: 12.5,
    lineHeight: 17,
  },
  heroActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 11,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
      android: { elevation: 1 },
    }),
  },
  heroPrimaryBtnText: {
    color: '#15803D',
    fontSize: 13,
    fontWeight: '700',
  },
  heroSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 11,
  },
  heroSecondaryBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },

  // Controls Wrap (Search & Urgent Toggle)
  controlsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    padding: 0,
  },
  urgentToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  urgentToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Category Filter Chips
  categoriesWrap: {
    paddingVertical: 4,
  },
  catScroll: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 8,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  catChipEmoji: { fontSize: 13 },
  catChipText: {
    fontSize: 12.5,
    fontWeight: '600',
  },

  // Requests List
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 13.5,
    fontWeight: '500',
  },

  // Card
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  catEmoji: { fontSize: 12 },
  catText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  urgentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  urgentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
  },
  urgentText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  moreBtn: { padding: 4 },

  cardTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    lineHeight: 21,
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Requester Box
  requesterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  requesterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  requesterAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  requesterName: {
    fontSize: 12,
  },
  helperCountTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  helperCountText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },

  // Card Footer
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  helpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7.5,
    borderRadius: 10,
  },
  helpBtnText: {
    color: '#FFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  offeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  offeredText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },
  myRequestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  myRequestText: {
    fontSize: 12,
    fontWeight: '700',
  },
  detailsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  detailsLinkText: {
    fontSize: 12.5,
    fontWeight: '700',
  },



  // Empty State
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    marginTop: 10,
  },
  emptyIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16.5,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  emptyBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Report Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 18,
    padding: 18,
    gap: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 13,
    marginBottom: 4,
  },
  reportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  reportOptionText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  reportInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 13.5,
    minHeight: 70,
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
});
