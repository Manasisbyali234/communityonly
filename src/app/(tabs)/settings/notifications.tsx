import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { useToastStore } from '../../../store/toastStore';
import { apiClient } from '../../../api/client';

interface NotifSettings {
  notifyLikes: boolean;
  notifyComments: boolean;
  notifyFollows: boolean;
  notifyMessages: boolean;
  notifyStoryViews: boolean;
  notifyEvents: boolean;
}

const DEFAULT: NotifSettings = {
  notifyLikes: true,
  notifyComments: true,
  notifyFollows: true,
  notifyMessages: true,
  notifyStoryViews: false,
  notifyEvents: true,
};

const ROWS: { key: keyof NotifSettings; icon: string; label: string; sub: string }[] = [
  { key: 'notifyLikes', icon: 'heart-outline', label: 'Likes', sub: 'When someone likes your post' },
  { key: 'notifyComments', icon: 'chatbubble-outline', label: 'Comments', sub: 'When someone comments on your post' },
  { key: 'notifyFollows', icon: 'person-add-outline', label: 'New Followers', sub: 'When someone follows you' },
  { key: 'notifyMessages', icon: 'mail-outline', label: 'Messages', sub: 'When you receive a new message' },
  { key: 'notifyStoryViews', icon: 'eye-outline', label: 'Story Views', sub: 'When someone views your story' },
  { key: 'notifyEvents', icon: 'calendar-outline', label: 'Events', sub: 'Reminders and event updates' },
];

export default function NotificationsScreen() {
  const { colors: C, typography: T, roundness } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const showToast = useToastStore((s) => s.showToast);

  const [settings, setSettings] = useState<NotifSettings>(DEFAULT);
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

  const patch = async (key: keyof NotifSettings, value: boolean) => {
    const prev = settings;
    setSettings((s) => ({ ...s, [key]: value }));
    setSaving(true);
    try {
      await apiClient.put('/users/me/settings', { [key]: value });
    } catch {
      setSettings(prev);
      showToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const allOn = Object.values(settings).every(Boolean);

  const toggleAll = async () => {
    const next = !allOn;
    const updates = Object.fromEntries(ROWS.map((r) => [r.key, next])) as unknown as NotifSettings;
    const prev = settings;
    setSettings(updates);
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
        <Text style={[styles.navTitle, { color: C.text, fontSize: T.sizes.lg }]}>Notifications</Text>
        <View style={{ width: 30 }}>
          {saving && <ActivityIndicator size="small" color={C.primary} />}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Toggle all */}
        <TouchableOpacity
          style={[styles.toggleAllBtn, { backgroundColor: C.primaryContainer, borderRadius: roundness.md }]}
          onPress={toggleAll}
          activeOpacity={0.8}
        >
          <Ionicons name={allOn ? 'notifications-off-outline' : 'notifications-outline'} size={18} color={C.primary} />
          <Text style={[styles.toggleAllText, { color: C.primary, fontSize: T.sizes.sm }]}>
            {allOn ? 'Turn Off All Notifications' : 'Turn On All Notifications'}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.sectionLabel, { color: C.textMuted, fontSize: T.sizes.xs }]}>NOTIFICATION TYPES</Text>
        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border, borderRadius: roundness.md }]}>
          {ROWS.map((row, i) => {
            const isLast = i === ROWS.length - 1;
            return (
              <View
                key={row.key}
                style={[
                  styles.row,
                  !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.borderSecondary },
                ]}
              >
                <View style={[styles.iconBox, { backgroundColor: settings[row.key] ? C.primaryContainer : C.inputBg }]}>
                  <Ionicons name={row.icon as any} size={18} color={settings[row.key] ? C.primary : C.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowLabel, { color: C.text, fontSize: T.sizes.md }]}>{row.label}</Text>
                  <Text style={[styles.rowSub, { color: C.textMuted, fontSize: T.sizes.xs }]}>{row.sub}</Text>
                </View>
                <Switch
                  value={settings[row.key]}
                  onValueChange={(v) => patch(row.key, v)}
                  trackColor={{ false: C.border, true: C.primary }}
                  thumbColor="#fff"
                />
              </View>
            );
          })}
        </View>

        <View style={[styles.infoBox, { backgroundColor: C.primaryContainer, borderRadius: roundness.md }]}>
          <Ionicons name="information-circle-outline" size={18} color={C.primary} />
          <Text style={[styles.infoText, { color: C.primary, fontSize: T.sizes.xs }]}>
            Push notifications also depend on your device's notification permissions.
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
  toggleAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    marginTop: 20,
  },
  toggleAllText: { fontWeight: '700' },
  sectionLabel: { fontWeight: '700', marginTop: 22, marginBottom: 8, marginLeft: 4, letterSpacing: 0.8 },
  card: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, gap: 12 },
  iconBox: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontWeight: '600' },
  rowSub: { marginTop: 2 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, marginTop: 20 },
  infoText: { flex: 1, lineHeight: 18 },
});
