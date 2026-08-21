import React, { useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator,
  Linking, Platform, RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme';
import { useToastStore } from '../../store/toastStore';
import { confirmAction } from '../../store/confirmStore';
import {
  useMyHelpRequestsQuery,
  useResolveHelpRequestMutation,
  HELP_CATEGORIES,
  HelpRequest,
  HelpStatus,
} from '../../api/communityHelp';

const STATUS_TABS: { id: HelpStatus | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'APPROVED', label: 'Active' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'RESOLVED', label: 'Resolved' },
  { id: 'REJECTED', label: 'Rejected' },
];

const STATUS_CONFIG: Record<HelpStatus, { label: string; color: string; bg: string; icon: string }> = {
  APPROVED: { label: 'Active', color: '#16A34A', bg: '#DCFCE7', icon: 'checkmark-circle' },
  PENDING: { label: 'Pending Review', color: '#D97706', bg: '#FEF3C7', icon: 'time' },
  RESOLVED: { label: 'Resolved', color: '#059669', bg: '#ECFDF5', icon: 'checkmark-done-circle' },
  REJECTED: { label: 'Rejected', color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle' },
};

function MyRequestCard({
  item,
  onView,
  onResolve,
  colors,
  isDark,
}: {
  item: HelpRequest;
  onView: () => void;
  onResolve: (item: HelpRequest) => void;
  colors: any;
  isDark: boolean;
}) {
  const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
  const catConfig = HELP_CATEGORIES.find((c) => c.id === item.category);
  const isUrgent = item.urgency === 'URGENT';

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
      {/* Header Row */}
      <View style={styles.cardHeader}>
        <View style={styles.catWrap}>
          <Text style={{ fontSize: 13 }}>{catConfig?.emoji || '🤝'}</Text>
          <Text style={[styles.catText, { color: catConfig?.color || colors.primary }]}>
            {item.category}
          </Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
          <Ionicons name={statusCfg.icon as any} size={12} color={statusCfg.color} />
          <Text style={[styles.statusBadgeText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
        {item.title}
      </Text>

      {/* Location & Urgency */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={13} color={colors.textMuted} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>{item.location}</Text>
        </View>
        {isUrgent && (
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentText}>🔴 URGENT</Text>
          </View>
        )}
      </View>

      {/* Rejection Note */}
      {item.status === 'REJECTED' && item.rejectionReason && (
        <View style={[styles.rejectionBox, { backgroundColor: isDark ? 'rgba(220,38,38,0.1)' : '#FEF2F2', borderColor: isDark ? 'rgba(220,38,38,0.3)' : '#FECACA' }]}>
          <Ionicons name="alert-circle" size={14} color="#DC2626" />
          <View style={{ flex: 1 }}>
            <Text style={styles.rejectionTitle}>Admin Feedback</Text>
            <Text style={[styles.rejectionMsg, { color: isDark ? '#FCA5A5' : '#991B1B' }]}>
              {item.rejectionReason}
            </Text>
          </View>
        </View>
      )}

      {/* Helpers List (Offers received) */}
      {item.helpers.length > 0 && (
        <View style={[styles.helpersBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F9FAFB', borderColor: colors.border }]}>
          <View style={styles.helpersHeader}>
            <Ionicons name="heart" size={13} color="#DC2626" />
            <Text style={[styles.helpersTitle, { color: colors.text }]}>
              {item.helpers.length} Member{item.helpers.length > 1 ? 's' : ''} Offered Help
            </Text>
          </View>

          {item.helpers.map((h) => (
            <View key={h.id} style={styles.helperRow}>
              <View style={styles.helperAvatarWrap}>
                {h.helperAvatarUrl ? (
                  <Image source={{ uri: h.helperAvatarUrl }} style={styles.helperAvatar} contentFit="cover" />
                ) : (
                  <View style={[styles.helperAvatar, { backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>
                      {h.helperName[0]?.toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.helperName, { color: colors.text }]}>{h.helperName}</Text>
                  {h.message && (
                    <Text style={[styles.helperMsg, { color: colors.textSecondary }]} numberOfLines={1}>
                      "{h.message}"
                    </Text>
                  )}
                </View>
              </View>

              {h.helperPhone && (
                <View style={styles.contactRow}>
                  <TouchableOpacity
                    style={styles.contactIconBtn}
                    onPress={() => Linking.openURL(`tel:${h.helperPhone}`)}
                  >
                    <Ionicons name="call" size={13} color="#166534" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.contactIconBtn, { backgroundColor: '#DCFCE7' }]}
                    onPress={() => {
                      const num = (h.helperPhone || '').replace(/[^0-9]/g, '');
                      Linking.openURL(`https://wa.me/${num}?text=Hi ${h.helperName}, thank you for offering help on GowdaCommunity!`);
                    }}
                  >
                    <Ionicons name="logo-whatsapp" size={13} color="#16A34A" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Action Footer */}
      <View style={[styles.cardFooter, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
        <TouchableOpacity
          style={[styles.footerBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6' }]}
          onPress={onView}
        >
          <Ionicons name="eye-outline" size={14} color={colors.text} />
          <Text style={[styles.footerBtnText, { color: colors.text }]}>View Details</Text>
        </TouchableOpacity>

        {item.status === 'APPROVED' && (
          <TouchableOpacity
            style={[styles.footerBtn, { backgroundColor: '#ECFDF5' }]}
            onPress={() => onResolve(item)}
          >
            <Ionicons name="checkmark-done" size={14} color="#059669" />
            <Text style={[styles.footerBtnText, { color: '#059669' }]}>Mark as Resolved</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function MyHelpRequestsScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const showToast = useToastStore((s) => s.showToast);

  const [activeTab, setActiveTab] = useState<HelpStatus | 'ALL'>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const { data: requests = [], isLoading, refetch } = useMyHelpRequestsQuery();
  const resolveMutation = useResolveHelpRequestMutation();

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleResolve = async (item: HelpRequest) => {
    const confirmed = await confirmAction({
      title: 'Mark this request as resolved?',
      message: 'The request will no longer appear under active help requests.',
      confirmText: 'Mark Resolved',
      cancelText: 'Cancel',
      isDestructive: false,
      icon: 'checkmark-circle-outline',
    });

    if (!confirmed) return;

    try {
      await resolveMutation.mutateAsync(item.id);
      showToast('Request marked as resolved.', 'success');
    } catch {
      showToast('Failed to update request.', 'error');
    }
  };

  const filtered = requests.filter((r) => {
    if (activeTab === 'ALL') return true;
    return r.status === activeTab;
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.primaryContainer }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={19} color={colors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>My Help Requests</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>
            {requests.length} submission{requests.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/community-help/create' as any)}
        >
          <Ionicons name="add" size={18} color="#FFF" />
          <Text style={styles.addBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsWrap, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
        <FlatList
          horizontal
          data={STATUS_TABS}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
          renderItem={({ item }) => {
            const active = activeTab === item.id;
            return (
              <TouchableOpacity
                onPress={() => setActiveTab(item.id)}
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: active ? colors.primary : isDark ? 'rgba(255,255,255,0.06)' : colors.surfaceSecondary,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.tabChipText, { color: active ? '#FFF' : colors.textMuted }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MyRequestCard
              item={item}
              onView={() => router.push(`/community-help/${item.id}` as any)}
              onResolve={handleResolve}
              colors={colors}
              isDark={isDark}
            />
          )}
          contentContainerStyle={[styles.listContainer, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />
          }
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <View style={[styles.emptyBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <View style={[styles.emptyIconBg, { backgroundColor: colors.primaryContainer }]}>
                <Ionicons name="hand-left-outline" size={38} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Requests in this tab</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                Need community assistance? Create a help request to get support from members.
              </Text>
              <TouchableOpacity
                style={[styles.emptyAddBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/community-help/create' as any)}
              >
                <Ionicons name="add" size={18} color="#FFF" />
                <Text style={styles.emptyAddBtnText}>Request Help</Text>
              </TouchableOpacity>
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
  headerTitle: { fontSize: 18, fontWeight: '800' },
  headerSub: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12 },
  addBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  tabsWrap: { borderBottomWidth: StyleSheet.hairlineWidth },
  tabsScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tabChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  tabChipText: { fontSize: 12.5, fontWeight: '700' },

  centerLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContainer: { padding: 16 },

  // Card
  card: {
    borderRadius: 16, borderWidth: 1, padding: 14, gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catWrap: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  catText: { fontSize: 12, fontWeight: '700' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },

  title: { fontSize: 15.5, fontWeight: '800', lineHeight: 21 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12.5 },
  urgentBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  urgentText: { color: '#DC2626', fontSize: 10, fontWeight: '800' },

  rejectionBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  rejectionTitle: { fontSize: 11.5, fontWeight: '800', color: '#DC2626', marginBottom: 2 },
  rejectionMsg: { fontSize: 12, lineHeight: 16 },

  // Helpers box
  helpersBox: { borderRadius: 12, borderWidth: 1, padding: 10, gap: 8 },
  helpersHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  helpersTitle: { fontSize: 12.5, fontWeight: '700' },
  helperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  helperAvatarWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  helperAvatar: { width: 28, height: 28, borderRadius: 14, overflow: 'hidden' },
  helperName: { fontSize: 13, fontWeight: '700' },
  helperMsg: { fontSize: 11.5, fontStyle: 'italic' },
  contactRow: { flexDirection: 'row', gap: 6 },
  contactIconBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },

  cardFooter: { flexDirection: 'row', gap: 8, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  footerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10 },
  footerBtnText: { fontSize: 12.5, fontWeight: '700' },

  // Empty
  emptyBox: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20, borderRadius: 16, borderWidth: 1, gap: 10, marginTop: 10 },
  emptyIconBg: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  emptyAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, marginTop: 4 },
  emptyAddBtnText: { color: '#FFF', fontSize: 13.5, fontWeight: '700' },
});
