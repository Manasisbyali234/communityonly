import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemeStore } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useConfirmStore } from '../../store/confirmStore';
import Avatar from '../../components/common/Avatar';

interface SettingsRow {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBgLight: string;
  iconBgDark: string;
  iconColorLight: string;
  iconColorDark: string;
  label: string;
  sub?: string;
  route?: string;
  isDestructive?: boolean;
  badgeText?: string;
  badgeIcon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}

interface SettingsSection {
  title: string;
  rows: SettingsRow[];
}

export default function SettingsScreen() {
  const { colors: C, typography: T, roundness, isDark, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { themeMode } = useThemeStore();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const confirm = useConfirmStore((s) => s.confirm);

  const handleLogout = async () => {
    const ok = await confirm({
      title: 'Log out?',
      message: 'Are you sure you want to sign out of your account on this device?',
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

  const sections: SettingsSection[] = [
    {
      title: 'PREFERENCES',
      rows: [
        {
          id: 'appearance',
          icon: 'color-palette-outline',
          iconBgLight: '#EEF2FF',
          iconBgDark: 'rgba(99, 102, 241, 0.22)',
          iconColorLight: '#4F46E5',
          iconColorDark: '#818CF8',
          label: 'Appearance',
          sub: 'Theme & display mode',
          route: '/(tabs)/settings/appearance',
          badgeText: themeMode === 'dark' ? 'Dark' : 'Light',
          badgeIcon: themeMode === 'dark' ? 'moon' : 'sunny',
        },
        {
          id: 'notifications',
          icon: 'notifications-outline',
          iconBgLight: '#FFF7ED',
          iconBgDark: 'rgba(234, 88, 12, 0.22)',
          iconColorLight: '#EA580C',
          iconColorDark: '#FB923C',
          label: 'Notifications',
          sub: 'Push alerts, likes, comments & updates',
          route: '/(tabs)/settings/notifications',
        },
      ],
    },
    {
      title: 'SECURITY & PRIVACY',
      rows: [
        {
          id: 'account',
          icon: 'person-circle-outline',
          iconBgLight: '#EFF6FF',
          iconBgDark: 'rgba(37, 99, 235, 0.22)',
          iconColorLight: '#2563EB',
          iconColorDark: '#60A5FA',
          label: 'Account Management',
          sub: 'Personal details, security & account data',
          route: '/(tabs)/settings/account',
        },
        {
          id: 'privacy',
          icon: 'lock-closed-outline',
          iconBgLight: '#ECFDF5',
          iconBgDark: 'rgba(5, 150, 105, 0.22)',
          iconColorLight: '#059669',
          iconColorDark: '#34D399',
          label: 'Privacy',
          sub: 'Private account, messaging & visibility',
          route: '/(tabs)/settings/privacy',
        },
      ],
    },
    {
      title: 'SUPPORT & LEGAL',
      rows: [
        {
          id: 'privacy-policy',
          icon: 'shield-checkmark-outline',
          iconBgLight: '#F0FDFA',
          iconBgDark: 'rgba(13, 148, 136, 0.22)',
          iconColorLight: '#0D9488',
          iconColorDark: '#2DD4BF',
          label: 'Privacy Policy',
          sub: 'How we protect and use your data',
          route: '/(tabs)/settings/privacy-policy',
        },
        {
          id: 'terms',
          icon: 'document-text-outline',
          iconBgLight: '#F8FAFC',
          iconBgDark: 'rgba(100, 116, 139, 0.22)',
          iconColorLight: '#64748B',
          iconColorDark: '#94A3B8',
          label: 'Terms of Service',
          sub: 'Community rules & member guidelines',
          route: '/(tabs)/settings/terms',
        },
      ],
    },
    {
      title: 'ACCOUNT ACTIONS',
      rows: [
        {
          id: 'logout',
          icon: 'log-out-outline',
          iconBgLight: '#FEF2F2',
          iconBgDark: 'rgba(220, 38, 38, 0.22)',
          iconColorLight: '#DC2626',
          iconColorDark: '#F87171',
          label: 'Log Out',
          sub: 'Sign out of your account on this device',
          isDestructive: true,
          onPress: handleLogout,
        },
      ],
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: C.background, paddingTop: insets.top }]}>
      {/* Refined Navigation Bar */}
      <View style={[styles.navbar, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : C.borderSecondary }]}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile' as any))}
          style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: C.text }]}>Settings</Text>
        <View style={styles.navPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Hero Card */}
        {user && (
          <TouchableOpacity
            style={[
              styles.profileCard,
              {
                backgroundColor: C.cardBg,
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : C.border,
              },
              shadows.sm,
            ]}
            onPress={() => router.push({ pathname: '/(tabs)/edit-profile', params: { from: 'settings' } } as any)}
            activeOpacity={0.8}
          >
            <View style={styles.profileAvatarWrapper}>
              <Avatar
                url={user.avatarUrl}
                name={user.displayName}
                size={54}
                gradientBorder={true}
              />
            </View>

            <View style={styles.profileInfo}>
              <View style={styles.profileNameRow}>
                <Text style={[styles.profileName, { color: C.text }]} numberOfLines={1}>
                  {user.displayName}
                </Text>
                {user.isVerified && (
                  <Ionicons name="checkmark-circle" size={16} color={C.primary} style={{ marginLeft: 4 }} />
                )}
              </View>
              <Text style={[styles.profileSub, { color: C.textMuted }]} numberOfLines={1}>
                @{user.username}{user.phone ? ` · ${user.phone}` : user.email ? ` · ${user.email}` : ''}
              </Text>
            </View>

            <View style={[styles.editPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : C.surfaceVariant }]}>
              <Ionicons name="pencil-outline" size={13} color={C.primary} />
              <Text style={[styles.editPillText, { color: C.primary }]}>Edit</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Settings Sections */}
        {sections.map((section) => (
          <View key={section.title} style={styles.sectionContainer}>
            <Text style={[styles.sectionLabel, { color: C.textMuted }]}>{section.title}</Text>

            <View
              style={[
                styles.card,
                {
                  backgroundColor: C.cardBg,
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : C.border,
                },
                shadows.sm,
              ]}
            >
              {section.rows.map((row, index) => {
                const isLast = index === section.rows.length - 1;
                const iconBg = isDark ? row.iconBgDark : row.iconBgLight;
                const iconColor = isDark ? row.iconColorDark : row.iconColorLight;
                const textColor = row.isDestructive ? C.error : C.text;

                const handlePress = () => {
                  if (row.onPress) {
                    row.onPress();
                  } else if (row.route) {
                    router.push(row.route as any);
                  }
                };

                return (
                  <React.Fragment key={row.id}>
                    <TouchableOpacity
                      style={styles.row}
                      onPress={handlePress}
                      activeOpacity={0.65}
                    >
                      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
                        <Ionicons name={row.icon} size={19} color={iconColor} />
                      </View>

                      <View style={styles.rowTextContainer}>
                        <Text style={[styles.rowLabel, { color: textColor }]}>
                          {row.label}
                        </Text>
                        {row.sub ? (
                          <Text style={[styles.rowSub, { color: C.textMuted }]} numberOfLines={1}>
                            {row.sub}
                          </Text>
                        ) : null}
                      </View>

                      {row.badgeText && (
                        <View style={[styles.valueBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : C.surfaceVariant }]}>
                          {row.badgeIcon && (
                            <Ionicons
                              name={row.badgeIcon}
                              size={12}
                              color={C.textSecondary}
                              style={{ marginRight: 4 }}
                            />
                          )}
                          <Text style={[styles.valueBadgeText, { color: C.textSecondary }]}>
                            {row.badgeText}
                          </Text>
                        </View>
                      )}

                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={row.isDestructive ? C.error : C.textMuted}
                        style={styles.chevron}
                      />
                    </TouchableOpacity>

                    {!isLast && (
                      <View
                        style={[
                          styles.divider,
                          { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : C.borderSecondary },
                        ]}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          </View>
        ))}

        {/* Polished App Footer */}
        <View style={styles.footer}>
          <View
            style={[
              styles.logoWrapper,
              {
                backgroundColor: '#FFFFFF',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : C.border,
              },
            ]}
          >
            <Image
              source={require('../../../assets/images/logo.png')}
              style={styles.footerLogo}
              contentFit="contain"
            />
          </View>
          <Text style={[styles.footerTitle, { color: C.text }]}>Gowda Sangama</Text>
          <Text style={[styles.taglineText, { color: C.textMuted }]}>Connecting Our People</Text>
          <Text style={[styles.versionText, { color: C.textMuted }]}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navbar: {
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
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  navPlaceholder: {
    width: 36,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 48,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  profileAvatarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  profileSub: {
    fontSize: 12,
    marginTop: 2,
  },
  editPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  editPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionContainer: {
    marginTop: 22,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  rowSub: {
    fontSize: 12,
    marginTop: 2,
  },
  valueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 2,
  },
  valueBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  chevron: {
    marginLeft: 2,
    opacity: 0.7,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 62, // Indented past icon
  },
  footer: {
    alignItems: 'center',
    marginTop: 34,
    gap: 3,
  },
  logoWrapper: {
    width: 62,
    height: 62,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  footerLogo: {
    width: '100%',
    height: '100%',
  },
  footerTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  taglineText: {
    fontSize: 12,
    fontWeight: '500',
  },
  versionText: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.7,
  },
});
