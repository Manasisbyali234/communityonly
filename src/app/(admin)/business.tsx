import React, { useCallback, useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Modal, TextInput, Image, Platform, ActivityIndicator,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import AdminShell from '../../components/admin/AdminShell';
import { C, SearchBar, EmptyState, LoadingOverlay, useIsMobile } from '../../components/admin/AdminUI';
import { fmtDate, fmtDateTime } from '../../utils/adminUtils';
import { useToastStore } from '../../store/toastStore';
import { useConfirmStore } from '../../store/confirmStore';
import {
  useAdminBusinessesQuery,
  useAdminApproveBusinessMutation,
  useAdminRejectBusinessMutation,
  useAdminDeleteBusinessMutation,
  Business, BusinessStatus,
} from '../../api/business';

type StatusTab = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

const STATUS_TABS: { id: StatusTab; label: string }[] = [
  { id: 'PENDING',  label: 'Pending Review ⏳' },
  { id: 'APPROVED', label: 'Approved & Live ✅' },
  { id: 'ALL',      label: 'All Listings' },
  { id: 'REJECTED', label: 'Rejected' },
];

export default function AdminBusinessDirectory() {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<StatusTab>('PENDING');
  const [search, setSearch] = useState('');
  const [reviewBusiness, setReviewBusiness] = useState<Business | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const showToast = useToastStore.getState().showToast;

  const { data: businesses = [], isLoading, refetch } = useAdminBusinessesQuery(
    activeTab === 'ALL' ? undefined : (activeTab as any)
  );
  const approveMutation = useAdminApproveBusinessMutation();
  const rejectMutation = useAdminRejectBusinessMutation();
  const deleteMutation = useAdminDeleteBusinessMutation();

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  // Metrics overview
  const statsOverview = useMemo(() => {
    const totalCount = businesses.length || 6;
    const pendingCount = businesses.filter((b) => b.status === 'PENDING').length;
    const approvedCount = businesses.filter((b) => b.status === 'APPROVED').length;
    const rejectedCount = businesses.filter((b) => b.status === 'REJECTED').length;
    return { totalCount, pendingCount, approvedCount, rejectedCount };
  }, [businesses]);

  const filtered = useMemo(() => {
    return businesses.filter((b) => {
      if (activeTab !== 'ALL' && b.status !== activeTab) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        b.businessName.toLowerCase().includes(q) ||
        b.ownerName.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q) ||
        b.location.toLowerCase().includes(q)
      );
    });
  }, [businesses, activeTab, search]);

  const handleApprove = async (b: Business) => {
    const ok = await useConfirmStore.getState().confirm({
      title: 'Approve Business Listing?',
      message: `"${b.businessName}" by ${b.ownerName} will become publicly discoverable in the Gowda Community Business Directory.`,
      confirmText: 'Approve Listing',
      isDestructive: false,
      icon: 'checkmark-circle-outline',
    });
    if (!ok) return;
    try {
      await approveMutation.mutateAsync(b.id);
      showToast(`"${b.businessName}" approved!`, 'success');
      setReviewBusiness(null);
      refetch();
    } catch {
      showToast('Failed to approve business.', 'error');
    }
  };

  const openReject = (b: Business) => {
    setRejectReason('');
    setReviewBusiness(null);
    setRejectModal({ id: b.id, name: b.businessName });
  };

  const handleRejectConfirm = async () => {
    if (!rejectModal) return;
    if (!rejectReason.trim()) {
      showToast('Please specify a rejection reason.', 'error');
      return;
    }
    const ok = await useConfirmStore.getState().confirm({
      title: 'Reject Business Listing?',
      message: `"${rejectModal.name}" will be marked as rejected. The business owner will be notified with your feedback.`,
      confirmText: 'Reject Listing',
      isDestructive: true,
      icon: 'close-circle-outline',
    });
    if (!ok) return;
    try {
      await rejectMutation.mutateAsync({ id: rejectModal.id, reason: rejectReason.trim() });
      showToast(`"${rejectModal.name}" rejected.`, 'info');
      setRejectModal(null);
      refetch();
    } catch {
      showToast('Failed to reject business.', 'error');
    }
  };

  const handleDelete = async (b: Business) => {
    const ok = await useConfirmStore.getState().confirm({
      title: 'Delete Business Listing Permanently?',
      message: `Permanently delete "${b.businessName}"? This action cannot be reversed.`,
      confirmText: 'Delete Permanently',
      isDestructive: true,
      icon: 'trash-outline',
    });
    if (!ok) return;
    try {
      await deleteMutation.mutateAsync(b.id);
      showToast('Business listing deleted.', 'success');
      refetch();
    } catch {
      showToast('Failed to delete business.', 'error');
    }
  };

  return (
    <AdminShell title="Business Directory">
      <View style={s.container}>
        {/* KPI Metrics Strip */}
        <View style={s.statsGrid}>
          <View style={s.statBox}>
            <View style={[s.statIconWrap, { backgroundColor: '#EFF6FF' }]}>
              <Feather name="shopping-bag" size={16} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.statNumber}>{statsOverview.totalCount}</Text>
              <Text style={s.statLabel} numberOfLines={1}>Total Listings</Text>
            </View>
          </View>

          <View style={s.statBox}>
            <View style={[s.statIconWrap, { backgroundColor: '#FEF9C3' }]}>
              <Feather name="clock" size={16} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.statNumber}>{statsOverview.pendingCount}</Text>
              <Text style={s.statLabel} numberOfLines={1}>Pending Review</Text>
            </View>
          </View>

          <View style={s.statBox}>
            <View style={[s.statIconWrap, { backgroundColor: '#DCFCE7' }]}>
              <Feather name="check-circle" size={16} color="#16A34A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.statNumber}>{statsOverview.approvedCount}</Text>
              <Text style={s.statLabel} numberOfLines={1}>Live Businesses</Text>
            </View>
          </View>

          <View style={s.statBox}>
            <View style={[s.statIconWrap, { backgroundColor: '#FEE2E2' }]}>
              <Feather name="slash" size={16} color="#DC2626" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.statNumber}>{statsOverview.rejectedCount}</Text>
              <Text style={s.statLabel} numberOfLines={1}>Rejected</Text>
            </View>
          </View>
        </View>

        {/* Search & Tabs Toolbar */}
        <View style={s.toolbarCard}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search by business name, owner, category, or location…"
          />

          <View style={s.tabRow}>
            {STATUS_TABS.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[s.tabBtn, activeTab === tab.id && s.tabBtnActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Text style={[s.tabBtnText, activeTab === tab.id && s.tabBtnTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Content List / Table */}
        {isLoading ? (
          <LoadingOverlay />
        ) : filtered.length === 0 ? (
          <View style={s.cardWrapper}>
            <EmptyState message={`No ${activeTab.toLowerCase()} businesses match this filter.`} />
          </View>
        ) : isMobile ? (
          /* Mobile Card View */
          <View style={s.mobileListWrap}>
            {filtered.map((b) => {
              const isPending = b.status === 'PENDING';
              const isApproved = b.status === 'APPROVED';
              const statusBg = isPending ? '#FEF9C3' : isApproved ? '#DCFCE7' : '#FEE2E2';
              const statusText = isPending ? '#A16207' : isApproved ? '#166534' : '#DC2626';

              return (
                <View key={b.id} style={s.bizCard}>
                  {/* Top row */}
                  <View style={s.bizCardTop}>
                    <View style={s.bizLogoWrap}>
                      {b.logoUrl ? (
                        <Image source={{ uri: b.logoUrl }} style={s.bizLogoImg} />
                      ) : (
                        <Text style={s.bizLogoFallback}>{b.businessName[0]?.toUpperCase()}</Text>
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={s.bizNameText} numberOfLines={1}>{b.businessName}</Text>
                      <Text style={s.bizOwnerText} numberOfLines={1}>Owner: {b.ownerName}</Text>
                    </View>

                    <View style={[s.statusPillBadge, { backgroundColor: statusBg }]}>
                      <Text style={[s.statusPillBadgeText, { color: statusText }]}>{b.status}</Text>
                    </View>
                  </View>

                  {/* Metadata Grid */}
                  <View style={s.metaGrid}>
                    <View style={s.metaRow}>
                      <Feather name="tag" size={12} color={C.accent} />
                      <Text style={s.metaText} numberOfLines={1}>{b.category}</Text>
                    </View>
                    <View style={s.metaRow}>
                      <Feather name="map-pin" size={12} color={C.textMuted} />
                      <Text style={s.metaText} numberOfLines={1}>{b.location || b.address || 'Karnataka'}</Text>
                    </View>
                    {(b.phone || b.whatsapp || b.email) && (
                      <View style={s.metaRow}>
                        <Feather name="phone" size={12} color={C.textMuted} />
                        <Text style={s.metaText} numberOfLines={1}>{b.phone || b.whatsapp || b.email}</Text>
                      </View>
                    )}
                  </View>

                  {b.status === 'REJECTED' && b.rejectionReason && (
                    <View style={s.rejectionBox}>
                      <Feather name="alert-circle" size={13} color="#DC2626" />
                      <Text style={s.rejectionText}>Reason: {b.rejectionReason}</Text>
                    </View>
                  )}

                  <View style={s.cardFooterRow}>
                    <Text style={s.submittedText}>Submitted {fmtDate(b.submittedAt)}</Text>
                  </View>

                  {/* Action Buttons */}
                  <View style={s.actionsRow}>
                    <TouchableOpacity
                      style={[s.actionBtn, { backgroundColor: '#EFF6FF' }]}
                      onPress={() => setReviewBusiness(b)}
                    >
                      <Feather name="eye" size={13} color="#1D4ED8" />
                      <Text style={[s.actionBtnText, { color: '#1D4ED8' }]}>Review</Text>
                    </TouchableOpacity>

                    {isPending && (
                      <>
                        <TouchableOpacity
                          style={[s.actionBtn, { backgroundColor: '#DCFCE7' }]}
                          onPress={() => handleApprove(b)}
                        >
                          <Feather name="check" size={13} color="#166534" />
                          <Text style={[s.actionBtnText, { color: '#166534' }]}>Approve</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[s.actionBtn, { backgroundColor: '#FEE2E2' }]}
                          onPress={() => openReject(b)}
                        >
                          <Feather name="x" size={13} color="#DC2626" />
                          <Text style={[s.actionBtnText, { color: '#DC2626' }]}>Reject</Text>
                        </TouchableOpacity>
                      </>
                    )}

                    <TouchableOpacity
                      style={[s.actionBtn, { backgroundColor: '#FEE2E2', width: 34, justifyContent: 'center' }]}
                      onPress={() => handleDelete(b)}
                    >
                      <Feather name="trash-2" size={13} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          /* Desktop Table View */
          <View style={s.cardWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ minWidth: 1040 }}>
                <View style={s.tableHeader}>
                  <Text style={[s.th, { width: 240 }]}>Business & Owner</Text>
                  <Text style={[s.th, { width: 140 }]}>Category</Text>
                  <Text style={[s.th, { width: 140 }]}>Location</Text>
                  <Text style={[s.th, { width: 140 }]}>Contact</Text>
                  <Text style={[s.th, { width: 110 }]}>Submitted</Text>
                  <Text style={[s.th, { width: 100 }]}>Status</Text>
                  <Text style={[s.th, { width: 170 }]}>Actions</Text>
                </View>

                {filtered.map((b, i) => {
                  const isPending = b.status === 'PENDING';
                  const isApproved = b.status === 'APPROVED';
                  const statusBg = isPending ? '#FEF9C3' : isApproved ? '#DCFCE7' : '#FEE2E2';
                  const statusText = isPending ? '#A16207' : isApproved ? '#166534' : '#DC2626';

                  return (
                    <View key={b.id} style={[s.tableRow, i % 2 === 0 && { backgroundColor: C.rowEven }]}>
                      {/* Business & Logo */}
                      <View style={[s.cell, { width: 240, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                        <View style={s.bizLogoWrap}>
                          {b.logoUrl ? (
                            <Image source={{ uri: b.logoUrl }} style={s.bizLogoImg} />
                          ) : (
                            <Text style={s.bizLogoFallback}>{b.businessName[0]?.toUpperCase()}</Text>
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.bizNameText} numberOfLines={1}>{b.businessName}</Text>
                          <Text style={s.bizOwnerText} numberOfLines={1}>{b.ownerName}</Text>
                        </View>
                      </View>

                      <View style={[s.cell, { width: 140 }]}>
                        <Text style={s.tableText} numberOfLines={1}>{b.category}</Text>
                      </View>

                      <View style={[s.cell, { width: 140 }]}>
                        <Text style={s.tableText} numberOfLines={1}>{b.location}</Text>
                      </View>

                      <View style={[s.cell, { width: 140 }]}>
                        <Text style={s.tableText} numberOfLines={1}>{b.phone || b.whatsapp || b.email || '—'}</Text>
                      </View>

                      <View style={[s.cell, { width: 110 }]}>
                        <Text style={s.tableSubText}>{fmtDate(b.submittedAt)}</Text>
                      </View>

                      <View style={[s.cell, { width: 100 }]}>
                        <View style={[s.statusPillBadge, { backgroundColor: statusBg }]}>
                          <Text style={[s.statusPillBadgeText, { color: statusText }]}>{b.status}</Text>
                        </View>
                      </View>

                      {/* Actions */}
                      <View style={[s.cell, { width: 170, flexDirection: 'row', gap: 6 }]}>
                        <TouchableOpacity
                          style={[s.iconActionBtn, { backgroundColor: '#EFF6FF' }]}
                          onPress={() => setReviewBusiness(b)}
                        >
                          <Feather name="eye" size={13} color="#1D4ED8" />
                        </TouchableOpacity>

                        {isPending && (
                          <>
                            <TouchableOpacity
                              style={[s.iconActionBtn, { backgroundColor: '#DCFCE7' }]}
                              onPress={() => handleApprove(b)}
                            >
                              <Feather name="check" size={13} color="#166534" />
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[s.iconActionBtn, { backgroundColor: '#FEE2E2' }]}
                              onPress={() => openReject(b)}
                            >
                              <Feather name="x" size={13} color="#DC2626" />
                            </TouchableOpacity>
                          </>
                        )}

                        <TouchableOpacity
                          style={[s.iconActionBtn, { backgroundColor: '#FEE2E2' }]}
                          onPress={() => handleDelete(b)}
                        >
                          <Feather name="trash-2" size={13} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        {/* ── Review Details Modal ─────────────────────────────────────────── */}
        <Modal visible={!!reviewBusiness} transparent animationType="fade" onRequestClose={() => setReviewBusiness(null)}>
          <View style={s.modalOverlay}>
            <View style={s.modalBox}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Business Review & Inspection</Text>
                <TouchableOpacity onPress={() => setReviewBusiness(null)}>
                  <Feather name="x" size={20} color={C.textSecond} />
                </TouchableOpacity>
              </View>

              {!!reviewBusiness && (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  <View style={s.modalProfileTop}>
                    <View style={s.modalLogo}>
                      {reviewBusiness.logoUrl ? (
                        <Image source={{ uri: reviewBusiness.logoUrl }} style={{ width: '100%', height: '100%' }} />
                      ) : (
                        <Text style={{ fontSize: 20, fontWeight: '800', color: C.accent }}>
                          {reviewBusiness.businessName[0]?.toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.modalBizTitle}>{reviewBusiness.businessName}</Text>
                      <Text style={s.modalOwnerText}>Owner: {reviewBusiness.ownerName}</Text>
                      <Text style={s.modalCategoryText}>{reviewBusiness.category}</Text>
                    </View>
                  </View>

                  <View style={s.modalInfoBox}>
                    <View style={s.modalDetailRow}>
                      <Text style={s.modalDetailLabel}>Location</Text>
                      <Text style={s.modalDetailVal}>{reviewBusiness.location || '—'}</Text>
                    </View>
                    {reviewBusiness.address && (
                      <View style={s.modalDetailRow}>
                        <Text style={s.modalDetailLabel}>Address</Text>
                        <Text style={s.modalDetailVal}>{reviewBusiness.address}</Text>
                      </View>
                    )}
                    {reviewBusiness.phone && (
                      <View style={s.modalDetailRow}>
                        <Text style={s.modalDetailLabel}>Phone</Text>
                        <Text style={s.modalDetailVal}>{reviewBusiness.phone}</Text>
                      </View>
                    )}
                    {reviewBusiness.whatsapp && (
                      <View style={s.modalDetailRow}>
                        <Text style={s.modalDetailLabel}>WhatsApp</Text>
                        <Text style={s.modalDetailVal}>{reviewBusiness.whatsapp}</Text>
                      </View>
                    )}
                    {reviewBusiness.email && (
                      <View style={s.modalDetailRow}>
                        <Text style={s.modalDetailLabel}>Email</Text>
                        <Text style={s.modalDetailVal}>{reviewBusiness.email}</Text>
                      </View>
                    )}
                    {reviewBusiness.website && (
                      <View style={s.modalDetailRow}>
                        <Text style={s.modalDetailLabel}>Website</Text>
                        <Text style={s.modalDetailVal}>{reviewBusiness.website}</Text>
                      </View>
                    )}
                    <View style={s.modalDetailRow}>
                      <Text style={s.modalDetailLabel}>Submitted</Text>
                      <Text style={s.modalDetailVal}>{fmtDateTime(reviewBusiness.submittedAt)}</Text>
                    </View>
                  </View>

                  {reviewBusiness.description && (
                    <View>
                      <Text style={s.modalSectionTitle}>Description</Text>
                      <Text style={s.modalDescText}>{reviewBusiness.description}</Text>
                    </View>
                  )}

                  {reviewBusiness.productsServices && (
                    <View>
                      <Text style={s.modalSectionTitle}>Products / Services</Text>
                      <Text style={s.modalDescText}>{reviewBusiness.productsServices}</Text>
                    </View>
                  )}

                  {reviewBusiness.offers && (
                    <View style={s.offerBox}>
                      <Feather name="gift" size={14} color="#D97706" />
                      <Text style={s.offerText}>Community Offer: {reviewBusiness.offers}</Text>
                    </View>
                  )}

                  {/* Actions */}
                  <View style={s.modalActionsRow}>
                    {reviewBusiness.status === 'PENDING' ? (
                      <>
                        <TouchableOpacity
                          style={[s.modalBtn, { backgroundColor: '#DC2626' }]}
                          onPress={() => openReject(reviewBusiness)}
                        >
                          <Text style={[s.modalBtnText, { color: '#FFF' }]}>Reject</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[s.modalBtn, { backgroundColor: C.accent }]}
                          onPress={() => handleApprove(reviewBusiness)}
                        >
                          <Text style={[s.modalBtnText, { color: '#FFF' }]}>Approve & Publish</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity
                        style={[s.modalBtn, { backgroundColor: C.bg }]}
                        onPress={() => setReviewBusiness(null)}
                      >
                        <Text style={[s.modalBtnText, { color: C.textSecond }]}>Close</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* ── Reject Reason Modal ──────────────────────────────────────────── */}
        <Modal visible={!!rejectModal} transparent animationType="fade" onRequestClose={() => setRejectModal(null)}>
          <View style={s.modalOverlay}>
            <View style={s.modalBox}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Reject Business Listing</Text>
                <TouchableOpacity onPress={() => setRejectModal(null)}>
                  <Feather name="x" size={20} color={C.textSecond} />
                </TouchableOpacity>
              </View>
              <Text style={s.rejectDesc}>
                Provide feedback for <Text style={{ fontWeight: '700', color: C.textPrimary }}>{rejectModal?.name}</Text>. The owner will be notified to revise their submission.
              </Text>
              <TextInput
                style={s.rejectInput}
                placeholder="e.g. Please provide a clear business logo and valid contact number..."
                placeholderTextColor={C.textMuted}
                value={rejectReason}
                onChangeText={setRejectReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <View style={s.modalActionsRow}>
                <TouchableOpacity style={[s.modalBtn, { backgroundColor: C.bg }]} onPress={() => setRejectModal(null)}>
                  <Text style={[s.modalBtnText, { color: C.textSecond }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.modalBtn, { backgroundColor: '#DC2626' }]} onPress={handleRejectConfirm}>
                  <Text style={[s.modalBtnText, { color: '#FFF' }]}>Confirm Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </AdminShell>
  );
}

const s = StyleSheet.create({
  container: { gap: 12, paddingBottom: 24 },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8,
  },
  statBox: {
    width: '48.5%', flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.white, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12,
    borderWidth: 1, borderColor: C.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  statIconWrap: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statNumber: { fontSize: 17, fontWeight: '800', color: C.textPrimary, lineHeight: 20 },
  statLabel: { fontSize: 11, fontWeight: '600', color: C.textMuted, marginTop: 1 },

  // Toolbar
  toolbarCard: {
    backgroundColor: C.white, borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: C.border, gap: 8,
  },
  tabRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tabBtn: {
    paddingHorizontal: 11, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.bg,
  },
  tabBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
  tabBtnText: { fontSize: 11.5, fontWeight: '600', color: C.textSecond },
  tabBtnTextActive: { color: '#FFF' },

  // Mobile List
  mobileListWrap: { gap: 8 },
  bizCard: {
    backgroundColor: C.white, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: C.border, gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  bizCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bizLogoWrap: {
    width: 38, height: 38, borderRadius: 8,
    backgroundColor: C.accentLight, alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', borderWidth: 1, borderColor: C.accentBorder,
  },
  bizLogoImg: { width: '100%', height: '100%' },
  bizLogoFallback: { fontSize: 15, fontWeight: '800', color: C.accent },
  bizNameText: { fontSize: 13.5, fontWeight: '700', color: C.textPrimary },
  bizOwnerText: { fontSize: 11.5, color: C.textMuted },

  statusPillBadge: { paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6, alignSelf: 'flex-start' },
  statusPillBadgeText: { fontSize: 10.5, fontWeight: '800' },

  metaGrid: { gap: 3, backgroundColor: C.bg, padding: 8, borderRadius: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 11.5, color: C.textSecond, flex: 1 },

  rejectionBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FEF2F2', padding: 8, borderRadius: 8,
  },
  rejectionText: { fontSize: 11, color: '#DC2626', fontWeight: '600' },

  cardFooterRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border,
  },
  submittedText: { fontSize: 10.5, color: C.textMuted },

  actionsRow: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 6, borderRadius: 6,
  },
  actionBtnText: { fontSize: 11, fontWeight: '700' },

  // Desktop Table
  cardWrapper: {
    backgroundColor: C.white, borderRadius: 12,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.headerBg,
    paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: C.border,
  },
  th: { color: C.textSecond, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, paddingRight: 8 },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.white,
  },
  cell: { paddingRight: 8, justifyContent: 'center' },
  tableText: { fontSize: 12, color: C.textSecond },
  tableSubText: { fontSize: 11, color: C.textMuted },
  iconActionBtn: {
    width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center',
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalBox: { backgroundColor: C.white, borderRadius: 16, padding: 18, width: '100%', maxWidth: 520, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: C.textPrimary },

  modalProfileTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  modalLogo: {
    width: 48, height: 48, borderRadius: 10,
    backgroundColor: C.accentLight, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.accentBorder, overflow: 'hidden',
  },
  modalBizTitle: { fontSize: 15.5, fontWeight: '800', color: C.textPrimary },
  modalOwnerText: { fontSize: 12, color: C.textSecond },
  modalCategoryText: { fontSize: 11.5, color: C.accent, fontWeight: '600' },

  modalInfoBox: { backgroundColor: C.bg, borderRadius: 10, padding: 10, gap: 5, borderWidth: 1, borderColor: C.border },
  modalDetailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  modalDetailLabel: { fontSize: 11.5, color: C.textMuted, fontWeight: '600' },
  modalDetailVal: { fontSize: 11.5, color: C.textPrimary, fontWeight: '600' },

  modalSectionTitle: { fontSize: 12.5, fontWeight: '700', color: C.textPrimary, marginTop: 4 },
  modalDescText: { fontSize: 12, color: C.textSecond, lineHeight: 17 },

  offerBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFBEB', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#FDE68A',
  },
  offerText: { fontSize: 11.5, color: '#B45309', fontWeight: '700' },

  rejectDesc: { fontSize: 12.5, color: C.textSecond, lineHeight: 17, marginBottom: 10 },
  rejectInput: {
    borderWidth: 1, borderColor: C.border, borderRadius: 8,
    padding: 10, fontSize: 12.5, color: C.textPrimary, backgroundColor: C.bg, minHeight: 80,
  },

  modalActionsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  modalBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  modalBtnText: { fontSize: 13, fontWeight: '700' },
});
