import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { useAuthStore } from '../../../store/authStore';
import { useToastStore } from '../../../store/toastStore';
import { useConfirmStore } from '../../../store/confirmStore';
import { apiClient } from '../../../api/client';

const DELETE_REASONS = [
  'Privacy concerns',
  'Not finding it useful',
  'Found a match',
  'Too many notifications',
  'Other',
];

export default function AccountScreen() {
  const { colors: C, typography: T, roundness } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.showToast);
  const [deleting, setDeleting] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const confirm = useConfirmStore((s) => s.confirm);

  const doLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const handleLogout = async () => {
    const ok = await confirm({
      title: 'Log out?',
      message: 'You will be signed out of your account.',
      confirmText: 'Log Out',
      cancelText: 'Cancel',
      isDestructive: true,
      icon: 'log-out-outline',
    });
    if (ok) {
      await doLogout();
    }
  };

  const handleDelete = () => setShowReasonModal(true);

  const confirmDelete = async () => {
    const reason = selectedReason === 'Other' ? customReason.trim() : selectedReason;
    if (!reason) {
      showToast('Please select or enter a reason', 'error');
      return;
    }
    const ok = await confirm({
      title: 'Delete account?',
      message: 'All your profile data, posts, and connections will be permanently removed. This action cannot be undone.',
      confirmText: 'Delete Account',
      cancelText: 'Cancel',
      isDestructive: true,
      icon: 'trash-outline',
    });
    if (!ok) return;

    setShowReasonModal(false);
    setDeleting(true);
    try {
      await apiClient.delete('/users/me', { data: { reason } });
      await logout();
      router.replace('/(auth)/login');
    } catch {
      showToast('Failed to delete account. Try again.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background, paddingTop: insets.top }]}>
      <View style={[styles.navbar, { borderBottomColor: C.borderSecondary }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/settings/account')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: C.text, fontSize: T.sizes.lg }]}>Account</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
        {user && (
          <View style={[styles.userCard, { backgroundColor: C.cardBg, borderColor: C.border, borderRadius: roundness.lg }]}>
            <View style={[styles.avatarCircle, { backgroundColor: C.primaryContainer }]}>
              <Ionicons name="person" size={28} color={C.primary} />
            </View>
            <View>
              <Text style={[styles.userName, { color: C.text, fontSize: T.sizes.md }]}>{user.displayName}</Text>
              <Text style={[styles.userEmail, { color: C.textMuted, fontSize: T.sizes.xs }]}>{user.email ?? `@${user.username}`}</Text>
            </View>
          </View>
        )}

        <Text style={[styles.sectionLabel, { color: C.textMuted, fontSize: T.sizes.xs }]}>SESSION</Text>
        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border, borderRadius: roundness.md }]}>
          <TouchableOpacity style={styles.row} onPress={handleLogout} activeOpacity={0.7}>
            <View style={[styles.iconBox, { backgroundColor: C.errorContainer }]}>
              <Ionicons name="log-out-outline" size={18} color={C.error} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: C.error, fontSize: T.sizes.md }]}>Sign Out</Text>
              <Text style={[styles.rowSub, { color: C.textMuted, fontSize: T.sizes.xs }]}>Sign out of your account on this device</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionLabel, { color: C.error, fontSize: T.sizes.xs }]}>DANGER ZONE</Text>
        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.error + '40', borderRadius: roundness.md }]}>
          <TouchableOpacity style={styles.row} onPress={handleDelete} activeOpacity={0.7} disabled={deleting}>
            <View style={[styles.iconBox, { backgroundColor: C.errorContainer }]}>
              {deleting
                ? <ActivityIndicator size="small" color={C.error} />
                : <Ionicons name="trash-outline" size={18} color={C.error} />
              }
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: C.error, fontSize: T.sizes.md }]}>Delete Account</Text>
              <Text style={[styles.rowSub, { color: C.textMuted, fontSize: T.sizes.xs }]}>Permanently remove your account and all data</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={[styles.warningBox, { backgroundColor: C.errorContainer, borderRadius: roundness.md }]}>
          <Ionicons name="warning-outline" size={18} color={C.error} />
          <Text style={[styles.warningText, { color: C.error, fontSize: T.sizes.xs }]}>
            Your account will be deactivated immediately. It will be permanently deleted after 90 days. You cannot create a new account using the same email until then.
          </Text>
        </View>
      </View>

      {/* Deletion Reason Modal */}
      <Modal visible={showReasonModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modalBox, { backgroundColor: C.cardBg, borderRadius: roundness.lg }]}>
            <Text style={[styles.modalTitle, { color: C.text, fontSize: T.sizes.lg }]}>Why are you leaving?</Text>
            <Text style={[styles.modalSub, { color: C.textMuted, fontSize: T.sizes.sm }]}>Please select a reason (required)</Text>

            {DELETE_REASONS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.reasonRow, { borderColor: selectedReason === r ? C.error : C.border }]}
                onPress={() => setSelectedReason(r)}
              >
                <Ionicons
                  name={selectedReason === r ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={selectedReason === r ? C.error : C.textMuted}
                />
                <Text style={[styles.reasonText, { color: C.text, fontSize: T.sizes.sm }]}>{r}</Text>
              </TouchableOpacity>
            ))}

            {selectedReason === 'Other' && (
              <TextInput
                style={[styles.customInput, { borderColor: C.border, color: C.text, backgroundColor: C.background }]}
                placeholder="Tell us more..."
                placeholderTextColor={C.textMuted}
                value={customReason}
                onChangeText={setCustomReason}
                multiline
                numberOfLines={3}
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: C.border }]}
                onPress={() => { setShowReasonModal(false); setSelectedReason(''); setCustomReason(''); }}
              >
                <Text style={[{ color: C.textMuted, fontWeight: '600', fontSize: T.sizes.sm }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteBtn, { backgroundColor: C.error }]}
                onPress={confirmDelete}
              >
                <Text style={[{ color: '#fff', fontWeight: '700', fontSize: T.sizes.sm }]}>Delete Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4 },
  navTitle: { fontWeight: '700' },
  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, marginBottom: 4, borderWidth: StyleSheet.hairlineWidth,
  },
  avatarCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  userName: { fontWeight: '700' },
  userEmail: { marginTop: 2 },
  sectionLabel: { fontWeight: '700', marginTop: 22, marginBottom: 8, marginLeft: 4, letterSpacing: 0.8 },
  card: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, gap: 12 },
  iconBox: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontWeight: '600' },
  rowSub: { marginTop: 2 },
  warningBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, marginTop: 16 },
  warningText: { flex: 1, lineHeight: 18 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalBox: { width: '100%', maxWidth: 420, padding: 24 },
  modalTitle: { fontWeight: '800', marginBottom: 4 },
  modalSub: { marginBottom: 16 },
  reasonRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8,
    borderWidth: 1, marginBottom: 8,
  },
  reasonText: {},
  customInput: {
    borderWidth: 1.5, borderRadius: 8, padding: 10,
    fontSize: 13, minHeight: 70, textAlignVertical: 'top', marginTop: 4, marginBottom: 8,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1.5, alignItems: 'center' },
  deleteBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
});
