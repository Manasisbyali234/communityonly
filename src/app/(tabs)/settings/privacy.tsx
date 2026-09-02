import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { useToastStore } from '../../../store/toastStore';
import { apiClient } from '../../../api/client';

type PrivacyLevel = 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE';

interface Settings {
  isPrivateAccount: boolean;
  whoCanMessage: PrivacyLevel;
  whoCanSeeFollowers: PrivacyLevel;
}

interface PrivacyOption {
  value: PrivacyLevel;
  label: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const PRIVACY_OPTIONS: PrivacyOption[] = [
  {
    value: 'PUBLIC',
    label: 'Everyone',
    sub: 'Anyone in the community',
    icon: 'globe-outline',
  },
  {
    value: 'FOLLOWERS',
    label: 'Followers only',
    sub: 'Only members who follow you',
    icon: 'people-outline',
  },
  {
    value: 'PRIVATE',
    label: 'No one',
    sub: 'Completely restricted',
    icon: 'lock-closed-outline',
  },
];

const DEFAULT: Settings = { isPrivateAccount: false, whoCanMessage: 'PUBLIC', whoCanSeeFollowers: 'PUBLIC' };

export default function PrivacyScreen() {
  const { colors: C, typography: T, roundness, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const showToast = useToastStore((s) => s.showToast);

  const [settings, setSettings] = useState<Settings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Active modal picker state
  const [activePicker, setActivePicker] = useState<{
    key: 'whoCanMessage' | 'whoCanSeeFollowers';
    title: string;
    description: string;
  } | null>(null);

  useEffect(() => {
    apiClient.get('/users/me/settings')
      .then((res) => {
        const d = res.data?.data ?? res.data;
        if (d) setSettings({ ...DEFAULT, ...d });
      })
      .catch(() => showToast('Could not load settings', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const patch = async (partial: Partial<Settings>) => {
    const prev = settings;
    const updates = { ...settings, ...partial };
    setSettings(updates);
    setSaving(true);
    try {
      await apiClient.put('/users/me/settings', updates);
      showToast('Settings saved', 'success');
    } catch {
      setSettings(prev);
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const labelFor = (v: PrivacyLevel) => PRIVACY_OPTIONS.find((o) => o.value === v)?.label ?? v;

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: C.background }]}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.background, paddingTop: insets.top }]}>
      <View style={[styles.navbar, { borderBottomColor: C.borderSecondary }]}>
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/settings')}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: C.text, fontSize: T.sizes.lg }]}>Account & Privacy</Text>
        <View style={{ width: 30 }}>
          {saving && <ActivityIndicator size="small" color={C.primary} />}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontSize: T.sizes.xs }]}>ACCOUNT</Text>
        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border, borderRadius: roundness.md }]}>
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: C.primaryContainer }]}>
              <Ionicons name="lock-closed-outline" size={18} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: C.text, fontSize: T.sizes.md }]}>Private Account</Text>
              <Text style={[styles.rowSub, { color: C.textMuted, fontSize: T.sizes.xs }]}>
                Only approved followers can see your posts
              </Text>
            </View>
            <Switch
              value={settings.isPrivateAccount}
              onValueChange={(v) => patch({ isPrivateAccount: v })}
              trackColor={{ false: C.border, true: C.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: C.textMuted, fontSize: T.sizes.xs }]}>INTERACTIONS</Text>
        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border, borderRadius: roundness.md }]}>
          <TouchableOpacity
            style={[styles.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.borderSecondary }]}
            onPress={() =>
              setActivePicker({
                key: 'whoCanMessage',
                title: 'Who Can Message Me',
                description: 'Choose who can start direct chats and send messages to you.',
              })
            }
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { backgroundColor: C.primaryContainer }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: C.text, fontSize: T.sizes.md }]}>Who Can Message Me</Text>
              <Text style={[styles.rowSub, { color: C.textMuted, fontSize: T.sizes.xs }]}>
                {labelFor(settings.whoCanMessage)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.row}
            onPress={() =>
              setActivePicker({
                key: 'whoCanSeeFollowers',
                title: 'Who Can See Followers',
                description: 'Control who is allowed to view your followers and following list.',
              })
            }
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { backgroundColor: C.primaryContainer }]}>
              <Ionicons name="people-outline" size={18} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: C.text, fontSize: T.sizes.md }]}>Who Can See Followers</Text>
              <Text style={[styles.rowSub, { color: C.textMuted, fontSize: T.sizes.xs }]}>
                {labelFor(settings.whoCanSeeFollowers)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={[styles.infoBox, { backgroundColor: C.primaryContainer, borderRadius: roundness.md }]}>
          <Ionicons name="information-circle-outline" size={18} color={C.primary} />
          <Text style={[styles.infoText, { color: C.primary, fontSize: T.sizes.xs }]}>
            Changes are saved automatically and take effect immediately.
          </Text>
        </View>
      </ScrollView>

      {/* ── Privacy Option Selector Modal ── */}
      <Modal
        visible={!!activePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setActivePicker(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setActivePicker(null)}>
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: C.cardBg,
                borderColor: C.border,
                borderRadius: roundness.lg,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: C.text, fontSize: T.sizes.lg }]}>
                  {activePicker?.title}
                </Text>
                <Text style={[styles.modalSubtitle, { color: C.textMuted, fontSize: T.sizes.xs }]}>
                  {activePicker?.description}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setActivePicker(null)}
                style={[
                  styles.modalCloseBtn,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : C.surfaceVariant },
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color={C.text} />
              </TouchableOpacity>
            </View>

            {/* Options List */}
            <View style={styles.optionsList}>
              {PRIVACY_OPTIONS.map((opt) => {
                const currentVal = activePicker ? settings[activePicker.key] : null;
                const isSelected = currentVal === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: isSelected
                          ? (isDark ? 'rgba(46, 125, 50, 0.22)' : '#E8F5E9')
                          : (isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC'),
                        borderColor: isSelected ? C.primary : C.border,
                        borderRadius: roundness.md,
                      },
                    ]}
                    onPress={() => {
                      if (activePicker) {
                        patch({ [activePicker.key]: opt.value } as Partial<Settings>);
                        setActivePicker(null);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.optionIconWrap,
                        {
                          backgroundColor: isSelected
                            ? C.primary
                            : (isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'),
                        },
                      ]}
                    >
                      <Ionicons
                        name={opt.icon}
                        size={18}
                        color={isSelected ? '#fff' : C.text}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.optionLabel,
                          {
                            color: isSelected ? C.primary : C.text,
                            fontWeight: isSelected ? '700' : '600',
                          },
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <Text style={[styles.optionSub, { color: C.textMuted }]}>
                        {opt.sub}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.radioCircle,
                        { borderColor: isSelected ? C.primary : C.border },
                      ]}
                    >
                      {isSelected && (
                        <View style={[styles.radioDot, { backgroundColor: C.primary }]} />
                      )}
                    </View>
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
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4 },
  navTitle: { fontWeight: '700' },
  scroll: { paddingHorizontal: 16, paddingBottom: 48 },
  sectionLabel: { fontWeight: '700', marginTop: 22, marginBottom: 8, marginLeft: 4, letterSpacing: 0.8 },
  card: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, gap: 12 },
  iconBox: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontWeight: '600' },
  rowSub: { marginTop: 2 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, marginTop: 20 },
  infoText: { flex: 1, lineHeight: 18 },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  modalTitle: {
    fontWeight: '700',
  },
  modalSubtitle: {
    marginTop: 4,
    lineHeight: 16,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsList: {
    gap: 10,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1.5,
    gap: 12,
  },
  optionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    fontSize: 15,
  },
  optionSub: {
    fontSize: 12,
    marginTop: 2,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
