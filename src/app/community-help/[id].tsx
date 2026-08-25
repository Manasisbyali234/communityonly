import React, { useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  ActivityIndicator, Linking, Platform, Modal, Pressable, TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { confirmAction } from '../../store/confirmStore';
import {
  useHelpRequestQuery,
  useOfferHelpMutation,
  useResolveHelpRequestMutation,
  useReportHelpRequestMutation,
  HELP_CATEGORIES,
  HelpReport,
} from '../../api/communityHelp';
import { shareUrl } from '../../utils/shareUtils';

export default function HelpRequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.showToast);

  const { data: request, isLoading } = useHelpRequestQuery(id);
  const offerHelpMutation = useOfferHelpMutation();
  const resolveMutation = useResolveHelpRequestMutation();
  const reportMutation = useReportHelpRequestMutation();

  // Helper offer modal state
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerMsg, setOfferMsg] = useState('');

  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<HelpReport['reason']>('Fake / Suspicious');
  const [reportDetails, setReportDetails] = useState('');

  const catConfig = HELP_CATEGORIES.find((c) => c.id === request?.category);
  const isUrgent = request?.urgency === 'URGENT';
  const isMyRequest = !!user && request?.userId === user.id;
  const hasOfferedHelp = !!user && (request?.helpers.some((h) => h.helperId === user.id) ?? false);

  const handleOfferHelpPrompt = async () => {
    if (!user) {
      router.push('/(auth)/login' as any);
      return;
    }
    setShowOfferModal(true);
  };

  const handleSubmitOffer = async () => {
    if (!request) return;

    const confirmed = await confirmAction({
      title: 'Offer Help?',
      message: 'Your interest will be shared with the person who created this request.',
      confirmText: 'I Can Help',
      cancelText: 'Cancel',
      isDestructive: false,
      icon: 'heart-outline',
    });

    if (!confirmed) return;

    try {
      await offerHelpMutation.mutateAsync({
        requestId: request.id,
        helperName: user?.displayName || 'Community Member',
        helperAvatarUrl: user?.avatarUrl,
        helperPhone: user?.phoneNumber,
        message: offerMsg.trim() || 'I am ready to help with this request.',
      });
      setShowOfferModal(false);
      setOfferMsg('');
      showToast('Thank you! The requester has been notified.', 'success');
    } catch {
      showToast('Failed to submit offer.', 'error');
    }
  };

  const handleResolve = async () => {
    if (!request) return;

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
      await resolveMutation.mutateAsync(request.id);
      showToast('Request marked as resolved.', 'success');
    } catch {
      showToast('Failed to update request.', 'error');
    }
  };

  const handleShare = async () => {
    if (!request) return;
    const link = `https://gowdacommunity.com/community-help/${request.id}`;
    const msg = `❤️ Community Help Request: ${request.title}\n\nCategory: ${request.category}\nLocation: ${request.location}\nUrgency: ${request.urgency === 'URGENT' ? '🔴 Urgent' : 'Normal'}\n\n${request.description}\n\n${link}`;
    await shareUrl(msg, link);
  };

  const handleSubmitReport = async () => {
    if (!request) return;
    try {
      await reportMutation.mutateAsync({
        requestId: request.id,
        reason: reportReason,
        details: reportDetails.trim() || undefined,
      });
      setShowReportModal(false);
      showToast('Report submitted for admin review.', 'success');
    } catch {
      showToast('Failed to submit report.', 'error');
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.navbar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.navBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }]}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.text }]}>Help Request</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!request) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.navbar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.navBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }]}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.text }]}>Help Request</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="heart-dislike-outline" size={54} color={colors.textMuted} />
          <Text style={[styles.notFoundText, { color: colors.textMuted }]}>Request not found.</Text>
        </View>
      </View>
    );
  }

  const formattedDate = new Date(request.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Navbar */}
      <View style={[styles.navbar, { backgroundColor: colors.cardBg, borderBottomColor: colors.border, paddingTop: insets.top > 0 ? insets.top + 6 : 14 }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.navBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }]}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.text }]} numberOfLines={1}>Help Request</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity onPress={handleShare} style={[styles.navBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }]}>
            <Ionicons name="share-social-outline" size={19} color={colors.text} />
          </TouchableOpacity>
          {!isMyRequest && (
            <TouchableOpacity onPress={() => setShowReportModal(true)} style={[styles.navBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }]}>
              <Ionicons name="flag-outline" size={18} color="#DC2626" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Status banner if resolved or pending */}
        {request.status === 'RESOLVED' && (
          <View style={styles.resolvedBanner}>
            <Ionicons name="checkmark-circle" size={18} color="#059669" />
            <Text style={styles.resolvedBannerText}>This request has been marked as Resolved.</Text>
          </View>
        )}
        {request.status === 'PENDING' && (
          <View style={styles.pendingBanner}>
            <Ionicons name="time" size={18} color="#D97706" />
            <Text style={styles.pendingBannerText}>Under Admin Review. Visible once approved.</Text>
          </View>
        )}

        {/* Main Card */}
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          {/* Header Tags */}
          <View style={styles.tagRow}>
            <View style={[styles.catTag, { backgroundColor: (catConfig?.color || colors.primary) + '15' }]}>
              <Text style={styles.catEmoji}>{catConfig?.emoji || '🤝'}</Text>
              <Text style={[styles.catText, { color: catConfig?.color || colors.primary }]}>
                {request.category}
              </Text>
            </View>

            {isUrgent && (
              <View style={styles.urgentBadge}>
                <View style={styles.urgentDot} />
                <Text style={styles.urgentText}>🔴 URGENT</Text>
              </View>
            )}

            <View style={styles.dateTag}>
              <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
              <Text style={[styles.dateText, { color: colors.textMuted }]}>{formattedDate}</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>{request.title}</Text>

          {/* Location */}
          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color="#059669" />
            <Text style={[styles.locationText, { color: colors.text }]}>{request.location}</Text>
          </View>

          {/* Description Section */}
          <View style={styles.divider} />
          <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>Description</Text>
          <Text style={[styles.description, { color: colors.text }]}>{request.description}</Text>
        </View>

        {/* Requester Info Card (Safe Privacy) */}
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>Posted By</Text>
          <View style={styles.requesterRow}>
            {request.requesterAvatarUrl ? (
              <Image source={{ uri: request.requesterAvatarUrl }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.primaryContainer, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 16 }}>
                  {request.requesterName[0]?.toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.requesterName, { color: colors.text }]}>{request.requesterName}</Text>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#059669" />
                  <Text style={styles.verifiedText}>Verified Member</Text>
                </View>
              </View>
              <Text style={[styles.requesterLocation, { color: colors.textMuted }]}>
                {request.requesterLocation}
              </Text>
            </View>
          </View>

          <View style={[styles.privacyNote, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F9FAFB' }]}>
            <Ionicons name="shield-checkmark-outline" size={15} color={colors.primary} />
            <Text style={[styles.privacyNoteText, { color: colors.textMuted }]}>
              Contact details are securely shared with members only after you connect.
            </Text>
          </View>
        </View>

        {/* Helpers / Community Responses */}
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <View style={styles.helperHeaderRow}>
            <Text style={[styles.sectionHeading, { color: colors.textSecondary, marginBottom: 0 }]}>
              Offers to Help ({request.helpers.length})
            </Text>
            {request.helpers.length > 0 && (
              <View style={styles.helperBadge}>
                <Ionicons name="heart" size={12} color="#DC2626" />
                <Text style={styles.helperBadgeText}>{request.helpers.length} Helper{request.helpers.length > 1 ? 's' : ''}</Text>
              </View>
            )}
          </View>

          {request.helpers.length === 0 ? (
            <Text style={[styles.noHelpersText, { color: colors.textMuted }]}>
              No one has offered help yet. Be the first to assist!
            </Text>
          ) : (
            <View style={{ gap: 10, marginTop: 10 }}>
              {request.helpers.map((h) => (
                <View
                  key={h.id}
                  style={[styles.helperItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F9FAFB', borderColor: colors.border }]}
                >
                  <View style={styles.helperItemTop}>
                    {h.helperAvatarUrl ? (
                      <Image source={{ uri: h.helperAvatarUrl }} style={styles.smallAvatar} contentFit="cover" />
                    ) : (
                      <View style={[styles.smallAvatar, { backgroundColor: colors.primaryContainer, justifyContent: 'center', alignItems: 'center' }]}>
                        <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>
                          {h.helperName[0]?.toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.helperName, { color: colors.text }]}>{h.helperName}</Text>
                      <Text style={[styles.helperTime, { color: colors.textMuted }]}>
                        {new Date(h.offeredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </Text>
                    </View>
                  </View>

                  {h.message && (
                    <Text style={[styles.helperMessage, { color: colors.textSecondary }]}>
                      "{h.message}"
                    </Text>
                  )}

                  {/* Requester can call / contact helper */}
                  {isMyRequest && h.helperPhone && (
                    <View style={styles.helperContactActions}>
                      <TouchableOpacity
                        style={[styles.contactBtn, { backgroundColor: '#DCFCE7' }]}
                        onPress={() => Linking.openURL(`tel:${h.helperPhone}`)}
                      >
                        <Ionicons name="call" size={13} color="#166534" />
                        <Text style={[styles.contactBtnText, { color: '#166534' }]}>Call Helper</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.contactBtn, { backgroundColor: '#F0FDF4' }]}
                        onPress={() => {
                          const num = (h.helperPhone || '').replace(/[^0-9]/g, '');
                          Linking.openURL(`https://wa.me/${num}?text=Hi ${h.helperName}, regarding my help request on GowdaCommunity.`);
                        }}
                      >
                        <Ionicons name="logo-whatsapp" size={13} color="#16A34A" />
                        <Text style={[styles.contactBtnText, { color: '#16A34A' }]}>WhatsApp</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.cardBg, borderTopColor: colors.border, paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 16 }]}>
        {isMyRequest ? (
          request.status !== 'RESOLVED' ? (
            <TouchableOpacity
              style={[styles.resolveCTA, { backgroundColor: '#059669' }]}
              onPress={handleResolve}
            >
              <Ionicons name="checkmark-done" size={18} color="#FFF" />
              <Text style={styles.resolveCTAText}>Mark as Resolved</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.resolvedNote}>
              <Ionicons name="checkmark-circle" size={16} color="#059669" />
              <Text style={styles.resolvedNoteText}>This request is closed.</Text>
            </View>
          )
        ) : hasOfferedHelp ? (
          <View style={styles.alreadyOfferedBar}>
            <Ionicons name="checkmark-circle" size={20} color="#059669" />
            <Text style={styles.alreadyOfferedText}>You have offered help for this request</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.offerCTA, { backgroundColor: isUrgent ? '#DC2626' : colors.primary }]}
            onPress={handleOfferHelpPrompt}
            activeOpacity={0.85}
          >
            <Ionicons name="heart" size={19} color="#FFF" />
            <Text style={styles.offerCTAText}>I Can Help</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Offer Help Modal */}
      <Modal visible={showOfferModal} transparent animationType="slide" onRequestClose={() => setShowOfferModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowOfferModal(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.cardBg, paddingBottom: insets.bottom + 16 }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Offer Help ❤️</Text>
            <Text style={[styles.sheetSub, { color: colors.textSecondary }]}>
              Leave a short message for {request.requesterName}. Your contact details will be shared with them.
            </Text>

            <TextInput
              style={[
                styles.sheetInput,
                { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border },
              ]}
              placeholder="e.g. I am available in Bangalore today and have O+ blood..."
              placeholderTextColor={colors.textMuted}
              value={offerMsg}
              onChangeText={setOfferMsg}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.sheetSubmitBtn, { backgroundColor: colors.primary }]}
              onPress={handleSubmitOffer}
              disabled={offerHelpMutation.isPending}
            >
              {offerHelpMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.sheetSubmitBtnText}>Confirm Offer</Text>
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Report Modal */}
      <Modal visible={showReportModal} transparent animationType="fade" onRequestClose={() => setShowReportModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowReportModal(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.cardBg }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Report Request</Text>
            <Text style={[styles.sheetSub, { color: colors.textSecondary }]}>
              Help us maintain a safe community. Why are you reporting this request?
            </Text>

            {(['Fake / Suspicious', 'Incorrect Information', 'Inappropriate Content', 'Other'] as HelpReport['reason'][]).map((r) => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.reportOption,
                  {
                    backgroundColor: reportReason === r ? (isDark ? 'rgba(239,68,68,0.15)' : '#FEF2F2') : 'transparent',
                    borderColor: reportReason === r ? '#DC2626' : colors.border,
                  },
                ]}
                onPress={() => setReportReason(r)}
              >
                <Text style={[styles.reportOptionText, { color: reportReason === r ? '#DC2626' : colors.text }]}>
                  {r}
                </Text>
                {reportReason === r && <Ionicons name="checkmark-circle" size={18} color="#DC2626" />}
              </TouchableOpacity>
            ))}

            <TextInput
              style={[
                styles.sheetInput,
                { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border },
              ]}
              placeholder="Additional details (optional)..."
              placeholderTextColor={colors.textMuted}
              value={reportDetails}
              onChangeText={setReportDetails}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }]}
                onPress={() => setShowReportModal(false)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitReportBtn, { backgroundColor: '#DC2626' }]}
                onPress={handleSubmitReport}
                disabled={reportMutation.isPending}
              >
                <Text style={styles.submitReportBtnText}>Submit Report</Text>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFoundText: { fontSize: 16, fontWeight: '600' },
  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1, fontSize: 16, fontWeight: '700', textAlign: 'center', marginHorizontal: 10 },
  scrollContent: { padding: 16, gap: 14 },

  // Status banners
  resolvedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#DCFCE7', padding: 12, borderRadius: 12,
  },
  resolvedBannerText: { color: '#166534', fontSize: 13, fontWeight: '700' },
  pendingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF3C7', padding: 12, borderRadius: 12,
  },
  pendingBannerText: { color: '#92400E', fontSize: 13, fontWeight: '700' },

  // Card
  card: {
    borderRadius: 18, borderWidth: 1, padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  catTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  catEmoji: { fontSize: 13 },
  catText: { fontSize: 12, fontWeight: '700' },
  urgentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  urgentDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#DC2626' },
  urgentText: { color: '#DC2626', fontSize: 11, fontWeight: '800' },
  dateTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' },
  dateText: { fontSize: 12 },

  title: { fontSize: 19, fontWeight: '800', lineHeight: 26, marginBottom: 10 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  locationText: { fontSize: 14, fontWeight: '600' },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(0,0,0,0.08)', marginVertical: 12 },
  sectionHeading: { fontSize: 12.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  description: { fontSize: 14.5, lineHeight: 22 },

  // Requester
  requesterRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 6 },
  avatar: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
  requesterName: { fontSize: 15, fontWeight: '700' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  verifiedText: { color: '#166534', fontSize: 10.5, fontWeight: '700' },
  requesterLocation: { fontSize: 12.5, marginTop: 2 },
  privacyNote: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, marginTop: 10 },
  privacyNoteText: { fontSize: 12, flex: 1, lineHeight: 16 },

  // Helpers
  helperHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  helperBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  helperBadgeText: { color: '#DC2626', fontSize: 11, fontWeight: '700' },
  noHelpersText: { fontSize: 13.5, fontStyle: 'italic', marginTop: 4 },
  helperItem: { padding: 12, borderRadius: 12, borderWidth: 1, gap: 6 },
  helperItemTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  smallAvatar: { width: 32, height: 32, borderRadius: 16, overflow: 'hidden' },
  helperName: { fontSize: 13.5, fontWeight: '700' },
  helperTime: { fontSize: 11 },
  helperMessage: { fontSize: 13, fontStyle: 'italic', lineHeight: 18 },
  helperContactActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  contactBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  contactBtnText: { fontSize: 12, fontWeight: '700' },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth,
  },
  offerCTA: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
  },
  offerCTAText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  alreadyOfferedBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#DCFCE7', paddingVertical: 14, borderRadius: 14,
  },
  alreadyOfferedText: { color: '#166534', fontSize: 14.5, fontWeight: '700' },
  resolveCTA: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
  },
  resolveCTAText: { color: '#FFF', fontSize: 15.5, fontWeight: '700' },
  resolvedNote: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12,
  },
  resolvedNoteText: { color: '#059669', fontSize: 14, fontWeight: '600' },

  // Sheet
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingTop: 14, gap: 10 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontWeight: '800' },
  sheetSub: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  sheetInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, minHeight: 90 },
  sheetSubmitBtn: { paddingVertical: 13, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  sheetSubmitBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  reportOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 10, borderWidth: 1 },
  reportOptionText: { fontSize: 13.5, fontWeight: '600' },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '700' },
  submitReportBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  submitReportBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
