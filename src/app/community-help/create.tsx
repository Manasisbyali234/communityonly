import React, { useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Modal, Platform, Pressable, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { confirmAction } from '../../store/confirmStore';
import {
  HELP_CATEGORIES,
  HelpCategory,
  HelpUrgency,
  ContactPreference,
  useCreateHelpRequestMutation,
} from '../../api/communityHelp';

export default function CreateHelpRequestScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.showToast);

  const [category, setCategory] = useState<HelpCategory | ''>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [urgency, setUrgency] = useState<HelpUrgency>('NORMAL');
  const [contactPreference, setContactPreference] = useState<ContactPreference>('IN_APP');

  // Category Picker Modal
  const [showCatPicker, setShowCatPicker] = useState(false);

  const createMutation = useCreateHelpRequestMutation();

  const validate = () => {
    if (!category) {
      showToast('Please select a help category.', 'error');
      return false;
    }
    if (!title.trim()) {
      showToast('Please enter a request title.', 'error');
      return false;
    }
    if (!description.trim()) {
      showToast('Please describe the assistance needed.', 'error');
      return false;
    }
    if (!location.trim()) {
      showToast('Please provide a location (e.g. Bangalore).', 'error');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const confirmed = await confirmAction({
      title: 'Submit Help Request?',
      message: 'Your request will be submitted for Admin review. It will become visible in Community Help once approved.',
      confirmText: 'Submit Request',
      cancelText: 'Cancel',
      isDestructive: false,
      icon: 'heart-outline',
    });

    if (!confirmed) return;

    try {
      await createMutation.mutateAsync({
        category: category as HelpCategory,
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        urgency,
        contactPreference,
        userName: user?.displayName || 'Community Member',
        userLocation: location.trim(),
        userPhone: user?.phoneNumber,
      });
      showToast('Help request submitted for admin review.', 'success');
      router.replace('/community-help/my-requests' as any);
    } catch {
      showToast('Failed to submit help request.', 'error');
    }
  };

  const selectedCatConfig = HELP_CATEGORIES.find((c) => c.id === category);

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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Request Help</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>
            Submit your request for community support
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={20}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Admin Approval Notice */}
          <View style={[styles.infoBanner, { backgroundColor: isDark ? 'rgba(45,106,45,0.12)' : '#F4F9F4', borderColor: isDark ? 'rgba(45,106,45,0.3)' : '#C6E6C6' }]}>
            <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
            <Text style={[styles.infoBannerText, { color: isDark ? '#A7D9A7' : '#1A5C1A' }]}>
              All requests are reviewed by community admins before being displayed publicly to prevent spam and verify authenticity.
            </Text>
          </View>

          {/* Category Selector */}
          <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Help Category <Text style={{ color: '#EF4444' }}>*</Text>
            </Text>
            <TouchableOpacity
              style={[styles.pickerBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
              onPress={() => setShowCatPicker(true)}
            >
              {selectedCatConfig ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 16 }}>{selectedCatConfig.emoji}</Text>
                  <Text style={[styles.pickerBtnText, { color: colors.text }]}>{selectedCatConfig.label}</Text>
                </View>
              ) : (
                <Text style={[styles.pickerBtnText, { color: colors.textMuted }]}>
                  Select category (e.g. Blood Donation)...
                </Text>
              )}
              <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Urgency Selector */}
          <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Urgency Level <Text style={{ color: '#EF4444' }}>*</Text>
            </Text>
            <View style={styles.urgencyRow}>
              <TouchableOpacity
                style={[
                  styles.urgencyOption,
                  {
                    backgroundColor: urgency === 'NORMAL' ? (isDark ? 'rgba(45,106,45,0.15)' : '#F4F9F4') : colors.inputBg,
                    borderColor: urgency === 'NORMAL' ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setUrgency('NORMAL')}
              >
                <Ionicons
                  name={urgency === 'NORMAL' ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={urgency === 'NORMAL' ? colors.primary : colors.textMuted}
                />
                <View>
                  <Text style={[styles.urgencyTitle, { color: colors.text }]}>Normal</Text>
                  <Text style={[styles.urgencySub, { color: colors.textMuted }]}>Standard community request</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.urgencyOption,
                  {
                    backgroundColor: urgency === 'URGENT' ? (isDark ? 'rgba(220,38,38,0.15)' : '#FEF2F2') : colors.inputBg,
                    borderColor: urgency === 'URGENT' ? '#DC2626' : colors.border,
                  },
                ]}
                onPress={() => setUrgency('URGENT')}
              >
                <Ionicons
                  name={urgency === 'URGENT' ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={urgency === 'URGENT' ? '#DC2626' : colors.textMuted}
                />
                <View>
                  <Text style={[styles.urgencyTitle, { color: '#DC2626' }]}>🔴 Urgent</Text>
                  <Text style={[styles.urgencySub, { color: colors.textMuted }]}>Requires fast response</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Request Details */}
          <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Request Title <Text style={{ color: '#EF4444' }}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border }]}
              placeholder="e.g. Urgent O+ Blood required for surgery"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 14 }]}>
              Description & Specifics <Text style={{ color: '#EF4444' }}>*</Text>
            </Text>
            <TextInput
              style={[styles.inputMulti, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border }]}
              placeholder="Describe the situation clearly. For medical/blood requests, mention hospital name, units needed, patient details..."
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 14 }]}>
              Location / Hospital / City <Text style={{ color: '#EF4444' }}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border }]}
              placeholder="e.g. Bangalore (Jayadeva Hospital, Bannerghatta Rd)"
              placeholderTextColor={colors.textMuted}
              value={location}
              onChangeText={setLocation}
            />
          </View>

          {/* Contact Preference */}
          <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Preferred Contact Method
            </Text>
            <View style={styles.prefRow}>
              {[
                { id: 'IN_APP', label: 'In-App Message', icon: 'chatbubble-ellipses-outline' },
                { id: 'WHATSAPP', label: 'WhatsApp', icon: 'logo-whatsapp' },
                { id: 'PHONE', label: 'Direct Phone', icon: 'call-outline' },
              ].map((p) => {
                const active = contactPreference === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.prefChip,
                      {
                        backgroundColor: active ? colors.primaryContainer : colors.inputBg,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setContactPreference(p.id as ContactPreference)}
                  >
                    <Ionicons name={p.icon as any} size={15} color={active ? colors.primary : colors.textMuted} />
                    <Text style={[styles.prefChipText, { color: active ? colors.primary : colors.text }]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Submit Bar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.cardBg, borderTopColor: colors.border, paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 16 }]}>
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: createMutation.isPending ? colors.textMuted : colors.primary }]}
          onPress={handleSubmit}
          disabled={createMutation.isPending}
          activeOpacity={0.85}
        >
          {createMutation.isPending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="send" size={18} color="#FFF" />
              <Text style={styles.submitBtnText}>Submit Request</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Category Picker Modal */}
      <Modal visible={showCatPicker} transparent animationType="slide" onRequestClose={() => setShowCatPicker(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowCatPicker(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.cardBg }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Select Help Category</Text>
            <View style={{ gap: 8, marginVertical: 10 }}>
              {HELP_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.catOption,
                    {
                      backgroundColor: category === cat.id ? (isDark ? 'rgba(45,106,45,0.2)' : '#F4F9F4') : colors.inputBg,
                      borderColor: category === cat.id ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => {
                    setCategory(cat.id);
                    setShowCatPicker(false);
                  }}
                >
                  <Text style={{ fontSize: 20 }}>{cat.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.catOptionLabel, { color: colors.text }]}>{cat.label}</Text>
                  </View>
                  {category === cat.id && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  headerTitle: { fontSize: 17, fontWeight: '800' },
  headerSub: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  scrollContent: { padding: 16, gap: 14 },

  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    padding: 12, borderRadius: 14, borderWidth: 1,
  },
  infoBannerText: { flex: 1, fontSize: 12.5, lineHeight: 17 },

  sectionCard: {
    borderRadius: 16, borderWidth: 1, padding: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  fieldLabel: { fontSize: 13, fontWeight: '700', marginBottom: 8 },

  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1,
  },
  pickerBtnText: { fontSize: 14.5, fontWeight: '500' },

  urgencyRow: { flexDirection: 'row', gap: 10 },
  urgencyOption: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1.5,
  },
  urgencyTitle: { fontSize: 13.5, fontWeight: '700' },
  urgencySub: { fontSize: 11, marginTop: 2 },

  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14.5 },
  inputMulti: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14.5, minHeight: 90 },

  prefRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  prefChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },
  prefChipText: { fontSize: 12.5, fontWeight: '600' },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth,
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
  },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 17, fontWeight: '800', marginBottom: 6 },
  catOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 12, borderWidth: 1,
  },
  catOptionLabel: { fontSize: 14.5, fontWeight: '700' },
});
