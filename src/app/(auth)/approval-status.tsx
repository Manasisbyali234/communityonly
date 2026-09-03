import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useTheme } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { useConfirmStore } from '../../store/confirmStore';
import { useUserApprovalStore, resolveUserApproval } from '../../store/userApprovalStore';
import { apiClient } from '../../api/client';

export default function ApprovalStatusScreen() {
  const { colors: C, spacing, typography: T, roundness, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const showToast = useToastStore((s) => s.showToast);
  const confirm = useConfirmStore((s) => s.confirm);
  const getUserById = useUserApprovalStore((s) => s.getUserById);

  const [checking, setChecking] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  // Sync user state from approval store
  const { isApproved, status: currentStatus, managedUser } = resolveUserApproval(user);
  const profileUser = managedUser || user;
  const rejectionReason = managedUser?.rejectionReason || user?.rejectionReason;
  const auditHistory = managedUser?.approvalHistory || user?.approvalHistory || [];

  // If approved, automatically transition into full app unless opened from settings
  useEffect(() => {
    if (isApproved && from !== 'settings') {
      showToast('Welcome to Gowda Sangama! Your profile has been approved.', 'success');
      router.replace('/(tabs)/edit-profile?from=approval-status');
    }
  }, [isApproved, from]);

  const handleRefreshStatus = async () => {
    setChecking(true);
    let latestUser = user;
    try {
      const res = await apiClient.get('/users/me');
      latestUser = res.data?.data ?? res.data;
      if (latestUser) {
        useAuthStore.getState().updateProfile(latestUser);
      }
    } catch {}
    setChecking(false);

    const fresh = resolveUserApproval(latestUser);
    if (fresh.isApproved) {
      showToast('Your profile has been approved! Redirecting...', 'success');
      router.replace('/(tabs)/edit-profile?from=approval-status');
      return;
    }
    showToast('Status up to date: ' + fresh.status, 'info');
  };

  const handleLogout = async () => {
    const ok = await confirm({
      title: 'Log out?',
      message: 'You can sign back in at any time to check your approval status.',
      confirmText: 'Log Out',
      cancelText: 'Cancel',
      isDestructive: true,
      icon: 'log-out-outline',
    });
    if (ok) {
      await logout();
      router.replace('/(auth)/login');
    }
  };

  const getStatusBadge = () => {
    switch (currentStatus) {
      case 'APPROVED':
        return {
          icon: 'checkmark-circle' as const,
          label: '🟢 Approved',
          bg: isDark ? 'rgba(34, 197, 94, 0.15)' : '#DCFCE7',
          color: '#16A34A',
          title: 'Profile Approved',
          desc: 'Your profile has been verified and approved by the community administrator. Welcome!',
        };
      case 'REJECTED':
        return {
          icon: 'close-circle' as const,
          label: '🔴 Rejected',
          bg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
          color: '#DC2626',
          title: 'Profile Requires Changes',
          desc: 'The community administrator reviewed your profile and requested corrections before approval.',
        };
      case 'RESUBMITTED':
        return {
          icon: 'sync-circle' as const,
          label: '🔵 Resubmitted - In Review',
          bg: isDark ? 'rgba(59, 130, 246, 0.15)' : '#DBEAFE',
          color: '#2563EB',
          title: 'Profile Resubmitted for Approval',
          desc: 'Your updated profile has been resubmitted to the community administrator for verification.',
        };
      case 'SUSPENDED':
        return {
          icon: 'ban' as const,
          label: '⚫ Account Suspended',
          bg: isDark ? 'rgba(100, 116, 139, 0.2)' : '#F1F5F9',
          color: '#475569',
          title: 'Access Suspended',
          desc: 'Your community access has been temporarily suspended by an administrator.',
        };
      case 'PENDING':
      default:
        return {
          icon: 'time' as const,
          label: '🟠 Pending Admin Approval',
          bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
          color: '#D97706',
          title: 'Profile Submitted for Approval',
          desc: 'Your profile has been submitted to the community administrator for verification. You will be notified once your profile is approved.',
        };
    }
  };

  const badgeInfo = getStatusBadge();

  return (
    <View style={[styles.container, { backgroundColor: C.background, paddingTop: insets.top }]}>
      {/* ── Top Header ────────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: C.borderSecondary }]}>
        {from === 'settings' && (
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)/settings')}
            style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : C.surfaceVariant }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={20} color={C.text} />
          </TouchableOpacity>
        )}
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: C.text }]}>Approval Status</Text>
        </View>
        <TouchableOpacity
          onPress={handleLogout}
          style={[styles.headerLogoutBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : C.surfaceVariant }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="log-out-outline" size={18} color={C.error} />
          <Text style={[styles.headerLogoutText, { color: C.error }]}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Status Card ─────────────────────────────────────── */}
        <View style={[styles.statusCard, { backgroundColor: C.cardBg, borderColor: C.border }]}>
          {/* Avatar & Verification Indicator */}
          <View style={styles.avatarWrapper}>
            {user?.avatarUrl ? (
              <ExpoImage source={{ uri: user.avatarUrl }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: C.primaryContainer }]}>
                <Ionicons name="person" size={44} color={C.primary} />
              </View>
            )}
            <View style={[styles.avatarBadge, { backgroundColor: badgeInfo.bg, borderColor: C.cardBg }]}>
              <Ionicons name={badgeInfo.icon} size={18} color={badgeInfo.color} />
            </View>
          </View>

          <Text style={[styles.userName, { color: C.text }]}>{user?.displayName || 'Community Member'}</Text>
          {profileUser?.familyName ? (
            <Text style={[styles.userFamily, { color: C.textMuted }]}>
              Family: {profileUser.familyName} • {profileUser.district || 'Karnataka'}
            </Text>
          ) : (
            <Text style={[styles.userFamily, { color: C.textMuted }]}>@{user?.username}</Text>
          )}

          {/* Status Pill */}
          <View style={[styles.statusPill, { backgroundColor: badgeInfo.bg, borderColor: badgeInfo.color + '40' }]}>
            <Text style={[styles.statusPillText, { color: badgeInfo.color }]}>{badgeInfo.label}</Text>
          </View>

          <Text style={[styles.statusHeading, { color: C.text }]}>{badgeInfo.title}</Text>
          <Text style={[styles.statusDesc, { color: C.textMuted }]}>{badgeInfo.desc}</Text>
        </View>

        {/* ── Rejection Feedback Card (If Rejected) ───────────── */}
        {currentStatus === 'REJECTED' && (
          <View style={[styles.rejectionCard, { backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2', borderColor: '#FCA5A5' }]}>
            <View style={styles.rejectionHeader}>
              <Ionicons name="alert-circle" size={20} color="#DC2626" />
              <Text style={styles.rejectionTitle}>Administrator Feedback</Text>
            </View>
            <Text style={[styles.rejectionBody, { color: C.text }]}>
              "{rejectionReason || 'Please review your profile details and ensure accurate community affiliation.'}"
            </Text>
            <TouchableOpacity
              style={[styles.resubmitBtn, { backgroundColor: C.primary }]}
              onPress={() => router.push({ pathname: '/(tabs)/edit-profile', params: { from: 'approval-status' } } as any)}
            >
              <Ionicons name="create-outline" size={18} color="#FFF" />
              <Text style={styles.resubmitBtnText}>Edit Details & Resubmit</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Submitted Profile Summary ────────────────────────── */}
        <View style={[styles.detailsCard, { backgroundColor: C.cardBg, borderColor: C.border }]}>
          <Text style={[styles.detailsSectionTitle, { color: C.text }]}>Submitted Application Details</Text>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: C.textMuted }]}>Full Name</Text>
            <Text style={[styles.detailValue, { color: C.text }]}>{user?.displayName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: C.textMuted }]}>Family Name / Okka</Text>
            <Text style={[styles.detailValue, { color: C.text }]}>{profileUser?.familyName || 'Not specified'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: C.textMuted }]}>Mobile</Text>
            <Text style={[styles.detailValue, { color: C.text }]}>{user?.phone || 'Verified'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: C.textMuted }]}>Email</Text>
            <Text style={[styles.detailValue, { color: C.text }]}>{user?.email}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: C.textMuted }]}>District & City</Text>
            <Text style={[styles.detailValue, { color: C.text }]}>
              {profileUser?.city ? `${profileUser.city}, ${profileUser.district || ''}` : profileUser?.district || 'Karnataka'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: C.textMuted }]}>DOB / Gender</Text>
            <Text style={[styles.detailValue, { color: C.text }]}>
              {[profileUser?.dob, profileUser?.gender].filter(Boolean).join(' / ') || 'Not specified'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: C.textMuted }]}>Native Place</Text>
            <Text style={[styles.detailValue, { color: C.text }]}>{profileUser?.nativePlace || 'Not specified'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: C.textMuted }]}>Current Location</Text>
            <Text style={[styles.detailValue, { color: C.text }]}>{profileUser?.currentLocation || 'Not specified'}</Text>
          </View>
          {profileUser?.occupation && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: C.textMuted }]}>Occupation</Text>
              <Text style={[styles.detailValue, { color: C.text }]}>{profileUser.occupation}</Text>
            </View>
          )}
          {profileUser?.profession && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: C.textMuted }]}>Profession</Text>
              <Text style={[styles.detailValue, { color: C.text }]}>{profileUser.profession}</Text>
            </View>
          )}
          {profileUser?.company && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: C.textMuted }]}>Company</Text>
              <Text style={[styles.detailValue, { color: C.text }]}>{profileUser.company}</Text>
            </View>
          )}
          {profileUser?.education && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: C.textMuted }]}>Education</Text>
              <Text style={[styles.detailValue, { color: C.text }]}>{profileUser.education}</Text>
            </View>
          )}
          {profileUser?.skills && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: C.textMuted }]}>Skills</Text>
              <Text style={[styles.detailValue, { color: C.text }]}>{profileUser.skills}</Text>
            </View>
          )}
        </View>

        {/* ── Audit History (If available) ────────────────────── */}
        {auditHistory.length > 0 && (
          <View style={[styles.historyCard, { backgroundColor: C.cardBg, borderColor: C.border }]}>
            <Text style={[styles.detailsSectionTitle, { color: C.text }]}>Approval Timeline</Text>
            {auditHistory.map((item, idx) => (
              <View key={idx} style={styles.historyItem}>
                <View style={[styles.historyDot, { backgroundColor: item.status === 'APPROVED' ? '#16A34A' : item.status === 'REJECTED' ? '#DC2626' : '#D97706' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.historyStatus, { color: C.text }]}>{item.status}</Text>
                  <Text style={[styles.historyDate, { color: C.textMuted }]}>
                    {new Date(item.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  {item.reason && <Text style={[styles.historyReason, { color: C.textSecondary }]}>Note: {item.reason}</Text>}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Quick Action Buttons (Per Requirement 8) ────────── */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: C.primary }]}
            onPress={handleRefreshStatus}
            disabled={checking}
          >
            {checking ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="refresh" size={18} color="#FFF" />
                <Text style={styles.primaryActionBtnText}>Check Approval Status</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.outlineActionBtn, { borderColor: C.border, backgroundColor: C.cardBg }]}
              onPress={() => router.push({ pathname: '/(tabs)/edit-profile', params: { from: 'approval-status' } } as any)}
            >
              <Ionicons name="create-outline" size={18} color={C.text} />
              <Text style={[styles.outlineActionBtnText, { color: C.text }]}>Edit Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.outlineActionBtn, { borderColor: C.border, backgroundColor: C.cardBg }]}
              onPress={() => router.push('/(tabs)/profile' as any)}
            >
              <Ionicons name="person-outline" size={18} color={C.text} />
              <Text style={[styles.outlineActionBtnText, { color: C.text }]}>View Profile</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.supportBtn, { borderColor: C.border, backgroundColor: C.cardBg }]}
            onPress={() => setShowSupportModal(true)}
          >
            <Ionicons name="help-circle-outline" size={18} color={C.primary} />
            <Text style={[styles.supportBtnText, { color: C.primary }]}>Need Help / Contact Admin Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Support Modal */}
      <Modal visible={showSupportModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: C.cardBg, borderColor: C.border }]}>
            <View style={styles.modalHeader}>
              <Ionicons name="help-buoy" size={28} color={C.primary} />
              <Text style={[styles.modalTitle, { color: C.text }]}>Community Support</Text>
            </View>
            <Text style={[styles.modalDesc, { color: C.textSecondary }]}>
              If your profile approval is taking longer than 24 hours or you have questions regarding verification, reach out to our community coordinators:
            </Text>

            <View style={[styles.contactBox, { backgroundColor: C.surfaceVariant, borderColor: C.border }]}>
              <View style={styles.contactItem}>
                <Ionicons name="mail-outline" size={18} color={C.primary} />
                <Text style={[styles.contactText, { color: C.text }]}>admin@gowdasangama.org</Text>
              </View>
              <View style={styles.contactItem}>
                <Ionicons name="call-outline" size={18} color={C.primary} />
                <Text style={[styles.contactText, { color: C.text }]}>+91 98450 12345 (9 AM - 6 PM)</Text>
              </View>
            </View>

            <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: C.primary }]} onPress={() => setShowSupportModal(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  headerLogoutText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 48,
    gap: 14,
  },
  statusCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  userFamily: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: 12,
  },
  statusPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  statusPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusHeading: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  statusDesc: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  rejectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  rejectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rejectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  rejectionBody: {
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
  },
  resubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 12,
    marginTop: 4,
  },
  resubmitBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  detailsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  detailsSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 13,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  historyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  historyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  historyStatus: {
    fontSize: 13,
    fontWeight: '700',
  },
  historyDate: {
    fontSize: 11,
    marginTop: 1,
  },
  historyReason: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
  actionsContainer: {
    gap: 10,
    marginTop: 4,
  },
  primaryActionBtn: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryActionBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  outlineActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  outlineActionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  supportBtn: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  supportBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
    gap: 14,
  },
  modalHeader: {
    alignItems: 'center',
    gap: 6,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalDesc: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  contactBox: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contactText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalCloseBtn: {
    width: '100%',
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
