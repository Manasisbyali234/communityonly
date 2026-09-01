import React, { useCallback } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { confirmAction } from '../../store/confirmStore';
import { useMyBusinessesQuery, useDeleteBusinessMutation, Business, BusinessStatus } from '../../api/business';

const STATUS_CONFIG: Record<BusinessStatus, { label: string; color: string; icon: string }> = {
  APPROVED: { label: 'Approved',         color: '#16A34A', icon: 'checkmark-circle' },
  PENDING:  { label: 'Pending Approval', color: '#D97706', icon: 'time' },
  REJECTED: { label: 'Rejected',         color: '#DC2626', icon: 'close-circle' },
  DRAFT:    { label: 'Draft',            color: '#6B7280', icon: 'ellipsis-horizontal-circle' },
  WITHDRAWN:{ label: 'Withdrawn',        color: '#6B7280', icon: 'ban' },
};

function BusinessStatusCard({ business, onView, onEdit, onDelete, colors, isDark }: {
  business: Business;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  colors: any;
  isDark: boolean;
}) {
  const cfg = STATUS_CONFIG[business.status] ?? STATUS_CONFIG.DRAFT;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.cardBg, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border },
      ]}
    >
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.cardLogoWrap, { backgroundColor: isDark ? 'rgba(45,106,45,0.15)' : colors.primaryContainer }]}>
          {business.logoUrl ? (
            <Image source={{ uri: business.logoUrl }} style={styles.cardLogo} contentFit="cover" />
          ) : (
            <Ionicons name="storefront" size={22} color={colors.primary} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardBizName, { color: colors.text }]} numberOfLines={1}>
            {business.businessName}
          </Text>
          <Text style={[styles.cardCategory, { color: colors.textSecondary }]} numberOfLines={1}>
            {business.category}
          </Text>
        </View>
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: cfg.color + '18' }]}>
          <Ionicons name={cfg.icon as any} size={12} color={cfg.color} />
          <Text style={[styles.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      {/* Location */}
      {business.location ? (
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={13} color={colors.textMuted} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>{business.location}</Text>
        </View>
      ) : null}

      {/* Submitted date */}
      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
        <Text style={[styles.metaText, { color: colors.textSecondary }]}>
          Submitted {new Date(business.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
      </View>

      {/* Rejection reason */}
      {business.status === 'REJECTED' && business.rejectionReason && (
        <View style={[styles.rejectionBox, { backgroundColor: isDark ? 'rgba(220,38,38,0.1)' : '#FEF2F2', borderColor: isDark ? 'rgba(220,38,38,0.3)' : '#FECACA' }]}>
          <Ionicons name="alert-circle-outline" size={14} color="#DC2626" style={{ marginTop: 1 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rejectionLabel}>Rejection Reason</Text>
            <Text style={[styles.rejectionText, { color: isDark ? '#FCA5A5' : '#991B1B' }]}>
              {business.rejectionReason}
            </Text>
          </View>
        </View>
      )}

      {/* Divider + Actions */}
      <View style={[styles.cardFooter, { borderTopColor: isDark ? 'rgba(255,255,255,0.07)' : colors.border }]}>
        {business.status === 'APPROVED' && (
          <TouchableOpacity style={[styles.footerBtn, { backgroundColor: isDark ? 'rgba(45,106,45,0.15)' : colors.primaryContainer }]} onPress={onView}>
            <Ionicons name="eye-outline" size={15} color={colors.primary} />
            <Text style={[styles.footerBtnText, { color: colors.primary }]}>View</Text>
          </TouchableOpacity>
        )}
        {(business.status === 'PENDING' || business.status === 'REJECTED' || business.status === 'DRAFT') && (
          <TouchableOpacity style={[styles.footerBtn, { backgroundColor: isDark ? 'rgba(79,70,229,0.12)' : '#EEF2FF' }]} onPress={onEdit}>
            <Ionicons name="create-outline" size={15} color="#4F46E5" />
            <Text style={[styles.footerBtnText, { color: '#4F46E5' }]}>
              {business.status === 'REJECTED' ? 'Edit & Resubmit' : 'Edit'}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.footerBtn, { backgroundColor: isDark ? 'rgba(220,38,38,0.1)' : '#FEF2F2' }]} onPress={onDelete}>
          <Ionicons name="trash-outline" size={15} color="#DC2626" />
          <Text style={[styles.footerBtnText, { color: '#DC2626' }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function MyBusinessesScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.showToast);

  const { data: businesses = [], isLoading, refetch } = useMyBusinessesQuery();
  const deleteMutation = useDeleteBusinessMutation();

  const handleDelete = useCallback(async (business: Business) => {
    const confirmed = await confirmAction({
      title: 'Delete Business?',
      message: `"${business.businessName}" will be permanently removed. This cannot be undone.`,
      confirmText: 'Delete',
      isDestructive: true,
      icon: 'trash-outline',
    });
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(business.id);
    } catch {
      showToast('Failed to delete business.', 'error');
    }
  }, [deleteMutation]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.primaryContainer }]}
          onPress={() => router.replace('/(tabs)/business' as any)}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={19} color={colors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>My Businesses</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>
            {businesses.length} submission{businesses.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/business/submit?from=my-businesses' as any)}
        >
          <Ionicons name="add" size={18} color="#FFF" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Legend */}
      <View style={[styles.legend, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
        {(['APPROVED', 'PENDING', 'REJECTED'] as BusinessStatus[]).map((s) => {
          const cfg = STATUS_CONFIG[s];
          return (
            <View key={s} style={styles.legendItem}>
              <Ionicons name={cfg.icon as any} size={12} color={cfg.color} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>{cfg.label}</Text>
            </View>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={businesses}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BusinessStatusCard
              business={item}
              colors={colors}
              isDark={isDark}
              onView={() => router.push(`/business/${item.id}` as any)}
              onEdit={() => router.push(`/business/submit?id=${item.id}&from=my-businesses` as any)}
              onDelete={() => handleDelete(item)}
            />
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <View style={[styles.emptyState, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.primaryContainer }]}>
                <Ionicons name="briefcase-outline" size={38} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Businesses Yet</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                Add your business to the Gowda Community Business Directory.
              </Text>
              <TouchableOpacity
                style={[styles.emptyAddBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/business/submit?from=my-businesses' as any)}
              >
                <Ionicons name="add" size={18} color="#FFF" />
                <Text style={styles.emptyAddBtnText}>Add My Business</Text>
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

  // Legend
  legend: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { fontSize: 12, fontWeight: '600' },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 16 },

  // Card
  card: {
    borderRadius: 18, borderWidth: 1, overflow: 'hidden',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }, android: { elevation: 2 } }),
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, paddingBottom: 10 },
  cardLogoWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  cardLogo: { width: '100%', height: '100%' },
  cardBizName: { fontSize: 15.5, fontWeight: '700' },
  cardCategory: { fontSize: 12.5, fontWeight: '500', marginTop: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingBottom: 5 },
  metaText: { fontSize: 12.5 },

  // Rejection box
  rejectionBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginHorizontal: 14, marginTop: 4, marginBottom: 2,
    padding: 10, borderRadius: 12, borderWidth: 1,
  },
  rejectionLabel: { color: '#DC2626', fontSize: 11.5, fontWeight: '800', marginBottom: 3 },
  rejectionText: { fontSize: 13, lineHeight: 18 },

  // Footer
  cardFooter: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 10 },
  footerBtnText: { fontSize: 13, fontWeight: '700' },

  // Empty
  emptyState: {
    alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24,
    borderRadius: 20, borderWidth: 1, gap: 10, marginTop: 20,
  },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginTop: 4 },
  emptyAddBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
