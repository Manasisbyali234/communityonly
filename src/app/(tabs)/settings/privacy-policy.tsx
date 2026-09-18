import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';

const SECTIONS = [
  {
    title: '1. Information We Collect',
    body: 'Depending on the features you use, we may collect:\n\nPersonal information: name, date of birth, age, gender, profile photograph, phone number, email address, location, and address where provided.\n\nMatrimonial information: marital status, education, qualification, occupation, designation, employer or work sector, work location, annual income, religion, caste/community, mother tongue, eating habits, disability information, family information, siblings, family background, and partner preferences.\n\nUser-generated information: profile creation, community posts, stories, comments, likes, chat/messages, reports, feedback, and support requests.',
  },
  {
    title: '2. How We Use Your Information',
    body: 'We may use your information to create and manage your profile; provide Matrimony services; suggest potential matches; enable communication; display community profiles and content; provide search and filtering; process reports and complaints; prevent fraud and misuse; maintain application security; improve functionality; provide customer support; and send important service-related notifications.',
  },
  {
    title: '3. Profile Visibility',
    body: 'Information you add to your Matrimony profile may be visible to other registered users depending on the application’s privacy and profile visibility settings. Carefully consider the information you choose to publish.\n\nDo not share passwords, OTPs, banking credentials, UPI PINs, or other financial security information in your profile.',
  },
  {
    title: '4. Communication Data',
    body: 'If you use chat or messaging features, information associated with those communications may be processed to provide the communication service, maintain security, investigate reports, and prevent abuse, subject to applicable law and our policies.',
  },
  {
    title: '5. Location Information',
    body: 'We may process location information that you provide or that is necessary for application functionality. It may be used to display relevant community information, improve profile discovery, provide location-based features, and show work or residence location where you choose to provide it. You can avoid providing optional location information where the application allows it.',
  },
  {
    title: '6. Photos and Media',
    body: 'Photos and other media you upload may be stored and displayed according to your profile and application settings. We may remove content that violates our Terms & Conditions or applicable law.',
  },
  {
    title: '7. Cookies and Technical Information',
    body: 'We may collect device information, operating system, application version, IP address, log information, crash information, and usage information. This helps us maintain security, troubleshoot problems, and improve the application.',
  },
  {
    title: '8. Sharing of Information',
    body: 'We do not sell your personal information as a product. We may share information when necessary with service providers supporting the application, hosting and infrastructure providers, analytics or technical service providers, security and fraud-prevention providers, and legal or regulatory authorities when required by law. We only share information as necessary for legitimate business, service, security, or legal purposes.',
  },
  {
    title: '9. Data Security',
    body: 'We use reasonable technical and organisational measures to protect personal information against unauthorised access, misuse, alteration, disclosure, or destruction. However, no internet-based service can guarantee absolute security.',
  },
  {
    title: '10. User Responsibility',
    body: 'You are responsible for protecting your account credentials and must not share your password, OTP, or other authentication information with anyone. Contact us immediately if you believe your account has been compromised.',
  },
  {
    title: '11. Data Retention',
    body: 'We retain personal information only for as long as reasonably necessary to provide our services, comply with legal obligations, resolve disputes, enforce agreements, and maintain security. When information is no longer required, it may be deleted or anonymised in accordance with applicable requirements.',
  },
  {
    title: '12. Account Deletion',
    body: 'You may request deletion of your account and associated personal information through available account settings or by contacting us. Some information may need to be retained where required by law, for security, fraud prevention, dispute resolution, or other legitimate purposes.',
  },
  {
    title: '13. Children’s Privacy',
    body: 'The Matrimony service is intended for users 18 years or older. We do not knowingly allow minors to create Matrimony profiles. If we become aware that a minor has created such a profile, we may take appropriate action, including removing the account.',
  },
  {
    title: '14. Third-Party Services',
    body: 'The application may use third-party services for hosting, notifications, analytics, authentication, payments, or other technical services. Such providers may process information on our behalf as necessary to provide their services.',
  },
  {
    title: '15. Changes to Privacy Policy',
    body: 'We may update this Privacy Policy periodically. Any updated version will be made available through the application with the revised effective date.',
  },
  {
    title: '16. Contact Us',
    body: 'For privacy-related questions, requests, or complaints, contact privacy@metromindz.com.',
  },
];

export default function PrivacyPolicyScreen() {
  const { colors: C, typography: T, roundness } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: C.background, paddingTop: insets.top }]}>
      <View style={[styles.navbar, { borderBottomColor: C.borderSecondary }]}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/settings')} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: C.text, fontSize: T.sizes.lg }]}>Privacy Policy</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroBadge, { backgroundColor: C.primaryContainer, borderRadius: roundness.lg }]}>
          <Ionicons name="shield-checkmark" size={32} color={C.primary} />
          <Text style={[styles.heroTitle, { color: C.text, fontSize: T.sizes.xl }]}>Privacy Policy</Text>
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
