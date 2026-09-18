import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';

const SECTIONS = [
  {
    title: '1. Eligibility',
    body: '• You must be 18 years or older to use the Matrimony service.\n• You must provide accurate and truthful information while creating your profile.\n• You are responsible for keeping your account information secure.\n• One person should not create multiple fraudulent or duplicate profiles.',
  },
  {
    title: '2. Matrimony Profile',
    body: 'You may provide information such as your name; age and date of birth; gender; photograph; education and profession; income; location; religion, caste/community and mother tongue; family details; marital status; lifestyle and personal preferences; partner preferences; and contact or communication details.\n\nYou are responsible for ensuring that the information in your profile is accurate and up to date.',
  },
  {
    title: '3. Accuracy of Information',
    body: 'We do not guarantee that information provided by another user is accurate, complete, or genuine. Independently verify identity, age, education, employment, income, marital status, family information, address, and other information shared by a potential match.\n\nUsers are responsible for making their own decisions before entering into any relationship or marriage.',
  },
  {
    title: '4. Profile Photos',
    body: 'Upload only photographs that belong to you or that you have permission to use. Do not upload offensive or inappropriate images, fake or misleading photographs, images of another person without permission, copyrighted images without authorisation, or images containing illegal or harmful content. We may remove photographs that violate these Terms.',
  },
  {
    title: '5. Matrimonial Matches',
    body: 'The Matrimony service may provide recommendations or matches based on the information and preferences you provide. A match or recommendation does not guarantee compatibility, relationship success, marriage, or the authenticity of another user’s information.',
  },
  {
    title: '6. Communication Between Users',
    body: 'Users may communicate through available chat or messaging features. You must not harass or threaten another person; send abusive, offensive, or unwanted sexual content; request inappropriate photographs; spam; misrepresent your identity; use the platform for commercial solicitation; or ask for money under false circumstances.',
  },
  {
    title: '7. Fraud and Financial Safety',
    body: 'Never send money to another user solely because of an online relationship or matrimonial communication. Be cautious of requests involving money transfers, loans, investments, gifts, emergency financial assistance, bank or card details, OTPs, passwords, or UPI/PIN information. We are not responsible for financial losses resulting from transactions between users.',
  },
  {
    title: '8. Prohibited Activities',
    body: 'Do not use the application for fraud or scams, impersonation, harassment, stalking, threats, hate speech, illegal activities, spam, misleading advertisements, unauthorised commercial activities, or collecting another user’s personal information without permission.',
  },
  {
    title: '9. Reporting and Blocking',
    body: 'You can report or block profiles or content that you believe violates these Terms. We may review reported profiles or content and take appropriate action, including removing content, restricting an account, suspending an account, or permanently terminating an account.',
  },
  {
    title: '10. Account Suspension or Termination',
    body: 'We may suspend or terminate an account if these Terms are violated; false information is provided; the account is involved in fraudulent activity; repeated complaints are received; the account creates a safety or security risk; or it is used for unlawful purposes.',
  },
  {
    title: '11. User Content',
    body: 'You retain ownership of content you upload. By uploading content, you grant GowdaCommunity permission to store, display, process, and use that content as necessary to provide the application’s services.',
  },
  {
    title: '12. Privacy',
    body: 'Your use of the application is also governed by our Privacy Policy, which explains how we collect, use, store, and protect your personal information.',
  },
  {
    title: '13. Third-Party Services',
    body: 'The application may contain links or integrations with third-party services. We are not responsible for the privacy practices, content, or services provided by third parties.',
  },
  {
    title: '14. Disclaimer',
    body: 'GowdaCommunity helps members connect with the community and potential matrimonial matches. We do not guarantee the authenticity of every profile, the accuracy of user-provided information, compatibility between users, successful relationships or marriages, or the conduct of any user. Exercise appropriate caution and independently verify information before making important decisions.',
  },
  {
    title: '15. Changes to Terms',
    body: 'We may update these Terms & Conditions from time to time. Updated terms will be made available through the application. Continued use after changes are published means that you accept the updated Terms.',
  },
  {
    title: '16. Contact Us',
    body: 'For questions, complaints, or concerns regarding these Terms, contact us at legal@metromindz.com.',
  },
];

export default function TermsScreen() {
  const { colors: C, typography: T, roundness } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: C.background, paddingTop: insets.top }]}>
      <View style={[styles.navbar, { borderBottomColor: C.borderSecondary }]}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/settings')} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: C.text, fontSize: T.sizes.lg }]}>Terms of Service</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroBadge, { backgroundColor: C.primaryContainer, borderRadius: roundness.lg }]}>
          <Ionicons name="document-text" size={32} color={C.primary} />
          <Text style={[styles.heroTitle, { color: C.text, fontSize: T.sizes.xl }]}>Terms of Service</Text>
          <Text style={[styles.heroSub, { color: C.textMuted, fontSize: T.sizes.xs }]}>Last updated: September 17, 2026</Text>
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
