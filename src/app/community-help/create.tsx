import React, { useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Modal, Platform, Pressable, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.showToast);

  const handleBack = () => {
    if (from === 'discover' || from === 'explore') {
      router.replace('/(tabs)/explore?tab=help' as any);
    } else {
      router.replace('/(tabs)/community-help' as any);
    }
  };

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
      message: urgency === 'URGENT'
        ? 'Urgent requests are published immediately so the community can respond without delay.'
        : 'Your request will be submitted for Admin review. It will become visible in Community Help once approved.',
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
      showToast(
        urgency === 'URGENT'
          ? 'Urgent help request published to the community.'
          : 'Help request submitted for admin review.',
        'success'
      );
      handleBack();
    } catch {
      showToast('Failed to submit help request.', 'error');
    }
  };

  const selectedCatConfig = HELP_CATEGORIES.find((c) => c.id === category);

  const G = colors.primary;
  const BG = colors.background;
  const SURF = colors.surface;
  const BORDER = colors.border;
  const TEXT = colors.text;
  const TEXT2 = colors.textSecondary;
  const TEXT3 = colors.textMuted;

  return (
    <View style={[styles.root, { backgroundColor: BG, paddingTop: insets.top }]}>
      {/* ── Header ────────────────────────────────────────────── */}
      <View style={[styles.header, { backgroundColor: SURF, borderBottomColor: BORDER }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.primaryContainer }]}
          onPress={handleBack}
          accessibilityLabel="Go back to community help"
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={19} color={G} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: TEXT }]}>Request Help</Text>
          <Text style={[styles.headerSub, { color: TEXT3 }]}>
            Submit your request for community support
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Verified Admin Notice Banner ──────────────────── */}
          <View
            style={[
              styles.noticeCard,
              {
                backgroundColor: isDark ? 'rgba(45,106,45,0.18)' : '#F0FDF4',
                borderColor: isDark ? 'rgba(74,222,128,0.25)' : '#DCFCE7',
              },
            ]}
          >
            <View style={[styles.noticeIconBg, { backgroundColor: isDark ? 'rgba(74,222,128,0.2)' : '#DCFCE7' }]}>
              <Ionicons name="shield-checkmark" size={18} color={G} />
            </View>
            <Text style={[styles.noticeText, { color: isDark ? '#BBF7D0' : '#166534' }]}>
              All requests are reviewed by community admins before being displayed publicly to prevent spam and verify authenticity.
            </Text>
          </View>

          {/* ── Section: Category & Urgency ───────────────────── */}
          <View style={[styles.section, { backgroundColor: colors.cardBg, borderColor: BORDER }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: TEXT }]}>Request Classification</Text>
              <Text style={[styles.sectionSub, { color: TEXT3 }]}>Choose the relevant category and priority</Text>
            </View>

            {/* Category Field */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: TEXT2 }]}>
                Help Category <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TouchableOpacity
                style={[
                  styles.pickerBtn,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: selectedCatConfig ? G : BORDER,
                  },
                ]}
                onPress={() => setShowCatPicker(true)}
                activeOpacity={0.8}
              >
                {selectedCatConfig ? (
                  <View style={styles.selectedCatRow}>
                    <View style={[styles.catEmojiBadge, { backgroundColor: (selectedCatConfig.color || G) + '18' }]}>
                      <Text style={{ fontSize: 16 }}>{selectedCatConfig.emoji}</Text>
                    </View>
                    <Text style={[styles.pickerBtnText, { color: TEXT, fontWeight: '700' }]}>
                      {selectedCatConfig.label}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.selectedCatRow}>
                    <Ionicons name="grid-outline" size={17} color={TEXT3} />
                    <Text style={[styles.pickerBtnText, { color: TEXT3 }]}>
                      Select category (e.g. Blood, Medical, Education)...
                    </Text>
                  </View>
                )}
                <Ionicons name="chevron-down" size={18} color={TEXT3} />
              </TouchableOpacity>
            </View>

            {/* Urgency Field */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: TEXT2 }]}>
                Urgency Level <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={styles.urgencyGrid}>
                {/* Normal */}
                <TouchableOpacity
                  style={[
                    styles.urgencyCard,
                    {
                      backgroundColor: urgency === 'NORMAL'
                        ? (isDark ? 'rgba(45,106,45,0.2)' : '#F0FDF4')
                        : colors.inputBg,
                      borderColor: urgency === 'NORMAL' ? G : BORDER,
                    },
                  ]}
                  onPress={() => setUrgency('NORMAL')}
                  activeOpacity={0.8}
                >
                  <View style={styles.urgencyHeader}>
                    <Ionicons
                      name={urgency === 'NORMAL' ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={urgency === 'NORMAL' ? G : TEXT3}
                    />
                    <Text
                      style={[
                        styles.urgencyTitle,
                        { color: urgency === 'NORMAL' ? G : TEXT },
                      ]}
                    >
                      Normal
                    </Text>
                  </View>
                  <Text style={[styles.urgencyDesc, { color: TEXT3 }]}>
                    Standard community request
                  </Text>
                </TouchableOpacity>

                {/* Urgent */}
                <TouchableOpacity
                  style={[
                    styles.urgencyCard,
                    {
                      backgroundColor: urgency === 'URGENT'
                        ? (isDark ? 'rgba(220,38,38,0.18)' : '#FEF2F2')
                        : colors.inputBg,
                      borderColor: urgency === 'URGENT' ? '#DC2626' : BORDER,
                    },
                  ]}
                  onPress={() => setUrgency('URGENT')}
                  activeOpacity={0.8}
                >
                  <View style={styles.urgencyHeader}>
                    <Ionicons
                      name={urgency === 'URGENT' ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={urgency === 'URGENT' ? '#DC2626' : TEXT3}
                    />
                    <View style={styles.urgentTitleRow}>
                      <View style={styles.redDot} />
                      <Text
                        style={[
                          styles.urgencyTitle,
                          { color: urgency === 'URGENT' ? '#DC2626' : TEXT },
                        ]}
                      >
                        Urgent
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.urgencyDesc, { color: TEXT3 }]}>
                    Requires fast response
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ── Section: Request Details ──────────────────────── */}
          <View style={[styles.section, { backgroundColor: colors.cardBg, borderColor: BORDER }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: TEXT }]}>Request Details</Text>
              <Text style={[styles.sectionSub, { color: TEXT3 }]}>Provide clear and detailed information</Text>
            </View>

            {/* Title */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: TEXT2 }]}>
                Request Title <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={[styles.inputBox, { backgroundColor: colors.inputBg, borderColor: BORDER }]}>
                <Ionicons name="document-text-outline" size={17} color={TEXT3} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.textInput, { color: TEXT }]}
                  placeholder="e.g. Urgent O+ Blood required for surgery"
                  placeholderTextColor={TEXT3}
                  value={title}
                  onChangeText={setTitle}
                  maxLength={100}
                />
              </View>
            </View>

            {/* Description */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.fieldLabel, { color: TEXT2 }]}>
                  Description & Specifics <Text style={styles.requiredStar}>*</Text>
                </Text>
                <Text style={[styles.charCount, { color: TEXT3 }]}>
                  {description.length}/500
                </Text>
              </View>
              <View style={[styles.multiInputBox, { backgroundColor: colors.inputBg, borderColor: BORDER }]}>
                <TextInput
                  style={[styles.textInputMulti, { color: TEXT }]}
                  placeholder="Describe the situation clearly. For medical/blood requests, mention hospital name, units needed, patient details..."
                  placeholderTextColor={TEXT3}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={500}
                />
              </View>
            </View>

            {/* Location */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: TEXT2 }]}>
                Location / Hospital / City <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={[styles.inputBox, { backgroundColor: colors.inputBg, borderColor: BORDER }]}>
                <Ionicons name="location-outline" size={17} color={TEXT3} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.textInput, { color: TEXT }]}
                  placeholder="e.g. Bangalore (Jayadeva Hospital, Bannerghatta Rd)"
                  placeholderTextColor={TEXT3}
                  value={location}
                  onChangeText={setLocation}
                  maxLength={100}
                />
              </View>
            </View>
          </View>

          {/* ── Section: Contact Preference ───────────────────── */}
          <View style={[styles.section, { backgroundColor: colors.cardBg, borderColor: BORDER }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: TEXT }]}>Preferred Contact Method</Text>
              <Text style={[styles.sectionSub, { color: TEXT3 }]}>How helpers can reach out to you</Text>
            </View>

            <View style={styles.prefGrid}>
              {[
                { id: 'IN_APP', label: 'In-App Chat', icon: 'chatbubble-ellipses', color: '#6366F1' },
                { id: 'WHATSAPP', label: 'WhatsApp', icon: 'logo-whatsapp', color: '#16A34A' },
                { id: 'PHONE', label: 'Direct Call', icon: 'call', color: '#0284C7' },
              ].map((p) => {
                const active = contactPreference === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.prefCard,
                      {
                        backgroundColor: active
                          ? (isDark ? 'rgba(45,106,45,0.2)' : colors.primaryContainer)
                          : colors.inputBg,
                        borderColor: active ? G : BORDER,
                      },
                    ]}
                    onPress={() => setContactPreference(p.id as ContactPreference)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.prefIconBg, { backgroundColor: active ? G : (isDark ? 'rgba(255,255,255,0.06)' : '#E5E7EB') }]}>
                      <Ionicons
                        name={p.icon as any}
                        size={16}
                        color={active ? '#FFF' : TEXT3}
                      />
                    </View>
                    <Text
                      style={[
                        styles.prefCardText,
                        { color: active ? G : TEXT, fontWeight: active ? '700' : '600' },
                      ]}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Submit Action Button ──────────────────────────── */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              {
                backgroundColor: createMutation.isPending ? TEXT3 : G,
              },
            ]}
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
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Category Bottom Sheet Modal ──────────────────────── */}
      <Modal
        visible={showCatPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCatPicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowCatPicker(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.cardBg }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: TEXT }]}>Select Help Category</Text>
            <Text style={[styles.sheetSub, { color: TEXT3 }]}>
              Choose the category that best matches your assistance need
            </Text>

            <View style={styles.catOptionsList}>
              {HELP_CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.catOption,
                      {
                        backgroundColor: isSelected
                          ? (isDark ? 'rgba(45,106,45,0.2)' : '#F0FDF4')
                          : colors.inputBg,
                        borderColor: isSelected ? G : BORDER,
                      },
                    ]}
                    onPress={() => {
                      setCategory(cat.id);
                      setShowCatPicker(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.catOptionEmojiWrap, { backgroundColor: (cat.color || G) + '18' }]}>
                      <Text style={{ fontSize: 20 }}>{cat.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.catOptionLabel, { color: TEXT, fontWeight: isSelected ? '800' : '600' }]}>
                        {cat.label}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={22} color={G} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: { flex: 1 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 2,
  },

  // Scroll Content
  scrollContent: {
    padding: 16,
    gap: 14,
  },

  // Notice Banner
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  noticeIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },

  // Form Section Container
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: { elevation: 1 },
    }),
  },
  sectionHeader: {
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sectionSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },

  // Field Groups
  fieldGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  requiredStar: {
    color: '#EF4444',
    fontWeight: '800',
  },
  charCount: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Category Picker Button
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  selectedCatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  catEmojiBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerBtnText: {
    fontSize: 13.5,
  },

  // Urgency Grid
  urgencyGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  urgencyCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 4,
  },
  urgencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  urgentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  redDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#DC2626',
  },
  urgencyTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  urgencyDesc: {
    fontSize: 11,
    lineHeight: 14,
  },

  // Input Boxes
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 13.5,
    padding: 0,
  },
  multiInputBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    minHeight: 95,
  },
  textInputMulti: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 19,
    padding: 0,
  },

  // Preferred Contact Grid
  prefGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  prefCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  prefIconBg: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefCardText: {
    fontSize: 11.5,
    textAlign: 'center',
  },

  // Submit Button
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
    }),
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 15.5,
    fontWeight: '800',
  },

  // Bottom Sheet Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  sheetSub: {
    fontSize: 12.5,
    marginTop: 2,
    marginBottom: 14,
  },
  catOptionsList: {
    gap: 10,
  },
  catOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  catOptionEmojiWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catOptionLabel: {
    fontSize: 14,
  },
});
