import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
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

const PRIVACY_OPTIONS: { value: PrivacyLevel; label: string; icon: string }[] = [
  { value: 'PUBLIC', label: 'Everyone', icon: 'globe-outline' },
  { value: 'FOLLOWERS', label: 'Followers only', icon: 'people-outline' },
  { value: 'PRIVATE', label: 'No one', icon: 'lock-closed-outline' },
];

const DEFAULT: Settings = { isPrivateAccount: false, whoCanMessage: 'PUBLIC', whoCanSeeFollowers: 'PUBLIC' };

export default function PrivacyScreen() {
  const { colors: C, typography: T, roundness } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const showToast = useToastStore((s) => s.showToast);

  const [settings, setSettings] = useState<Settings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient.get('/users/me/settings')
      .then((res) => {
        const d = res.data?.data ?? res.data;
        if (d) setSettings({ ...DEFAULT, ...d });
      })
      .catch(() => showToast('Could not load settings', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const patch = async (updates: Partial<Settings>) => {
    const prev = settings;
    setSettings((s) => ({ ...s, ...updates }));
    setSaving(true);
    try {
      await apiClient.put('/users/me/settings', updates);
    } catch {
      setSettings(prev);
      showToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const pickPrivacy = (
    title: string,
    current: PrivacyLevel,
    onChange: (v: PrivacyLevel) => void
  ) => {
    Alert.alert(
      title,
      undefined,
      PRIVACY_OPTIONS.map((o) => ({
        text: o.label + (o.value === current ? '  ✓' : ''),
        onPress: () => onChange(o.value),
      })).concat([{ text: 'Cancel', onPress: () => {} }])
    );
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
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/settings')} style={styles.backBtn}>
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
            onPress={() => pickPrivacy('Who Can Message Me', settings.whoCanMessage, (v) => patch({ whoCanMessage: v }))}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { backgroundColor: C.primaryContainer }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: C.text, fontSize: T.sizes.md }]}>Who Can Message Me</Text>
              <Text style={[styles.rowSub, { color: C.textMuted, fontSize: T.sizes.xs }]}>{labelFor(settings.whoCanMessage)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.row}
            onPress={() => pickPrivacy('Who Can See Followers', settings.whoCanSeeFollowers, (v) => patch({ whoCanSeeFollowers: v }))}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { backgroundColor: C.primaryContainer }]}>
              <Ionicons name="people-outline" size={18} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: C.text, fontSize: T.sizes.md }]}>Who Can See Followers</Text>
              <Text style={[styles.rowSub, { color: C.textMuted, fontSize: T.sizes.xs }]}>{labelFor(settings.whoCanSeeFollowers)}</Text>
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
});
