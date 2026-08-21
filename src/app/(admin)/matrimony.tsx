import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
  ScrollView, Alert, TextInput, Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import AdminShell from '../../components/admin/AdminShell';
import { C, SearchBar, EmptyState, LoadingOverlay, useIsMobile } from '../../components/admin/AdminUI';
import { adminApiClient } from '../../api/adminClient';
import { fmtDate, fmtDateTime } from '../../utils/adminUtils';
import { useToastStore } from '../../store/toastStore';
import { useConfirmStore } from '../../store/confirmStore';

const STATUS_TABS = ['PENDING', 'APPROVED', 'REJECTED', 'CHATS'] as const;
type StatusTab = typeof STATUS_TABS[number];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING:  { bg: '#FEF9C3', text: '#92400E' },
  APPROVED: { bg: '#DCFCE7', text: '#166534' },
  REJECTED: { bg: '#FEE2E2', text: '#991B1B' },
};

export default function AdminMatrimonyProfiles() {
  const isMobile = useIsMobile();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<StatusTab>('PENDING');
  const [search, setSearch] = useState('');
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [reviewProfile, setReviewProfile] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'CHATS') {
        const res = await adminApiClient.get('/admin-panel/matrimony-chats');
        setChats(res.data?.data ?? []);
      } else {
        const res = await adminApiClient.get('/matrimony/admin/all', { params: { status: activeTab } });
        setProfiles(res.data?.data ?? []);
      }
    } catch { setProfiles([]); setChats([]); }
    setLoading(false);
  }, [activeTab]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const approve = async (id: string) => {
    try {
      await adminApiClient.patch(`/matrimony/admin/${id}/approve`);
      setProfiles(p => p.filter(x => x.id !== id));
      setReviewProfile(null);
    } catch {
      useToastStore.getState().showToast('Failed to approve profile', 'error');
    }
  };

  const openReject = (id: string, name: string) => {
    setRejectReason('');
    setReviewProfile(null);
    setRejectModal({ id, name });
  };

  const confirmReject = async () => {
    if (!rejectModal) return;
    try {
      await adminApiClient.patch(`/matrimony/admin/${rejectModal.id}/reject`, { reason: rejectReason || undefined });
      setProfiles(p => p.filter(x => x.id !== rejectModal.id));
      setRejectModal(null);
    } catch {
      useToastStore.getState().showToast('Failed to reject profile', 'error');
    }
  };

  const deleteProfile = async (id: string, name: string) => {
    const ok = await useConfirmStore.getState().confirm({
      title: 'Delete profile?',
      message: `Permanently delete ${name}'s profile? This cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDestructive: true,
      icon: 'trash-outline',
    });
    if (!ok) return;

    try {
      await adminApiClient.delete(`/matrimony/admin/${id}`);
      setProfiles(p => p.filter(x => x.id !== id));
    } catch {
      useToastStore.getState().showToast('Failed to delete profile', 'error');
    }
  };

  const filtered = profiles.filter(p =>
    !search ||
    p.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    p.city?.toLowerCase().includes(search.toLowerCase()) ||
    p.user?.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminShell title="Matrimony Profiles">
      {/* Status tabs */}
      <View style={s.tabs}>
        {STATUS_TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[s.tab, activeTab === tab && s.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.toolbar}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search by name, city, email..." />
      </View>

      {loading ? <LoadingOverlay /> : filtered.length === 0 ? (
        <View style={s.card}>
          <EmptyState message={`No ${activeTab.toLowerCase()} profiles found.`} />
        </View>
      ) : activeTab === 'CHATS' ? (
        <View style={s.card}>
          {chats.length === 0 ? <EmptyState message="No active matrimony chats." /> : (
            <ScrollView>
              {chats.map((c, i) => (
                <View key={c.matchId} style={[s.row, i % 2 === 0 && { backgroundColor: C.rowEven }]}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {c.isActiveNow && (
                      <View style={s.activeDot} />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={s.name}>{c.profileA} ↔ {c.profileB}</Text>
                      {c.lastMessage && (
                        <Text style={s.sub} numberOfLines={1}>
                          {c.lastMessage.sender?.displayName}: {c.lastMessage.content ?? 'Media'}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    {c.isActiveNow && (
                      <View style={s.textingBadge}>
                        <Text style={s.textingText}>● Texting</Text>
                      </View>
                    )}
                    <Text style={[s.sub, { marginTop: 4 }]}>{fmtDateTime(c.lastMessageAt)}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      ) : (
        <View style={s.card}>
          {!isMobile && (
            <View style={s.tableHeader}>
              <Text style={[s.th, { flex: 2 }]}>Profile</Text>
              <Text style={[s.th, { width: 80 }]}>Gender</Text>
              <Text style={[s.th, { width: 60 }]}>Age</Text>
              <Text style={[s.th, { width: 120 }]}>City</Text>
              <Text style={[s.th, { width: 80 }]}>Status</Text>
              <Text style={[s.th, { width: 140 }]}>Submitted</Text>
              <Text style={[s.th, { width: 220 }]}>Actions</Text>
            </View>
          )}
          <ScrollView>
            {filtered.map((p, i) => {
              const sc = STATUS_COLORS[p.approvalStatus as StatusTab] ?? STATUS_COLORS.PENDING;
              if (isMobile) {
                return (
                  <View key={p.id} style={[s.mobileCard, i % 2 === 0 && { backgroundColor: C.rowEven }]}>
                    <View style={s.mobileTop}>
                      <View style={s.avatar}>
                        {(p.avatarUrl || p.photos?.[0])
                          ? <Image source={{ uri: p.avatarUrl ?? p.photos[0] }} style={s.avatarImg} />
                          : <Text style={s.avatarFallback}>{p.displayName?.[0]?.toUpperCase()}</Text>
                        }
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.name}>{p.displayName}</Text>
                        <Text style={s.sub}>{p.user?.email ?? ''}</Text>
                      </View>
                      <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                        <Text style={[s.statusText, { color: sc.text }]}>{p.approvalStatus}</Text>
                      </View>
                    </View>
                    <Text style={s.meta}>{p.gender} · {p.age} yrs · {p.city}</Text>
                    <View style={s.mobileActions}>
                      <ActionBtn icon="eye" label="Review" onPress={() => setReviewProfile(p)} color="#1D4ED8" bg="#EFF6FF" />
                      {p.approvalStatus === 'PENDING' && (
                        <>
                          <ActionBtn icon="check" label="Approve" onPress={() => approve(p.id)} color="#166534" bg="#DCFCE7" />
                          <ActionBtn icon="x" label="Reject" onPress={() => openReject(p.id, p.displayName)} color="#991B1B" bg="#FEE2E2" />
                        </>
                      )}
                      <ActionBtn icon="trash-2" label="Delete" onPress={() => deleteProfile(p.id, p.displayName)} color={C.danger} bg={C.danger + '15'} />
                    </View>
                  </View>
                );
              }
              return (
                <View key={p.id} style={[s.row, i % 2 === 0 && { backgroundColor: C.rowEven }]}>
                  <View style={[s.cell, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                    <View style={s.avatar}>
                      {(p.avatarUrl || p.photos?.[0])
                        ? <Image source={{ uri: p.avatarUrl ?? p.photos[0] }} style={s.avatarImg} />
                        : <Text style={s.avatarFallback}>{p.displayName?.[0]?.toUpperCase()}</Text>
                      }
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.name} numberOfLines={1}>{p.displayName}</Text>
                      <Text style={s.sub} numberOfLines={1}>{p.user?.email ?? ''}</Text>
                    </View>
                  </View>
                  <Text style={[s.cell, { width: 80, fontSize: 12, color: C.textSecond }]}>{p.gender}</Text>
                  <Text style={[s.cell, { width: 60, fontSize: 12, color: C.textSecond }]}>{p.age}</Text>
                  <Text style={[s.cell, { width: 120, fontSize: 12, color: C.textSecond }]} numberOfLines={1}>{p.city}</Text>
                  <View style={[s.cell, { width: 80 }]}>
                    <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                      <Text style={[s.statusText, { color: sc.text }]}>{p.approvalStatus}</Text>
                    </View>
                  </View>
                  <Text style={[s.cell, { width: 140, fontSize: 11, color: C.textMuted }]}>{fmtDate(p.createdAt)}</Text>
                  <View style={[s.cell, { width: 220, flexDirection: 'row', gap: 4, flexWrap: 'wrap' }]}>
                    <ActionBtn icon="eye" label="Review" onPress={() => setReviewProfile(p)} color="#1D4ED8" bg="#EFF6FF" />
                    {p.approvalStatus === 'PENDING' && (
                      <>
                        <ActionBtn icon="check" label="Approve" onPress={() => approve(p.id)} color="#166534" bg="#DCFCE7" />
                        <ActionBtn icon="x" label="Reject" onPress={() => openReject(p.id, p.displayName)} color="#991B1B" bg="#FEE2E2" />
                      </>
                    )}
                    <ActionBtn icon="trash-2" label="Delete" onPress={() => deleteProfile(p.id, p.displayName)} color={C.danger} bg={C.danger + '15'} />
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Review Profile Modal */}
      <Modal visible={!!reviewProfile} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { maxWidth: 520, maxHeight: '90%' }]}>
            <View style={s.reviewHeader}>
              <Text style={s.modalTitle}>Review Profile</Text>
              <TouchableOpacity onPress={() => setReviewProfile(null)}>
                <Feather name="x" size={20} color={C.textSecond} />
              </TouchableOpacity>
            </View>
            {!!reviewProfile && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {reviewProfile.photos?.length > 0 && (
                  <View style={s.reviewPhotoGrid}>
                    {reviewProfile.photos.map((photo: string, i: number) => (
                      <Image key={i} source={{ uri: photo }} style={s.reviewPhoto} resizeMode="cover" />
                    ))}
                  </View>
                )}
                <ReviewRow label="Name" value={reviewProfile.displayName} />
                <ReviewRow label="Email" value={reviewProfile.user?.email} />
                <ReviewRow label="Gender" value={reviewProfile.gender} />
                <ReviewRow label="Age" value={`${reviewProfile.age} years`} />
                <ReviewRow label="Date of Birth" value={reviewProfile.dateOfBirth?.slice(0, 10)} />
                <ReviewRow label="Height" value={reviewProfile.height} />
                <ReviewRow label="Marital Status" value={reviewProfile.maritalStatus} />
                <ReviewRow label="Religion" value={reviewProfile.religion} />
                <ReviewRow label="Caste" value={reviewProfile.caste} />
                <ReviewRow label="Mother Tongue" value={reviewProfile.motherTongue} />
                <ReviewRow label="Education" value={reviewProfile.education} />
                <ReviewRow label="Occupation" value={reviewProfile.occupation} />
                <ReviewRow label="Annual Income" value={reviewProfile.annualIncome} />
                <ReviewRow label="City" value={reviewProfile.city} />
                <ReviewRow label="State" value={reviewProfile.state} />
                {reviewProfile.aboutMe && <ReviewRow label="About" value={reviewProfile.aboutMe} />}
                <ReviewRow label="Submitted" value={fmtDate(reviewProfile.createdAt)} />
                {reviewProfile.approvalStatus === 'PENDING' && (
                  <View style={s.reviewActions}>
                    <TouchableOpacity style={s.reviewApproveBtn} onPress={() => approve(reviewProfile.id)}>
                      <Feather name="check" size={14} color="#fff" />
                      <Text style={s.reviewApproveBtnText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.reviewRejectBtn} onPress={() => openReject(reviewProfile.id, reviewProfile.displayName)}>
                      <Feather name="x" size={14} color="#fff" />
                      <Text style={s.reviewRejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Reject reason modal */}
      <Modal visible={!!rejectModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Reject Profile</Text>
            <Text style={s.modalSub}>Rejecting {rejectModal?.name}'s profile. Provide a reason (optional):</Text>
            <TextInput
              style={s.reasonInput}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Reason for rejection..."
              multiline
              numberOfLines={3}
            />
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setRejectModal(null)}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.rejectBtn} onPress={confirmReject}>
                <Text style={s.rejectBtnText}>Reject Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AdminShell>
  );
}

function ReviewRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={s.reviewRow}>
      <Text style={s.reviewLabel}>{label}</Text>
      <Text style={s.reviewValue}>{value}</Text>
    </View>
  );
}

function ActionBtn({ icon, label, onPress, color, bg }: { icon: any; label: string; onPress: () => void; color: string; bg: string }) {
  return (
    <TouchableOpacity style={[s.actionBtn, { borderColor: color + '50', backgroundColor: bg }]} onPress={onPress}>
      <Feather name={icon} size={11} color={color} />
      <Text style={[s.actionBtnText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tab: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
  },
  tabActive: { backgroundColor: C.accent, borderColor: C.accent },
  tabText: { fontSize: 12, fontWeight: '700', color: C.textSecond },
  tabTextActive: { color: '#fff' },
  toolbar: { marginBottom: 14 },
  card: {
    backgroundColor: C.white, borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: C.border, marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row', backgroundColor: C.headerBg,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 2, borderBottomColor: C.border,
  },
  th: { fontSize: 11, fontWeight: '700', color: C.textSecond, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  cell: { paddingRight: 8 },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.accentLight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImg: { width: 36, height: 36 },
  avatarFallback: { fontSize: 14, fontWeight: '700', color: C.accent },
  name: { fontSize: 13, fontWeight: '700', color: C.textPrimary },
  sub: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  statusBadge: { borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start' },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 4, borderRadius: 5, borderWidth: 1,
  },
  actionBtnText: { fontSize: 11, fontWeight: '600' },
  mobileCard: { padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  mobileTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  meta: { fontSize: 12, color: C.textSecond, marginBottom: 8 },
  mobileActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  // Review modal
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  reviewPhotoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  reviewPhoto: { width: 100, height: 100, borderRadius: 10 },
  reviewRow: { flexDirection: 'row', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.border },
  reviewLabel: { width: 110, fontSize: 12, fontWeight: '700', color: C.textSecond },
  reviewValue: { flex: 1, fontSize: 12, color: C.textPrimary },
  reviewActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  reviewApproveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, backgroundColor: '#166534' },
  reviewApproveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  reviewRejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, backgroundColor: '#DC2626' },
  reviewRejectBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  // Reject modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalBox: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: C.textPrimary, marginBottom: 6 },
  modalSub: { fontSize: 13, color: C.textSecond, marginBottom: 14 },
  reasonInput: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: 10,
    padding: 12, fontSize: 13, minHeight: 80, textAlignVertical: 'top', marginBottom: 16,
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: C.textSecond },
  rejectBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#DC2626', alignItems: 'center' },
  rejectBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  // Texting indicator
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },
  textingBadge: { backgroundColor: '#DCFCE7', borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3 },
  textingText: { fontSize: 11, fontWeight: '700', color: '#166534' },
});
