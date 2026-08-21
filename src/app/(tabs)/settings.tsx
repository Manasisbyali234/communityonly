import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemeStore } from '../../theme';
import { useAuthStore } from '../../store/authStore';

type RowItem =
  | { type: 'nav'; icon: string; iconBg: string; iconColor: string; label: string; sub?: string; route: string }
  | { type: 'divider' };

export default function SettingsScreen() {
  const { colors: C, typography: T, roundness } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { themeMode } = useThemeStore();
  const user = useAuthStore((s) => s.user);

  const sections: { title: string; rows: RowItem[] }[] = [
    {
      title: 'PRIVACY & NOTIFICATIONS',
      rows: [
        {
          type: 'nav',
          icon: 'lock-closed-outline',
          iconBg: C.primaryContainer,
          iconColor: C.primary,
          label: 'Account & Privacy',
          sub: 'Private account, who can message',
          route: '/(tabs)/settings/privacy',
        },
        {
          type: 'nav',
          icon: 'notifications-outline',
          iconBg: C.primaryContainer,
          iconColor: C.primary,
          label: 'Notifications',
          sub: 'Likes, comments, follows & more',
          route: '/(tabs)/settings/notifications',
        },
      ],
    },
    {
      title: 'SUPPORT & LEGAL',
      rows: [
        {
          type: 'nav',
          icon: 'shield-checkmark-outline',
          iconBg: C.primaryContainer,
          iconColor: C.primary,
          label: 'Privacy Policy',
          route: '/(tabs)/settings/privacy-policy',
        },
        {
          type: 'nav',
          icon: 'document-text-outline',
          iconBg: C.primaryContainer,
          iconColor: C.primary,
          label: 'Terms of Service',
          route: '/(tabs)/settings/terms',
        },
      ],
    },
    {
      title: 'ACCOUNT ACTIONS',
      rows: [
        {
          type: 'nav',
          icon: 'log-out-outline',
          iconBg: C.errorContainer,
          iconColor: C.error,
          label: 'Sign Out',
          route: '/(tabs)/settings/account',
        },
      ],
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: C.background, paddingTop: insets.top }]}>
      {/* Navbar */}
      <View style={[styles.navbar, { borderBottomColor: C.borderSecondary }]}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/profile')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: C.text, fontSize: T.sizes.lg }]}>Settings</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile strip */}
        {user && (
          <TouchableOpacity
            style={[styles.profileStrip, { backgroundColor: C.cardBg, borderColor: C.border, borderRadius: roundness.lg }]}
            onPress={() => router.push('/(tabs)/edit-profile' as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.avatarCircle, { backgroundColor: C.primaryContainer }]}>
              <Ionicons name="person" size={28} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileName, { color: C.text, fontSize: T.sizes.md }]}>{user.displayName}</Text>
              <Text style={[styles.profileSub, { color: C.textMuted, fontSize: T.sizes.xs }]}>@{user.username} · Tap to edit</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
          </TouchableOpacity>
        )}

        {sections.map((section) => (
          <View key={section.title}>
            <Text style={[styles.sectionLabel, { color: C.textMuted, fontSize: T.sizes.xs }]}>{section.title}</Text>
            <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border, borderRadius: roundness.md }]}>
              {section.rows.map((row, i) => {
                if (row.type === 'divider') return <View key={i} style={[styles.divider, { backgroundColor: C.borderSecondary }]} />;
                const isLast = i === section.rows.length - 1;
                return (
                  <TouchableOpacity
                    key={row.route}
                    style={[styles.row, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.borderSecondary }]}
                    onPress={() => router.push(row.route as any)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.iconBox, { backgroundColor: row.iconBg }]}>
                      <Ionicons name={row.icon as any} size={18} color={row.iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowLabel, { color: row.iconColor === C.error ? C.error : C.text, fontSize: T.sizes.md }]}>
                        {row.label}
                      </Text>
                      {row.sub ? (
                        <Text style={[styles.rowSub, { color: C.textMuted, fontSize: T.sizes.xs }]}>{row.sub}</Text>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        <Text style={[styles.version, { color: C.textMuted, fontSize: T.sizes.xs }]}>Version 1.0.0</Text>
      </ScrollView>
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
  scroll: { paddingHorizontal: 16, paddingBottom: 48 },
  profileStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginTop: 16,
    marginBottom: 4,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  avatarCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  profileName: { fontWeight: '700' },
  profileSub: { marginTop: 2 },
  sectionLabel: {
    fontWeight: '700',
    marginTop: 22,
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.8,
  },
  card: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  iconBox: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontWeight: '600' },
  rowSub: { marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth },
  version: { textAlign: 'center', marginTop: 32, fontWeight: '500' },
});
