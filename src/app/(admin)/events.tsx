import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity, StyleSheet,
  Modal, Platform, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import AdminShell from '../../components/admin/AdminShell';
import { C, SearchBar, EmptyState, LoadingOverlay, Pagination, useIsMobile } from '../../components/admin/AdminUI';
import { adminApiClient } from '../../api/adminClient';
import { fmtDate, fmtDateTime, fmtTime } from '../../utils/adminUtils';
import { getApiBaseUrl } from '../../api/config';
import { useToastStore } from '../../store/toastStore';
import { useConfirmStore } from '../../store/confirmStore';

const toAbsCover = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  const base = getApiBaseUrl().replace('/api/v1', '');
  return `${base}${url}`;
};

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'PENDING',  label: 'Pending Approval ⏳' },
  { id: 'APPROVED', label: 'Approved & Live ✅' },
  { id: 'ALL',      label: 'All Events' },
  { id: 'REJECTED', label: 'Rejected' },
];

export default function AdminEvents() {
  const isMobile = useIsMobile();
  const showToast = useToastStore((s) => s.showToast);

  const [events, setEvents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING');
  const [loading, setLoading] = useState(true);
  const [autoApproval, setAutoApproval] = useState(false);
  const [autoApprovalLoading, setAutoApprovalLoading] = useState(false);

  const fetchAutoApproval = useCallback(() => {
    adminApiClient.get('/admin-panel/settings/auto-approval')
      .then((r) => setAutoApproval(r.data.data.eventAutoApproval))
      .catch(() => {});
  }, []);

  useFocusEffect(fetchAutoApproval);

  const toggleAutoApproval = async () => {
    setAutoApprovalLoading(true);
    try {
      const next = !autoApproval;
      await adminApiClient.put('/admin-panel/settings/auto-approval', { type: 'event', enabled: next });
      setAutoApproval(next);
      showToast(next ? 'Auto approval enabled — all pending events approved' : 'Auto approval disabled', next ? 'success' : 'info');
      if (next) load();
    } catch {
      showToast('Failed to update auto approval', 'error');
    }
    setAutoApprovalLoading(false);
  };

  // Inspector modal
  const [inspectEvent, setInspectEvent] = useState<any | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam =
        statusFilter === 'ALL' ? undefined :
        statusFilter === 'PENDING' ? 'PENDING_APPROVAL' :
        statusFilter; // APPROVED | REJECTED sent as-is

      const params: any = {
        skip,
        take: 20,
        q: search || undefined,
        status: statusParam,
      };

      const res = await adminApiClient.get('/admin-panel/events', { params });
      const data = res.data?.data;
      setEvents(Array.isArray(data?.events) ? data.events : []);
      setTotal(data?.total ?? 0);
    } catch {
      setEvents([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [skip, search, statusFilter]);

  useEffect(() => { setSkip(0); }, [search, statusFilter]);
  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Metrics
  const statsOverview = useMemo(() => {
    const totalCount = total || events.length;
    const pendingCount = events.filter((e) => e.status === 'PENDING_APPROVAL').length;
    const approvedCount = events.filter((e) => e.status === 'APPROVED').length;
    const totalRsvps = events.reduce((acc, e) => acc + (e.rsvpCount || 0), 0);
    return { totalCount, pendingCount, approvedCount, totalRsvps };
  }, [events, total]);

  const approve = async (evt: any) => {
    const ok = await useConfirmStore.getState().confirm({
      title: 'Approve Event?',
      message: `Publish "${evt.title}" to the community explore feed and notify members?`,
      confirmText: 'Approve & Publish',
      cancelText: 'Cancel',
      isDestructive: false,
      icon: 'checkmark-circle-outline',
    });
    if (!ok) return;
    setIsProcessing(true);
    try {
      await adminApiClient.put(`/admin-panel/events/${evt.id}/approve`);
      showToast('Event approved successfully!', 'success');
      if (inspectEvent?.id === evt.id) setInspectEvent(null);
      load();
    } catch {
      showToast('Could not approve event.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const reject = async (evt: any) => {
    const ok = await useConfirmStore.getState().confirm({
      title: 'Reject Event?',
      message: `Decline "${evt.title}"? This event will not be shown publicly.`,
      confirmText: 'Reject Event',
      cancelText: 'Cancel',
      isDestructive: true,
      icon: 'close-circle-outline',
    });
    if (!ok) return;
    setIsProcessing(true);
    try {
      await adminApiClient.put(`/admin-panel/events/${evt.id}/reject`);
      showToast('Event rejected.', 'info');
      if (inspectEvent?.id === evt.id) setInspectEvent(null);
      load();
    } catch {
      showToast('Could not reject event.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const del = async (evt: any) => {
    const ok = await useConfirmStore.getState().confirm({
      title: 'Delete Event Permanently?',
      message: `Permanently delete "${evt.title}" and remove all RSVPs?`,
      confirmText: 'Delete Event',
      cancelText: 'Cancel',
      isDestructive: true,
      icon: 'trash-outline',
    });
    if (!ok) return;
    setIsProcessing(true);
    try {
      await adminApiClient.delete(`/admin-panel/events/${evt.id}`);
      showToast('Event deleted.', 'success');
      if (inspectEvent?.id === evt.id) setInspectEvent(null);
      load();
    } catch {
      showToast('Could not delete event.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AdminShell title="Community Events">
      <View style={s.container}>
        {/* Auto Approval Toggle */}
        <View style={s.autoApprovalBar}>
          <View style={{ flex: 1 }}>
            <Text style={s.autoApprovalTitle}>Auto Approval</Text>
            <Text style={s.autoApprovalSub}>
              {autoApproval ? 'New events are approved automatically' : 'New events require manual approval'}
            </Text>
          </View>
          <TouchableOpacity
            style={[s.autoApprovalBtn, autoApproval && s.autoApprovalBtnOn]}
            onPress={toggleAutoApproval}
            disabled={autoApprovalLoading}
          >
            <Text style={[s.autoApprovalBtnText, autoApproval && s.autoApprovalBtnTextOn]}>
              {autoApprovalLoading ? '...' : autoApproval ? '✅ ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* KPI Stats Strip */}
        <View style={s.statsGrid}>
          <View style={s.statBox}>
            <View style={[s.statIconWrap, { backgroundColor: '#EFF6FF' }]}>
              <Feather name="calendar" size={16} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.statNumber}>{statsOverview.totalCount.toLocaleString()}</Text>
              <Text style={s.statLabel} numberOfLines={1}>Total Events</Text>
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
              <Text style={s.statLabel} numberOfLines={1}>Live Events</Text>
            </View>
          </View>

          <View style={s.statBox}>
            <View style={[s.statIconWrap, { backgroundColor: '#FAF5FF' }]}>
              <Feather name="users" size={16} color="#7C3AED" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.statNumber}>{statsOverview.totalRsvps.toLocaleString()}</Text>
              <Text style={s.statLabel} numberOfLines={1}>Total RSVPs</Text>
            </View>
          </View>
        </View>

        {/* Search & Filter Toolbar */}
        <View style={s.toolbarCard}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search events by title, venue, or community…"
          />

          <View style={s.filterRow}>
            {STATUS_FILTERS.map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[s.filterChip, statusFilter === f.id && s.filterChipActive]}
                onPress={() => setStatusFilter(f.id)}
              >
                <Text style={[s.filterChipText, statusFilter === f.id && s.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Events Content */}
        {loading ? (
          <LoadingOverlay />
        ) : events.length === 0 ? (
          <View style={s.cardWrapper}>
            <EmptyState message="No community events match this filter." />
          </View>
        ) : isMobile ? (
          /* Mobile Card List */
          <View style={s.mobileListWrap}>
            {events.map((e) => {
              const isPending = e.status === 'PENDING_APPROVAL';
              const isApproved = e.status === 'APPROVED';
              const isRejected = e.status === 'REJECTED';

              const statusBg = isPending ? '#FEF9C3' : isApproved ? '#DCFCE7' : '#FEE2E2';
              const statusText = isPending ? '#A16207' : isApproved ? '#166534' : '#DC2626';
              const statusLabel = isPending ? 'Pending Approval' : isApproved ? 'Approved' : 'Rejected';

              return (
                <View key={e.id} style={s.eventCard}>
                  {/* Card Header with Banner */}
                  <View style={s.eventCardHeader}>
                    {e.coverUrl ? (
                      <Image source={{ uri: toAbsCover(e.coverUrl) }} style={s.eventCoverImg} />
                    ) : (
                      <View style={[s.eventCoverImg, s.eventCoverPlaceholder]}>
                        <Feather name="calendar" size={24} color={C.textMuted} />
                      </View>
                    )}
                    <View style={[s.statusPillBadge, { backgroundColor: statusBg }]}>
                      <Text style={[s.statusPillBadgeText, { color: statusText }]}>{statusLabel}</Text>
                    </View>
                  </View>

                  <View style={s.eventBody}>
                    <Text style={s.eventTitle} numberOfLines={2}>{e.title}</Text>

                    <View style={s.eventMetaGrid}>
                      <View style={s.eventMetaRow}>
                        <Feather name="calendar" size={12} color={C.accent} />
                        <Text style={s.eventMetaText}>
                          {fmtDate(e.startsAt)} {e.startsAt ? `at ${fmtTime(e.startsAt)}` : ''}
                        </Text>
                      </View>

                      {e.location && (
                        <View style={s.eventMetaRow}>
                          <Feather name="map-pin" size={12} color={C.accent} />
                          <Text style={s.eventMetaText} numberOfLines={1}>{e.location}</Text>
                        </View>
                      )}

                      <View style={s.eventMetaRow}>
                        <Feather name="globe" size={12} color={C.textMuted} />
                        <Text style={s.eventMetaText} numberOfLines={1}>
                          {e.community?.name || 'Public Event'} · By {e.creator?.displayName || 'Community Member'}
                        </Text>
                      </View>
                    </View>

                    <View style={s.rsvpStrip}>
                      <View style={s.rsvpBadge}>
                        <Feather name="check" size={12} color="#166534" />
                        <Text style={s.rsvpText}>{e.rsvpCount ?? 0} RSVPs</Text>
                      </View>
                      <Text style={s.createdText}>Submitted {fmtDate(e.createdAt)}</Text>
                    </View>

                    {/* Action buttons */}
                    <View style={s.actionsRow}>
                      <TouchableOpacity
                        style={[s.actionBtn, { backgroundColor: '#EFF6FF' }]}
                        onPress={() => setInspectEvent(e)}
                      >
                        <Feather name="eye" size={13} color="#1D4ED8" />
                        <Text style={[s.actionBtnText, { color: '#1D4ED8' }]}>Details</Text>
                      </TouchableOpacity>

                      {isPending && (
                        <>
                          <TouchableOpacity
                            style={[s.actionBtn, { backgroundColor: '#DCFCE7' }]}
                            onPress={() => approve(e)}
                          >
                            <Feather name="check" size={13} color="#166534" />
                            <Text style={[s.actionBtnText, { color: '#166534' }]}>Approve</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[s.actionBtn, { backgroundColor: '#FEE2E2' }]}
                            onPress={() => reject(e)}
                          >
                            <Feather name="x" size={13} color="#DC2626" />
                            <Text style={[s.actionBtnText, { color: '#DC2626' }]}>Reject</Text>
                          </TouchableOpacity>
                        </>
                      )}

                      <TouchableOpacity
                        style={[s.actionBtn, { backgroundColor: '#FEE2E2', width: 34, justifyContent: 'center' }]}
                        onPress={() => del(e)}
                      >
                        <Feather name="trash-2" size={13} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
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
                  <Text style={[s.th, { width: 80 }]}>Banner</Text>
                  <Text style={[s.th, { width: 240 }]}>Event Title & Community</Text>
                  <Text style={[s.th, { width: 170 }]}>Venue / Location</Text>
                  <Text style={[s.th, { width: 140 }]}>Date & Time</Text>
                  <Text style={[s.th, { width: 90 }]}>RSVPs</Text>
                  <Text style={[s.th, { width: 120 }]}>Status</Text>
                  <Text style={[s.th, { width: 180 }]}>Actions</Text>
                </View>

                {events.map((e, i) => {
                  const isPending = e.status === 'PENDING_APPROVAL';
                  const isApproved = e.status === 'APPROVED';
                  const statusBg = isPending ? '#FEF9C3' : isApproved ? '#DCFCE7' : '#FEE2E2';
                  const statusText = isPending ? '#A16207' : isApproved ? '#166534' : '#DC2626';
                  const statusLabel = isPending ? 'Pending' : isApproved ? 'Approved' : 'Rejected';

                  return (
                    <View key={e.id} style={[s.tableRow, i % 2 === 0 && { backgroundColor: C.rowEven }]}>
                      {/* Banner */}
                      <View style={[s.cell, { width: 80 }]}>
                        {e.coverUrl ? (
                          <Image source={{ uri: toAbsCover(e.coverUrl) }} style={s.tableThumb} />
                        ) : (
                          <View style={[s.tableThumb, s.eventCoverPlaceholder]}>
                            <Feather name="calendar" size={16} color={C.textMuted} />
                          </View>
                        )}
                      </View>

                      {/* Title & Community */}
                      <View style={[s.cell, { width: 240 }]}>
                        <Text style={s.tableEventTitle} numberOfLines={1}>{e.title}</Text>
                        <Text style={s.tableEventSub} numberOfLines={1}>
                          {e.community?.name || 'General Event'} · By {e.creator?.displayName || 'Member'}
                        </Text>
                      </View>

                      {/* Location */}
                      <View style={[s.cell, { width: 170 }]}>
                        <Text style={s.tableLocationText} numberOfLines={1}>{e.location || '—'}</Text>
                      </View>

                      {/* Date */}
                      <View style={[s.cell, { width: 140 }]}>
                        <Text style={s.tableDateText}>{fmtDate(e.startsAt)}</Text>
                        {e.startsAt && <Text style={s.tableTimeText}>{fmtTime(e.startsAt)}</Text>}
                      </View>

                      {/* RSVPs */}
                      <View style={[s.cell, { width: 90 }]}>
                        <Text style={s.tableRsvpText}>{e.rsvpCount ?? 0}</Text>
                      </View>

                      {/* Status */}
                      <View style={[s.cell, { width: 120 }]}>
                        <View style={[s.statusPillBadge, { backgroundColor: statusBg }]}>
                          <Text style={[s.statusPillBadgeText, { color: statusText }]}>{statusLabel}</Text>
                        </View>
                      </View>

                      {/* Actions */}
                      <View style={[s.cell, { width: 180, flexDirection: 'row', gap: 6 }]}>
                        <TouchableOpacity
                          style={[s.iconActionBtn, { backgroundColor: '#EFF6FF' }]}
                          onPress={() => setInspectEvent(e)}
                        >
                          <Feather name="eye" size={13} color="#1D4ED8" />
                        </TouchableOpacity>

                        {isPending && (
                          <>
                            <TouchableOpacity
                              style={[s.iconActionBtn, { backgroundColor: '#DCFCE7' }]}
                              onPress={() => approve(e)}
                            >
                              <Feather name="check" size={13} color="#166534" />
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[s.iconActionBtn, { backgroundColor: '#FEE2E2' }]}
                              onPress={() => reject(e)}
                            >
                              <Feather name="x" size={13} color="#DC2626" />
                            </TouchableOpacity>
                          </>
                        )}

                        <TouchableOpacity
                          style={[s.iconActionBtn, { backgroundColor: '#FEE2E2' }]}
                          onPress={() => del(e)}
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

        <Pagination skip={skip} take={20} total={total} onPage={setSkip} />

        {/* Event Inspector Modal */}
        <Modal
          visible={!!inspectEvent}
          transparent
          animationType="fade"
          onRequestClose={() => setInspectEvent(null)}
        >
          <View style={s.modalOverlay}>
            <View style={s.modalContent}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Event Inspection & Approval</Text>
                <TouchableOpacity onPress={() => setInspectEvent(null)}>
                  <Feather name="x" size={20} color={C.textSecond} />
                </TouchableOpacity>
              </View>

              {inspectEvent && (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                  {inspectEvent.coverUrl && (
                    <Image source={{ uri: toAbsCover(inspectEvent.coverUrl) }} style={s.modalCoverImg} />
                  )}

                  <View style={{ gap: 4 }}>
                    <Text style={s.modalEventTitle}>{inspectEvent.title}</Text>
                    <Text style={s.modalEventSub}>
                      Organized by {inspectEvent.creator?.displayName || 'Community Member'} · in {inspectEvent.community?.name || 'General Community'}
                    </Text>
                  </View>

                  <View style={s.modalInfoBox}>
                    <View style={s.modalInfoRow}>
                      <Feather name="calendar" size={14} color={C.accent} />
                      <Text style={s.modalInfoVal}>
                        Starts: {fmtDateTime(inspectEvent.startsAt)}
                      </Text>
                    </View>
                    {inspectEvent.endsAt && (
                      <View style={s.modalInfoRow}>
                        <Feather name="clock" size={14} color={C.accent} />
                        <Text style={s.modalInfoVal}>Ends: {fmtDateTime(inspectEvent.endsAt)}</Text>
                      </View>
                    )}
                    {inspectEvent.location && (
                      <View style={s.modalInfoRow}>
                        <Feather name="map-pin" size={14} color={C.accent} />
                        <Text style={s.modalInfoVal}>{inspectEvent.location}</Text>
                      </View>
                    )}
                    <View style={s.modalInfoRow}>
                      <Feather name="users" size={14} color={C.accent} />
                      <Text style={s.modalInfoVal}>{inspectEvent.rsvpCount ?? 0} Members Attending</Text>
                    </View>
                  </View>

                  <Text style={s.modalSectionTitle}>Event Description</Text>
                  <Text style={s.modalDescriptionText}>
                    {inspectEvent.description || 'No detailed description provided.'}
                  </Text>

                  {/* Modal Action Buttons */}
                  <View style={s.modalActionsRow}>
                    {inspectEvent.status === 'PENDING_APPROVAL' ? (
                      <>
                        <TouchableOpacity
                          style={[s.modalBtn, { backgroundColor: '#DC2626' }]}
                          onPress={() => reject(inspectEvent)}
                          disabled={isProcessing}
                        >
                          <Text style={[s.modalBtnText, { color: '#FFF' }]}>Reject</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[s.modalBtn, { backgroundColor: C.accent }]}
                          onPress={() => approve(inspectEvent)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <ActivityIndicator size="small" color="#FFF" />
                          ) : (
                            <Text style={[s.modalBtnText, { color: '#FFF' }]}>Approve & Publish</Text>
                          )}
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity
                        style={[s.modalBtn, { backgroundColor: C.bg }]}
                        onPress={() => setInspectEvent(null)}
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
      </View>
    </AdminShell>
  );
}

const s = StyleSheet.create({
  container: { gap: 12, paddingBottom: 24 },

  autoApprovalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  autoApprovalTitle: { fontSize: 13, fontWeight: '700', color: C.textPrimary },
  autoApprovalSub: { fontSize: 11.5, color: C.textMuted, marginTop: 1 },
  autoApprovalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  autoApprovalBtnOn: { backgroundColor: C.accent, borderColor: C.accent },
  autoApprovalBtnText: { fontSize: 12, fontWeight: '700', color: C.textSecond },
  autoApprovalBtnTextOn: { color: '#fff' },

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
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filterChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.bg,
  },
  filterChipActive: { backgroundColor: C.accent, borderColor: C.accent },
  filterChipText: { fontSize: 11.5, fontWeight: '600', color: C.textSecond },
  filterChipTextActive: { color: '#FFF' },

  // Mobile List
  mobileListWrap: { gap: 10 },
  eventCard: {
    backgroundColor: C.white, borderRadius: 14,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  eventCardHeader: { height: 120, position: 'relative', backgroundColor: '#E2E8F0' },
  eventCoverImg: { width: '100%', height: '100%' },
  eventCoverPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  statusPillBadge: {
    position: 'absolute', top: 8, right: 8,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  statusPillBadgeText: { fontSize: 10.5, fontWeight: '800' },

  eventBody: { padding: 12, gap: 8 },
  eventTitle: { fontSize: 14.5, fontWeight: '800', color: C.textPrimary, lineHeight: 19 },
  eventMetaGrid: { gap: 4, backgroundColor: C.bg, padding: 8, borderRadius: 8 },
  eventMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eventMetaText: { fontSize: 11.5, color: C.textSecond, flex: 1 },

  rsvpStrip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  rsvpBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#DCFCE7', paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6,
  },
  rsvpText: { fontSize: 11, fontWeight: '700', color: '#166534' },
  createdText: { fontSize: 10.5, color: C.textMuted },

  actionsRow: { flexDirection: 'row', gap: 6, paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 7, borderRadius: 6,
  },
  actionBtnText: { fontSize: 11.5, fontWeight: '700' },

  // Table Desktop
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
  tableThumb: { width: 56, height: 38, borderRadius: 6 },
  tableEventTitle: { fontSize: 12.5, fontWeight: '700', color: C.textPrimary },
  tableEventSub: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  tableLocationText: { fontSize: 12, color: C.textSecond },
  tableDateText: { fontSize: 12, fontWeight: '600', color: C.textPrimary },
  tableTimeText: { fontSize: 11, color: C.textMuted },
  tableRsvpText: { fontSize: 12, fontWeight: '700', color: C.accent },

  iconActionBtn: {
    width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center',
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalContent: { backgroundColor: C.white, borderRadius: 16, padding: 18, width: '100%', maxWidth: 520, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: C.textPrimary },

  modalCoverImg: { width: '100%', height: 160, borderRadius: 10, marginBottom: 4 },
  modalEventTitle: { fontSize: 16, fontWeight: '800', color: C.textPrimary, lineHeight: 21 },
  modalEventSub: { fontSize: 12, color: C.textMuted },

  modalInfoBox: { backgroundColor: C.bg, borderRadius: 10, padding: 10, gap: 6, borderWidth: 1, borderColor: C.border },
  modalInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalInfoVal: { fontSize: 12, color: C.textSecond, fontWeight: '600', flex: 1 },

  modalSectionTitle: { fontSize: 12.5, fontWeight: '700', color: C.textPrimary, marginTop: 4 },
  modalDescriptionText: { fontSize: 12.5, color: C.textSecond, lineHeight: 18 },

  modalActionsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  modalBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  modalBtnText: { fontSize: 13, fontWeight: '700' },
});
