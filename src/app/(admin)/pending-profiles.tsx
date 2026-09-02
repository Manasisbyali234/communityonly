import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import AdminShell from '../../components/admin/AdminShell';
import { C, SearchBar, EmptyState, useIsMobile } from '../../components/admin/AdminUI';
import { useUserApprovalStore, ManagedUser } from '../../store/userApprovalStore';
import { useToastStore } from '../../store/toastStore';
import { useConfirmStore } from '../../store/confirmStore';
import { useAdminStore } from '../../store/adminStore';

type TabType = 'PENDING' | 'RESUBMITTED' | 'APPROVED' | 'REJECTED' | 'ALL';

export default function PendingProfilesScreen() {
  const isMobile = useIsMobile();
  const showToast = useToastStore((s) => s.showToast);
  const confirm = useConfirmStore((s) => s.confirm);
  const admin = useAdminStore((s) => s.admin);

  const users = useUserApprovalStore((s) => s.users);
  const approveUser = useUserApprovalStore((s) => s.approveUser);
  const rejectUser = useUserApprovalStore((s) => s.rejectUser);
  const suspendUser = useUserApprovalStore((s) => s.suspendUser);
  const reactivateUser = useUserApprovalStore((s) => s.reactivateUser);

  const [activeTab, setActiveTab] = useState<TabType>('PENDING');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Reject Modal State
  const [rejectingUser, setRejectingUser] = useState<ManagedUser | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  // Counts
  const counts = useMemo(() => {
    const pending = users.filter((u) => u.approvalStatus === 'PENDING').length;
    const resubmitted = users.filter((u) => u.approvalStatus === 'RESUBMITTED').length;
    const approved = users.filter((u) => u.approvalStatus === 'APPROVED').length;
    const rejected = users.filter((u) => u.approvalStatus === 'REJECTED').length;
    return { pending, resubmitted, approved, rejected, all: users.length };
  }, [users]);

  // Filtered List
  const filteredUsers = useMemo(() => {
    let list = [...users];

    if (activeTab === 'PENDING') {
      list = list.filter((u) => u.approvalStatus === 'PENDING');
    } else if (activeTab === 'RESUBMITTED') {
      list = list.filter((u) => u.approvalStatus === 'RESUBMITTED');
    } else if (activeTab === 'APPROVED') {
      list = list.filter((u) => u.approvalStatus === 'APPROVED');
    } else if (activeTab === 'REJECTED') {
      list = list.filter((u) => u.approvalStatus === 'REJECTED');
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((u) => {
        const name = (u.displayName || '').toLowerCase();
        const family = (u.familyName || '').toLowerCase();
        const phone = (u.phone || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        const district = (u.district || '').toLowerCase();
        const city = (u.city || '').toLowerCase();
        return (
          name.includes(q) ||
          family.includes(q) ||
          phone.includes(q) ||
          email.includes(q) ||
          district.includes(q) ||
          city.includes(q)
        );
      });
    }

    return list;
  }, [users, activeTab, search]);

  // Action: Approve
  const handleApprove = useCallback(
    async (user: ManagedUser) => {
      const confirmed = await confirm({
        title: 'Approve this profile?',
        message: 'This user will be able to access the community features after approval.',
        confirmText: 'Approve',
        cancelText: 'Cancel',
        isDestructive: false,
        icon: 'checkmark-circle-outline',
      });

      if (confirmed) {
        approveUser(user.id, admin?.displayName || admin?.username || 'Administrator');
        showToast(`Profile of ${user.displayName} approved successfully!`, 'success');
        if (showDetailModal && selectedUser?.id === user.id) {
          setShowDetailModal(false);
        }
      }
    },
    [confirm, approveUser, admin, showToast, showDetailModal, selectedUser]
  );

  // Action: Open Reject Modal
  const handleOpenReject = (user: ManagedUser) => {
    setRejectingUser(user);
    setRejectionReason('');
    setRejectError('');
  };

  // Action: Confirm Reject
  const handleConfirmReject = () => {
    if (!rejectionReason.trim()) {
      setRejectError('Please provide a reason for rejecting this profile.');
      return;
    }

    if (rejectingUser) {
      rejectUser(rejectingUser.id, rejectionReason.trim(), admin?.displayName || admin?.username || 'Administrator');
      showToast(`Profile of ${rejectingUser.displayName} marked as Rejected.`, 'info');
      setRejectingUser(null);
      setRejectionReason('');
      if (showDetailModal && selectedUser?.id === rejectingUser.id) {
        setShowDetailModal(false);
      }
    }
  };

  const renderStatusBadge = (status?: string) => {
    switch (status) {
      case 'APPROVED':
        return <View style={[styles.badge, { backgroundColor: '#DCFCE7' }]}><Text style={[styles.badgeText, { color: '#16A34A' }]}>🟢 Approved</Text></View>;
      case 'REJECTED':
        return <View style={[styles.badge, { backgroundColor: '#FEE2E2' }]}><Text style={[styles.badgeText, { color: '#DC2626' }]}>🔴 Rejected</Text></View>;
      case 'RESUBMITTED':
        return <View style={[styles.badge, { backgroundColor: '#DBEAFE' }]}><Text style={[styles.badgeText, { color: '#2563EB' }]}>🔵 Resubmitted</Text></View>;
      case 'SUSPENDED':
        return <View style={[styles.badge, { backgroundColor: '#F1F5F9' }]}><Text style={[styles.badgeText, { color: '#475569' }]}>⚫ Suspended</Text></View>;
      case 'PENDING':
      default:
        return <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}><Text style={[styles.badgeText, { color: '#D97706' }]}>🟠 Pending</Text></View>;
    }
  };

  return (
    <AdminShell title="Pending Profiles">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Top Header Card */}
        <View style={styles.headerCard}>
          <View>
            <Text style={styles.pageTitle}>User Management → Pending Profiles</Text>
            <Text style={styles.pageSub}>
              Review, verify, and approve new member registration profiles for community access.
            </Text>
          </View>
        </View>

        {/* Tab Filters */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'PENDING' && styles.tabBtnActive]}
            onPress={() => setActiveTab('PENDING')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'PENDING' && styles.tabBtnTextActive]}>
              Pending ({counts.pending})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'RESUBMITTED' && styles.tabBtnActive]}
            onPress={() => setActiveTab('RESUBMITTED')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'RESUBMITTED' && styles.tabBtnTextActive]}>
              Resubmitted ({counts.resubmitted})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'APPROVED' && styles.tabBtnActive]}
            onPress={() => setActiveTab('APPROVED')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'APPROVED' && styles.tabBtnTextActive]}>
              Approved ({counts.approved})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'REJECTED' && styles.tabBtnActive]}
            onPress={() => setActiveTab('REJECTED')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'REJECTED' && styles.tabBtnTextActive]}>
              Rejected ({counts.rejected})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'ALL' && styles.tabBtnActive]}
            onPress={() => setActiveTab('ALL')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'ALL' && styles.tabBtnTextActive]}>
              All ({counts.all})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, family, phone, email, district..."
          />
        </View>

        {/* Profiles List */}
        {filteredUsers.length === 0 ? (
          <EmptyState
            message={search ? `No profiles match "${search}"` : 'All registrations have been reviewed.'}
          />
        ) : (
          <View style={styles.listGrid}>
            {filteredUsers.map((item) => {
              const isActionable = item.approvalStatus === 'PENDING' || item.approvalStatus === 'RESUBMITTED';
              return (
                <View key={item.id} style={styles.userCard}>
                  {/* Card Top */}
                  <View style={styles.cardTopRow}>
                    <Image
                      source={{ uri: item.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200' }}
                      style={styles.avatarImg}
                    />
                    <View style={styles.cardInfoCol}>
                      <View style={styles.nameRow}>
                        <Text style={styles.displayName}>{item.displayName}</Text>
                        {renderStatusBadge(item.approvalStatus)}
                      </View>

                      {item.familyName ? (
                        <View style={styles.familyBadge}>
                          <Ionicons name="people-outline" size={12} color="#166534" />
                          <Text style={styles.familyText}>Family: {item.familyName}</Text>
                        </View>
                      ) : null}

                      <Text style={styles.metaRow}>
                        {item.gender ? `${item.gender} • ` : ''}
                        {item.dob ? `DOB: ${item.dob}` : ''}
                      </Text>
                    </View>
                  </View>

                  {/* Contact & Location Details */}
                  <View style={styles.detailsGrid}>
                    <View style={styles.detailItem}>
                      <Feather name="phone" size={13} color="#64748B" />
                      <Text style={styles.detailText}>{item.phone || 'No phone'}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Feather name="mail" size={13} color="#64748B" />
                      <Text style={styles.detailText} numberOfLines={1}>{item.email || 'No email'}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Feather name="map-pin" size={13} color="#64748B" />
                      <Text style={styles.detailText} numberOfLines={1}>
                        {item.city ? `${item.city}, ` : ''}{item.district || item.state || 'Karnataka'}
                      </Text>
                    </View>
                    {item.occupation ? (
                      <View style={styles.detailItem}>
                        <Feather name="briefcase" size={13} color="#64748B" />
                        <Text style={styles.detailText} numberOfLines={1}>{item.occupation}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Rejection Note if Rejected */}
                  {item.rejectionReason ? (
                    <View style={styles.rejectionNoticeBox}>
                      <Text style={styles.rejectionNoticeTitle}>Rejection Reason:</Text>
                      <Text style={styles.rejectionNoticeText}>"{item.rejectionReason}"</Text>
                    </View>
                  ) : null}

                  {/* Card Actions */}
                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity
                      style={styles.viewBtn}
                      onPress={() => {
                        setSelectedUser(item);
                        setShowDetailModal(true);
                      }}
                    >
                      <Feather name="eye" size={14} color="#1E293B" />
                      <Text style={styles.viewBtnText}>View Profile</Text>
                    </TouchableOpacity>

                    {isActionable ? (
                      <>
                        <TouchableOpacity
                          style={styles.rejectBtn}
                          onPress={() => handleOpenReject(item)}
                        >
                          <Feather name="x" size={14} color="#DC2626" />
                          <Text style={styles.rejectBtnText}>Reject</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.approveBtn}
                          onPress={() => handleApprove(item)}
                        >
                          <Feather name="check" size={14} color="#FFF" />
                          <Text style={styles.approveBtnText}>Approve</Text>
                        </TouchableOpacity>
                      </>
                    ) : item.approvalStatus === 'APPROVED' ? (
                      <TouchableOpacity
                        style={styles.suspendBtn}
                        onPress={async () => {
                          const ok = await confirm({
                            title: `Suspend ${item.displayName}?`,
                            message: 'This user will temporarily lose community access.',
                            confirmText: 'Suspend',
                            cancelText: 'Cancel',
                            isDestructive: true,
                          });
                          if (ok) {
                            suspendUser(item.id);
                            showToast(`${item.displayName} suspended.`, 'info');
                          }
                        }}
                      >
                        <Feather name="slash" size={13} color="#475569" />
                        <Text style={styles.suspendBtnText}>Suspend</Text>
                      </TouchableOpacity>
                    ) : item.approvalStatus === 'SUSPENDED' ? (
                      <TouchableOpacity
                        style={styles.approveBtn}
                        onPress={() => {
                          reactivateUser(item.id);
                          showToast(`${item.displayName} reactivated!`, 'success');
                        }}
                      >
                        <Feather name="check" size={13} color="#FFF" />
                        <Text style={styles.approveBtnText}>Reactivate</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.approveBtn}
                        onPress={() => handleApprove(item)}
                      >
                        <Feather name="refresh-cw" size={13} color="#FFF" />
                        <Text style={styles.approveBtnText}>Re-Approve</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ── View Full Profile Modal ────────────────────────────── */}
      <Modal visible={showDetailModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.detailModalBox, isMobile && { width: '95%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Member Verification Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)} style={styles.modalCloseIcon}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.modalAvatarRow}>
                  <Image
                    source={{ uri: selectedUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200' }}
                    style={styles.modalAvatar}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalUserName}>{selectedUser.displayName}</Text>
                    <Text style={styles.modalFamily}>Family / Okka: {selectedUser.familyName || 'N/A'}</Text>
                    <View style={{ marginTop: 4 }}>{renderStatusBadge(selectedUser.approvalStatus)}</View>
                  </View>
                </View>

                <View style={styles.sectionDivider}>
                  <Text style={styles.sectionHeader}>Basic Details</Text>
                  <View style={styles.grid2}>
                    <View style={styles.fieldItem}><Text style={styles.fieldLbl}>Full Name</Text><Text style={styles.fieldVal}>{selectedUser.displayName}</Text></View>
                    <View style={styles.fieldItem}><Text style={styles.fieldLbl}>Family Name</Text><Text style={styles.fieldVal}>{selectedUser.familyName || '—'}</Text></View>
                    <View style={styles.fieldItem}><Text style={styles.fieldLbl}>Date of Birth</Text><Text style={styles.fieldVal}>{selectedUser.dob || '—'}</Text></View>
                    <View style={styles.fieldItem}><Text style={styles.fieldLbl}>Gender</Text><Text style={styles.fieldVal}>{selectedUser.gender || '—'}</Text></View>
                    <View style={styles.fieldItem}><Text style={styles.fieldLbl}>Mobile</Text><Text style={styles.fieldVal}>{selectedUser.phone || '—'} {selectedUser.phoneVerified ? '✓ Verified' : ''}</Text></View>
                    <View style={styles.fieldItem}><Text style={styles.fieldLbl}>Email</Text><Text style={styles.fieldVal}>{selectedUser.email || '—'}</Text></View>
                  </View>
                </View>

                <View style={styles.sectionDivider}>
                  <Text style={styles.sectionHeader}>Location & Roots</Text>
                  <View style={styles.grid2}>
                    <View style={styles.fieldItem}><Text style={styles.fieldLbl}>Country</Text><Text style={styles.fieldVal}>{selectedUser.country || 'India'}</Text></View>
                    <View style={styles.fieldItem}><Text style={styles.fieldLbl}>State</Text><Text style={styles.fieldVal}>{selectedUser.state || 'Karnataka'}</Text></View>
                    <View style={styles.fieldItem}><Text style={styles.fieldLbl}>District</Text><Text style={styles.fieldVal}>{selectedUser.district || '—'}</Text></View>
                    <View style={styles.fieldItem}><Text style={styles.fieldLbl}>City / Town</Text><Text style={styles.fieldVal}>{selectedUser.city || '—'}</Text></View>
                    <View style={styles.fieldItem}><Text style={styles.fieldLbl}>Native Place</Text><Text style={styles.fieldVal}>{selectedUser.nativePlace || '—'}</Text></View>
                    <View style={styles.fieldItem}><Text style={styles.fieldLbl}>Current Location</Text><Text style={styles.fieldVal}>{selectedUser.currentLocation || '—'}</Text></View>
                  </View>
                </View>

                <View style={styles.sectionDivider}>
                  <Text style={styles.sectionHeader}>Professional & Education</Text>
                  <View style={styles.grid2}>
                    <View style={styles.fieldItem}><Text style={styles.fieldLbl}>Occupation</Text><Text style={styles.fieldVal}>{selectedUser.occupation || '—'}</Text></View>
                    <View style={styles.fieldItem}><Text style={styles.fieldLbl}>Industry</Text><Text style={styles.fieldVal}>{selectedUser.profession || '—'}</Text></View>
                    <View style={styles.fieldItem}><Text style={styles.fieldLbl}>Company</Text><Text style={styles.fieldVal}>{selectedUser.company || '—'}</Text></View>
                    <View style={styles.fieldItem}><Text style={styles.fieldLbl}>Education</Text><Text style={styles.fieldVal}>{selectedUser.education || '—'}</Text></View>
                  </View>
                  {selectedUser.skills ? (
                    <View style={[styles.fieldItem, { marginTop: 8 }]}>
                      <Text style={styles.fieldLbl}>Skills & Interests</Text>
                      <Text style={styles.fieldVal}>{selectedUser.skills}</Text>
                    </View>
                  ) : null}
                </View>

                {selectedUser.approvalHistory && selectedUser.approvalHistory.length > 0 ? (
                  <View style={styles.sectionDivider}>
                    <Text style={styles.sectionHeader}>Audit History</Text>
                    {selectedUser.approvalHistory.map((h, i) => (
                      <View key={i} style={styles.auditRow}>
                        <Text style={styles.auditStatus}>{h.status}</Text>
                        <Text style={styles.auditDate}>
                          {new Date(h.date).toLocaleDateString()} {new Date(h.date).toLocaleTimeString()}
                        </Text>
                        {h.reason && <Text style={styles.auditReason}>Reason: "{h.reason}"</Text>}
                        {h.adminName && <Text style={styles.auditAdmin}>By: {h.adminName}</Text>}
                      </View>
                    ))}
                  </View>
                ) : null}

                {/* Modal Footer Actions */}
                <View style={styles.modalActionsRow}>
                  <TouchableOpacity style={styles.closeBtn} onPress={() => setShowDetailModal(false)}>
                    <Text style={styles.closeBtnText}>Close</Text>
                  </TouchableOpacity>

                  {(selectedUser.approvalStatus === 'PENDING' || selectedUser.approvalStatus === 'RESUBMITTED') && (
                    <>
                      <TouchableOpacity
                        style={styles.rejectBtn}
                        onPress={() => {
                          handleOpenReject(selectedUser);
                        }}
                      >
                        <Text style={styles.rejectBtnText}>Reject</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.approveBtn}
                        onPress={() => handleApprove(selectedUser)}
                      >
                        <Text style={styles.approveBtnText}>Approve Profile</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Reject Profile Reason Modal ───────────────────────── */}
      <Modal visible={!!rejectingUser} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.rejectModalBox, isMobile && { width: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={styles.rejectIconBadge}>
                <Feather name="alert-triangle" size={20} color="#DC2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Reject Profile</Text>
                <Text style={styles.rejectSub}>
                  Please provide a reason for rejecting {rejectingUser?.displayName}'s profile.
                </Text>
              </View>
            </View>

            <View style={styles.rejectInputBox}>
              <Text style={styles.rejectInputLabel}>Reason for Rejection *</Text>
              <TextInput
                style={styles.rejectInput}
                placeholder="e.g. Profile photo is not clear, please upload a clear portrait photo."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                value={rejectionReason}
                onChangeText={(t) => {
                  setRejectionReason(t);
                  if (rejectError) setRejectError('');
                }}
              />
              {rejectError ? <Text style={styles.errorText}>{rejectError}</Text> : null}
            </View>

            <View style={styles.rejectActionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setRejectingUser(null)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmRejectBtn}
                onPress={handleConfirmReject}
              >
                <Text style={styles.confirmRejectBtnText}>Reject Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20, paddingBottom: 60, gap: 16 },
  headerCard: {
    backgroundColor: '#FFF',
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pageTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3 },
  pageSub: { fontSize: 13, color: '#64748B', marginTop: 4 },
  tabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabBtnActive: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#FFF',
  },
  searchWrap: {
    marginBottom: 4,
  },
  listGrid: {
    gap: 14,
  },
  userCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarImg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E2E8F0',
  },
  cardInfoCol: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  familyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  familyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  metaRow: {
    fontSize: 12,
    color: '#64748B',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 180,
  },
  detailText: {
    fontSize: 12,
    color: '#475569',
  },
  rejectionNoticeBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 10,
  },
  rejectionNoticeTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  rejectionNoticeText: {
    fontSize: 12,
    color: '#991B1B',
    fontStyle: 'italic',
    marginTop: 2,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFF',
  },
  viewBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  rejectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#16A34A',
  },
  approveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  suspendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  suspendBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  detailModalBox: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '90%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseIcon: {
    padding: 4,
  },
  modalBody: {
    marginTop: 14,
  },
  modalAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  modalAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  modalUserName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalFamily: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  sectionDivider: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginBottom: 14,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 10,
    columnGap: 16,
  },
  fieldItem: {
    minWidth: '45%',
  },
  fieldLbl: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  fieldVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 1,
  },
  auditRow: {
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  auditStatus: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  auditDate: {
    fontSize: 11,
    color: '#64748B',
  },
  auditReason: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#DC2626',
    marginTop: 2,
  },
  auditAdmin: {
    fontSize: 11,
    color: '#475569',
  },
  modalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  closeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  rejectModalBox: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  rejectIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rejectSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  rejectInputBox: {
    gap: 6,
  },
  rejectInputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  rejectInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
  },
  rejectActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  confirmRejectBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#DC2626',
  },
  confirmRejectBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
});
