import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';

const SECTIONS = [
  {
    title: '1. Information We Collect',
    body: 'We collect information you provide directly to us, such as your name, email address, profile photo, village, occupation, and other profile details. We also collect information about your use of the app, including posts, comments, connections, and community activity.',
  },
  {
    title: '2. How We Use Your Information',
    body: 'We use the information we collect to provide, maintain, and improve our services; to personalise your experience; to send you notifications about activity relevant to you; and to connect you with other community members.',
  },
  {
    title: '3. Information Sharing',
    body: 'We do not sell your personal information. Your profile information is visible to other members according to your privacy settings. We may share information with service providers who assist us in operating the platform.',
  },
  {
    title: '4. Data Security',
    body: 'We implement industry-standard security measures to protect your personal information. Passwords are hashed and access tokens are stored securely. However, no method of transmission over the internet is 100% secure.',
  },
  {
    title: '5. Your Rights',
    body: 'You may update or delete your account information at any time through the app settings. You may also request deletion of your account, which will permanently remove your data from our systems.',
  },
  {
    title: '6. Contact Us',
    body: 'If you have questions about this Privacy Policy, please contact us at privacy@metromindz.com.',
  },
];

export default function PrivacyPolicyScreen() {
  const { colors: C, typography: T, roundness } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: C.background, paddingTop: insets.top }]}>
      <View style={[styles.navbar, { borderBottomColor: C.borderSecondary }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/settings')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: C.text, fontSize: T.sizes.lg }]}>Privacy Policy</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroBadge, { backgroundColor: C.primaryContainer, borderRadius: roundness.lg }]}>
          <Ionicons name="shield-checkmark" size={32} color={C.primary} />
          <Text style={[styles.heroTitle, { color: C.text, fontSize: T.sizes.xl }]}>Privacy Policy</Text>
          <Text style={[styles.heroSub, { color: C.textMuted, fontSize: T.sizes.xs }]}>Last updated: July 2025</Text>
        </View>

        {SECTIONS.map((s) => (
          <View key={s.title} style={[styles.section, { backgroundColor: C.cardBg, borderColor: C.border, borderRadius: roundness.md }]}>
            <Text style={[styles.sectionTitle, { color: C.text, fontSize: T.sizes.md }]}>{s.title}</Text>
            <Text style={[styles.sectionBody, { color: C.textSecondary, fontSize: T.sizes.sm }]}>{s.body}</Text>
          </View>
        ))}
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
  heroBadge: { alignItems: 'center', padding: 24, marginTop: 20, marginBottom: 8, gap: 8 },
  heroTitle: { fontWeight: '800' },
  heroSub: {},
  section: { padding: 16, marginTop: 12, borderWidth: StyleSheet.hairlineWidth },
  sectionTitle: { fontWeight: '700', marginBottom: 8 },
  sectionBody: { lineHeight: 22 },
});
