import React, { useCallback, useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Modal, TextInput, Platform,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import AdminShell from '../../components/admin/AdminShell';
import { C, SearchBar, EmptyState, LoadingOverlay, useIsMobile } from '../../components/admin/AdminUI';
import { fmtDate, fmtDateTime } from '../../utils/adminUtils';
import { useToastStore } from '../../store/toastStore';
import { useConfirmStore } from '../../store/confirmStore';
import {
  useAdminHelpRequestsQuery,
  useAdminApproveHelpMutation,
  useAdminRejectHelpMutation,
  useAdminDismissReportsMutation,
  useAdminDeleteHelpMutation,
  HELP_CATEGORIES,
  HelpRequest,
} from '../../api/communityHelp';

type StatusTab = 'ALL' | 'PENDING' | 'APPROVED' | 'REPORTED' | 'RESOLVED' | 'REJECTED';

const STATUS_TABS: { id: StatusTab; label: string }[] = [
  { id: 'PENDING',  label: 'Pending Review ⏳' },
  { id: 'REPORTED', label: 'Reported 🚩' },
  { id: 'APPROVED', label: 'Active Live ✅' },
  { id: 'ALL',      label: 'All Requests' },
  { id: 'RESOLVED', label: 'Resolved ❤️' },
  { id: 'REJECTED', label: 'Rejected' },
];

export default function AdminCommunityHelp() {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<StatusTab>('PENDING');
  const [search, setSearch] = useState('');
  const [reviewRequest, setReviewRequest] = useState<HelpRequest | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; title: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const showToast = useToastStore.getState().showToast;

  const { data: requests = [], isLoading, refetch } = useAdminHelpRequestsQuery(
    activeTab === 'ALL' ? undefined : (activeTab as any)
  );
  const approveMutation = useAdminApproveHelpMutation();
  const rejectMutation = useAdminRejectHelpMutation();
  const dismissReportsMutation = useAdminDismissReportsMutation();
  const deleteMutation = useAdminDeleteHelpMutation();

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  // Metrics
  const statsOverview = useMemo(() => {
    const totalCount = requests.length || 5;
    const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
    const urgentCount = requests.filter((r) => r.urgency === 'URGENT' && r.status === 'APPROVED').length;
    const reportedCount = requests.filter((r) => r.reports && r.reports.length > 0).length;
    const resolvedCount = requests.filter((r) => r.status === 'RESOLVED').length;
    return { totalCount, pendingCount, urgentCount, reportedCount, resolvedCount };
  }, [requests]);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (activeTab === 'REPORTED' && (!r.reports || r.reports.length === 0)) return false;
      if (activeTab !== 'ALL' && activeTab !== 'REPORTED' && r.status !== activeTab) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        r.title.toLowerCase().includes(q) ||
        r.requesterName.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q)
      );
    });
  }, [requests, activeTab, search]);

  const handleApprove = async (r: HelpRequest) => {
    const ok = await useConfirmStore.getState().confirm({
      title: 'Approve Help Request?',
      message: `"${r.title}" will be published in the Community Help hub.`,
      confirmText: 'Approve & Publish',
      isDestructive: false,
      icon: 'checkmark-circle-outline',
    });
    if (!ok) return;
    try {
      await approveMutation.mutateAsync(r.id);
      setReviewRequest(null);
      refetch();
      showToast('Help request approved.', 'success');
    } catch {
      showToast('Failed to approve request.', 'error');
    }
  };

  const openReject = (r: HelpRequest) => {
    setRejectReason('');
    setReviewRequest(null);
    setRejectModal({ id: r.id, title: r.title });
  };

  const handleRejectConfirm = async () => {
    if (!rejectModal) return;
    if (!rejectReason.trim()) {
      showToast('Please provide a rejection reason.', 'error');
      return;
    }
    const ok = await useConfirmStore.getState().confirm({
      title: 'Reject Help Request?',
      message: `"${rejectModal.title}" will be rejected with your feedback.`,
      confirmText: 'Reject Request',
      isDestructive: true,
      icon: 'close-circle-outline',
    });
    if (!ok) return;
    try {
      await rejectMutation.mutateAsync({ id: rejectModal.id, reason: rejectReason.trim() });
      setRejectModal(null);
      refetch();
      showToast('Request rejected with feedback.', 'success');
    } catch {
      showToast('Failed to reject request.', 'error');
    }
  };

  const handleDismissReports = async (r: HelpRequest) => {
    const ok = await useConfirmStore.getState().confirm({
      title: 'Dismiss User Reports?',
      message: `Dismiss all ${r.reports.length} report(s) on "${r.title}"?`,
      confirmText: 'Dismiss Reports',
      isDestructive: false,
      icon: 'shield-outline',
    });
    if (!ok) return;
    try {
      await dismissReportsMutation.mutateAsync(r.id);
      setReviewRequest(null);
      refetch();
      showToast('User reports dismissed.', 'success');
    } catch {
      showToast('Failed to dismiss reports.', 'error');
    }
  };

  const handleDelete = async (r: HelpRequest) => {
    const ok = await useConfirmStore.getState().confirm({
      title: 'Delete Help Request Permanently?',
      message: `Permanently delete "${r.title}"? This action cannot be reversed.`,
      confirmText: 'Delete Permanently',
      isDestructive: true,
      icon: 'trash-outline',
    });
    if (!ok) return;
    try {
      await deleteMutation.mutateAsync(r.id);
      setReviewRequest(null);
      refetch();
      showToast('Help request deleted.', 'success');
    } catch {
      showToast('Failed to delete request.', 'error');
    }
  };

  return (
    <AdminShell title="Community Help">
      <View style={s.container}>
        {/* KPI Metrics Strip */}
        <View style={s.statsGrid}>
          <View style={s.statBox}>
            <View style={[s.statIconWrap, { backgroundColor: '#EFF6FF' }]}>
              <Feather name="life-buoy" size={16} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.statNumber}>{statsOverview.totalCount}</Text>
              <Text style={s.statLabel} numberOfLines={1}>Total Requests</Text>
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
            <View style={[s.statIconWrap, { backgroundColor: '#FEE2E2' }]}>
              <Feather name="alert-circle" size={16} color="#DC2626" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.statNumber}>{statsOverview.urgentCount}</Text>
              <Text style={s.statLabel} numberOfLines={1}>Urgent Live 🚨</Text>
            </View>
          </View>

          <View style={s.statBox}>
            <View style={[s.statIconWrap, { backgroundColor: '#DCFCE7' }]}>
              <Feather name="check-circle" size={16} color="#16A34A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.statNumber}>{statsOverview.resolvedCount}</Text>
              <Text style={s.statLabel} numberOfLines={1}>Resolved ❤️</Text>
            </View>
          </View>
        </View>

        {/* Search & Tabs Toolbar */}
        <View style={s.toolbarCard}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search by title, requester, category, or city…"
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
            <EmptyState message={`No ${activeTab.toLowerCase()} help requests found.`} />
          </View>
        ) : isMobile ? (
          /* Mobile Card View */
          <View style={s.mobileListWrap}>
            {filtered.map((r) => {
              const isPending = r.status === 'PENDING';
              const isUrgent = r.urgency === 'URGENT';
              const hasReports = r.reports && r.reports.length > 0;
              const catCfg = HELP_CATEGORIES.find((c) => c.id === r.category);

              return (
                <View key={r.id} style={s.helpCard}>
                  {/* Card Top */}
                  <View style={s.helpCardTop}>
                    <View style={[s.categoryEmojiWrap, { backgroundColor: (catCfg?.color || '#2563EB') + '15' }]}>
                      <Text style={{ fontSize: 16 }}>{catCfg?.emoji || '🤝'}</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={s.helpTitle} numberOfLines={2}>{r.title}</Text>
                      <Text style={s.helpSub}>
                        By {r.requesterName} · <Text style={{ color: C.accent }}>{r.category}</Text>
                      </Text>
                    </View>

                    {isUrgent && (
                      <View style={s.urgentBadge}>
                        <Text style={s.urgentBadgeText}>🔴 Urgent</Text>
                      </View>
                    )}
                  </View>

                  <Text style={s.helpDesc} numberOfLines={2}>{r.description}</Text>

                  {/* Metadata */}
                  <View style={s.metaGrid}>
                    <View style={s.metaRow}>
                      <Feather name="map-pin" size={12} color={C.textMuted} />
                      <Text style={s.metaText} numberOfLines={1}>{r.location}</Text>
                    </View>
                    <View style={s.metaRow}>
                      <Feather name="phone" size={12} color={C.textMuted} />
                      <Text style={s.metaText} numberOfLines={1}>Pref: {r.contactPreference} ({r.requesterPhone || 'Registered Phone'})</Text>
                    </View>
                  </View>

                  {hasReports && (
                    <View style={s.reportWarning}>
                      <Feather name="alert-triangle" size={13} color="#DC2626" />
                      <Text style={s.reportWarningText}>
                        Flagged: {r.reports.length} member report(s) filed
                      </Text>
                    </View>
                  )}

                  <View style={s.footerRow}>
                    <Text style={s.offersText}>❤️ {r.helpers?.length || 0} Offers to help</Text>
                    <Text style={s.dateText}>Submitted {fmtDate(r.createdAt)}</Text>
                  </View>

                  {/* Actions */}
                  <View style={s.actionsRow}>
                    <TouchableOpacity
                      style={[s.actionBtn, { backgroundColor: '#EFF6FF' }]}
                      onPress={() => setReviewRequest(r)}
                    >
                      <Feather name="eye" size={12} color="#1D4ED8" />
                      <Text style={[s.actionBtnText, { color: '#1D4ED8' }]}>Review</Text>
                    </TouchableOpacity>

                    {isPending && (
                      <>
                        <TouchableOpacity
                          style={[s.actionBtn, { backgroundColor: '#DCFCE7' }]}
                          onPress={() => handleApprove(r)}
                        >
                          <Feather name="check" size={12} color="#166534" />
                          <Text style={[s.actionBtnText, { color: '#166534' }]}>Approve</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[s.actionBtn, { backgroundColor: '#FEE2E2' }]}
                          onPress={() => openReject(r)}
                        >
                          <Feather name="x" size={12} color="#DC2626" />
                          <Text style={[s.actionBtnText, { color: '#DC2626' }]}>Reject</Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {hasReports && (
                      <TouchableOpacity
                        style={[s.actionBtn, { backgroundColor: '#ECFDF5' }]}
                        onPress={() => handleDismissReports(r)}
                      >
                        <Feather name="shield" size={12} color="#059669" />
                        <Text style={[s.actionBtnText, { color: '#059669' }]}>Dismiss</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[s.actionBtn, { backgroundColor: '#FEE2E2', width: 34, justifyContent: 'center' }]}
                      onPress={() => handleDelete(r)}
                    >
                      <Feather name="trash-2" size={12} color="#DC2626" />
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
                  <Text style={[s.th, { width: 240 }]}>Request / Title</Text>
                  <Text style={[s.th, { width: 140 }]}>Category</Text>
                  <Text style={[s.th, { width: 140 }]}>Requester</Text>
                  <Text style={[s.th, { width: 120 }]}>Location</Text>
                  <Text style={[s.th, { width: 90 }]}>Urgency</Text>
                  <Text style={[s.th, { width: 90 }]}>Status</Text>
                  <Text style={[s.th, { width: 200 }]}>Actions</Text>
                </View>

                {filtered.map((r, i) => {
                  const isPending = r.status === 'PENDING';
                  const isUrgent = r.urgency === 'URGENT';
                  const hasReports = r.reports && r.reports.length > 0;
                  const catCfg = HELP_CATEGORIES.find((c) => c.id === r.category);

                  return (
                    <View key={r.id} style={[s.tableRow, i % 2 === 0 && { backgroundColor: C.rowEven }]}>
                      <View style={[s.cell, { width: 240 }]}>
                        <Text style={s.tableTitle} numberOfLines={1}>{r.title}</Text>
                        <Text style={s.tableSub} numberOfLines={1}>{r.description}</Text>
                      </View>

                      <View style={[s.cell, { width: 140 }]}>
                        <Text style={s.tableSub}>{catCfg?.emoji || '🤝'} {r.category}</Text>
                      </View>

                      <View style={[s.cell, { width: 140 }]}>
                        <Text style={s.tableTitle} numberOfLines={1}>{r.requesterName}</Text>
                        <Text style={s.tableSub} numberOfLines={1}>{r.requesterPhone || '—'}</Text>
                      </View>

                      <View style={[s.cell, { width: 120 }]}>
                        <Text style={s.tableSub} numberOfLines={1}>{r.location}</Text>
                      </View>

                      <View style={[s.cell, { width: 90 }]}>
                        {isUrgent ? (
                          <View style={[s.urgentBadge, { alignSelf: 'flex-start' }]}>
                            <Text style={s.urgentBadgeText}>🔴 Urgent</Text>
                          </View>
                        ) : (
                          <Text style={s.tableSub}>Normal</Text>
                        )}
                      </View>

                      <View style={[s.cell, { width: 90 }]}>
                        <View style={[s.statusPill, { backgroundColor: isPending ? '#FEF9C3' : '#DCFCE7' }]}>
                          <Text style={[s.statusPillText, { color: isPending ? '#92400E' : '#166534' }]}>
                            {r.status}
                          </Text>
                        </View>
                      </View>

                      {/* Actions */}
                      <View style={[s.cell, { width: 200, flexDirection: 'row', gap: 6 }]}>
                        <TouchableOpacity
                          style={[s.iconActionBtn, { backgroundColor: '#EFF6FF' }]}
                          onPress={() => setReviewRequest(r)}
                        >
                          <Feather name="eye" size={13} color="#1D4ED8" />
                        </TouchableOpacity>

                        {isPending && (
                          <>
                            <TouchableOpacity
                              style={[s.iconActionBtn, { backgroundColor: '#DCFCE7' }]}
                              onPress={() => handleApprove(r)}
                            >
                              <Feather name="check" size={13} color="#166534" />
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[s.iconActionBtn, { backgroundColor: '#FEE2E2' }]}
                              onPress={() => openReject(r)}
                            >
                              <Feather name="x" size={13} color="#DC2626" />
                            </TouchableOpacity>
                          </>
                        )}

                        {hasReports && (
                          <TouchableOpacity
                            style={[s.iconActionBtn, { backgroundColor: '#ECFDF5' }]}
                            onPress={() => handleDismissReports(r)}
                          >
                            <Feather name="shield" size={13} color="#059669" />
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          style={[s.iconActionBtn, { backgroundColor: '#FEE2E2' }]}
                          onPress={() => handleDelete(r)}
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
        <Modal visible={!!reviewRequest} transparent animationType="fade" onRequestClose={() => setReviewRequest(null)}>
          <View style={s.modalOverlay}>
            <View style={s.modalBox}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Help Request Review & Moderation</Text>
                <TouchableOpacity onPress={() => setReviewRequest(null)}>
                  <Feather name="x" size={20} color={C.textSecond} />
                </TouchableOpacity>
              </View>

              {!!reviewRequest && (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  <View style={{ gap: 4 }}>
                    <Text style={s.modalRequestTitle}>{reviewRequest.title}</Text>
                    <Text style={s.modalRequesterSub}>
                      Requested by {reviewRequest.requesterName} · {reviewRequest.category}
                    </Text>
                  </View>

                  <View style={s.modalInfoBox}>
                    <View style={s.modalDetailRow}>
                      <Text style={s.modalDetailLabel}>Category</Text>
                      <Text style={s.modalDetailVal}>{reviewRequest.category}</Text>
                    </View>
                    <View style={s.modalDetailRow}>
                      <Text style={s.modalDetailLabel}>Urgency</Text>
                      <Text style={[s.modalDetailVal, reviewRequest.urgency === 'URGENT' && { color: '#DC2626', fontWeight: '800' }]}>
                        {reviewRequest.urgency}
                      </Text>
                    </View>
                    <View style={s.modalDetailRow}>
                      <Text style={s.modalDetailLabel}>Location</Text>
                      <Text style={s.modalDetailVal}>{reviewRequest.location}</Text>
                    </View>
                    <View style={s.modalDetailRow}>
                      <Text style={s.modalDetailLabel}>Contact Pref.</Text>
                      <Text style={s.modalDetailVal}>{reviewRequest.contactPreference} ({reviewRequest.requesterPhone || '—'})</Text>
                    </View>
                    <View style={s.modalDetailRow}>
                      <Text style={s.modalDetailLabel}>Submitted</Text>
                      <Text style={s.modalDetailVal}>{fmtDateTime(reviewRequest.createdAt)}</Text>
                    </View>
                  </View>

                  <View>
                    <Text style={s.modalSectionTitle}>Description</Text>
                    <Text style={s.modalDescText}>{reviewRequest.description}</Text>
                  </View>

                  {reviewRequest.reports && reviewRequest.reports.length > 0 && (
                    <View style={s.reportWarningBox}>
                      <Text style={s.reportWarningTitle}>🚨 User Safety Reports ({reviewRequest.reports.length})</Text>
                      {reviewRequest.reports.map((rep: any, idx: number) => (
                        <Text key={idx} style={s.reportItemText}>• Reason: {rep.reason || 'Spam or inappropriate'}</Text>
                      ))}
                    </View>
                  )}

                  {/* Actions */}
                  <View style={s.modalActionsRow}>
                    {reviewRequest.status === 'PENDING' ? (
                      <>
                        <TouchableOpacity
                          style={[s.modalBtn, { backgroundColor: '#DC2626' }]}
                          onPress={() => openReject(reviewRequest)}
                        >
                          <Text style={[s.modalBtnText, { color: '#FFF' }]}>Reject</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[s.modalBtn, { backgroundColor: C.accent }]}
                          onPress={() => handleApprove(reviewRequest)}
                        >
                          <Text style={[s.modalBtnText, { color: '#FFF' }]}>Approve & Publish</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity
                        style={[s.modalBtn, { backgroundColor: C.bg }]}
                        onPress={() => setReviewRequest(null)}
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
                <Text style={s.modalTitle}>Reject Help Request</Text>
                <TouchableOpacity onPress={() => setRejectModal(null)}>
                  <Feather name="x" size={20} color={C.textSecond} />
                </TouchableOpacity>
              </View>
              <Text style={s.rejectDesc}>
                Provide feedback for <Text style={{ fontWeight: '700', color: C.textPrimary }}>{rejectModal?.title}</Text>. The requester will be notified.
              </Text>
              <TextInput
                style={s.rejectInput}
                placeholder="e.g. Please provide a verified medical certificate or clearer contact information..."
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
  helpCard: {
    backgroundColor: C.white, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: C.border, gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  helpCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  categoryEmojiWrap: {
    width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  helpTitle: { fontSize: 13.5, fontWeight: '700', color: C.textPrimary, lineHeight: 18 },
  helpSub: { fontSize: 11.5, color: C.textMuted, marginTop: 1 },
  urgentBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6 },
  urgentBadgeText: { color: '#DC2626', fontSize: 10.5, fontWeight: '800' },

  helpDesc: { fontSize: 12, color: C.textSecond, lineHeight: 16 },
  metaGrid: { gap: 3, backgroundColor: C.bg, padding: 8, borderRadius: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 11.5, color: C.textSecond, flex: 1 },

  reportWarning: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FEF2F2', padding: 8, borderRadius: 8,
  },
  reportWarningText: { color: '#DC2626', fontSize: 11, fontWeight: '700' },

  footerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 2,
  },
  offersText: { fontSize: 11, fontWeight: '700', color: C.accent },
  dateText: { fontSize: 10.5, color: C.textMuted },

  actionsRow: { flexDirection: 'row', gap: 6, paddingTop: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
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
  tableTitle: { fontSize: 12.5, fontWeight: '700', color: C.textPrimary },
  tableSub: { fontSize: 11, color: C.textMuted },
  statusPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
  statusPillText: { fontSize: 10.5, fontWeight: '700' },
  iconActionBtn: {
    width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center',
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalBox: { backgroundColor: C.white, borderRadius: 16, padding: 18, width: '100%', maxWidth: 520, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: C.textPrimary },

  modalRequestTitle: { fontSize: 16, fontWeight: '800', color: C.textPrimary, lineHeight: 21 },
  modalRequesterSub: { fontSize: 12, color: C.textMuted },

  modalInfoBox: { backgroundColor: C.bg, borderRadius: 10, padding: 10, gap: 5, borderWidth: 1, borderColor: C.border },
  modalDetailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  modalDetailLabel: { fontSize: 11.5, color: C.textMuted, fontWeight: '600' },
  modalDetailVal: { fontSize: 11.5, color: C.textPrimary, fontWeight: '600' },

  modalSectionTitle: { fontSize: 12.5, fontWeight: '700', color: C.textPrimary, marginTop: 4 },
  modalDescText: { fontSize: 12, color: C.textSecond, lineHeight: 17 },

  reportWarningBox: { backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10, gap: 4, borderWidth: 1, borderColor: '#FECACA' },
  reportWarningTitle: { fontSize: 12, fontWeight: '800', color: '#DC2626' },
  reportItemText: { fontSize: 11.5, color: '#991B1B' },

  rejectDesc: { fontSize: 12.5, color: C.textSecond, lineHeight: 17, marginBottom: 10 },
  rejectInput: {
    borderWidth: 1, borderColor: C.border, borderRadius: 8,
    padding: 10, fontSize: 12.5, color: C.textPrimary, backgroundColor: C.bg, minHeight: 80,
  },

  modalActionsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  modalBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  modalBtnText: { fontSize: 13, fontWeight: '700' },
});
