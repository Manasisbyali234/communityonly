import React from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemeStore } from '../../../theme';

type Mode = 'light' | 'dark';

const MODES: { value: Mode; icon: string; label: string; sub: string }[] = [
  { value: 'light', icon: 'sunny-outline', label: 'Light Mode', sub: 'Always use light theme' },
  { value: 'dark', icon: 'moon-outline', label: 'Dark Mode', sub: 'Always use dark theme' },
];

export default function AppearanceScreen() {
  const { colors: C, typography: T, roundness } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { themeMode, setThemeMode } = useThemeStore();
  const select = (mode: Mode) => {
    setThemeMode(mode);
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background, paddingTop: insets.top }]}>
      <View style={[styles.navbar, { borderBottomColor: C.borderSecondary }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/settings')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: C.text, fontSize: T.sizes.lg }]}>Appearance</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontSize: T.sizes.xs }]}>THEME</Text>
        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border, borderRadius: roundness.md }]}>
          {MODES.map((m, i) => {
            const active = themeMode === m.value;
            const isLast = i === MODES.length - 1;
            return (
              <TouchableOpacity
                key={m.value}
                style={[
                  styles.row,
                  !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.borderSecondary },
                ]}
                onPress={() => select(m.value)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconBox, { backgroundColor: active ? C.primary : C.primaryContainer }]}>
                  <Ionicons name={m.icon as any} size={18} color={active ? '#fff' : C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowLabel, { color: C.text, fontSize: T.sizes.md }]}>{m.label}</Text>
                  <Text style={[styles.rowSub, { color: C.textMuted, fontSize: T.sizes.xs }]}>{m.sub}</Text>
                </View>
                <View style={[styles.radio, { borderColor: active ? C.primary : C.border }]}>
                  {active && <View style={[styles.radioDot, { backgroundColor: C.primary }]} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Live preview strip */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontSize: T.sizes.xs, marginTop: 24 }]}>PREVIEW</Text>
        <View style={[styles.preview, { backgroundColor: C.cardBg, borderColor: C.border, borderRadius: roundness.md }]}>
          <View style={[styles.previewHeader, { backgroundColor: C.primary }]}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: T.sizes.sm }}>Community</Text>
          </View>
          <View style={{ padding: 14, gap: 8 }}>
            <View style={[styles.previewLine, { backgroundColor: C.border, width: '70%' }]} />
            <View style={[styles.previewLine, { backgroundColor: C.border, width: '50%' }]} />
            <View style={[styles.previewLine, { backgroundColor: C.border, width: '85%' }]} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  sectionLabel: { fontWeight: '700', marginBottom: 8, marginLeft: 4, letterSpacing: 0.8 },
  card: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, gap: 12 },
  iconBox: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontWeight: '600' },
  rowSub: { marginTop: 2 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  preview: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  previewHeader: { height: 36, justifyContent: 'center', paddingHorizontal: 14 },
  previewLine: { height: 10, borderRadius: 5 },
});
