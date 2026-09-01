import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: 'By accessing or using GowdaCommunity, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the app.',
  },
  {
    title: '2. Eligibility',
    body: 'You must be at least 13 years of age to use this service. By using the app, you represent that you meet this requirement.',
  },
  {
    title: '3. User Conduct',
    body: 'You agree not to post content that is harmful, abusive, defamatory, or violates any applicable law. You are responsible for all content you post and interactions you have on the platform.',
  },
  {
    title: '4. Content Ownership',
    body: 'You retain ownership of content you post. By posting, you grant GowdaCommunity a non-exclusive licence to display and distribute your content within the platform.',
  },
  {
    title: '5. Account Termination',
    body: 'We reserve the right to suspend or terminate accounts that violate these terms. You may delete your account at any time through the app settings.',
  },
  {
    title: '6. Limitation of Liability',
    body: 'GowdaCommunity is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service.',
  },
  {
    title: '7. Changes to Terms',
    body: 'We may update these terms from time to time. Continued use of the app after changes constitutes acceptance of the new terms.',
  },
  {
    title: '8. Contact',
    body: 'For questions about these Terms, contact us at legal@metromindz.com.',
  },
];

export default function TermsScreen() {
  const { colors: C, typography: T, roundness } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: C.background, paddingTop: insets.top }]}>
      <View style={[styles.navbar, { borderBottomColor: C.borderSecondary }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/settings')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: C.text, fontSize: T.sizes.lg }]}>Terms of Service</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroBadge, { backgroundColor: C.primaryContainer, borderRadius: roundness.lg }]}>
          <Ionicons name="document-text" size={32} color={C.primary} />
          <Text style={[styles.heroTitle, { color: C.text, fontSize: T.sizes.xl }]}>Terms of Service</Text>
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
