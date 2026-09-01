import React from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme';

const APK_URL = 'https://community-api.metromindz.com/uploads/app-release.apk';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.mmdevteam.communityapp';
const APP_STORE_URL = 'https://apps.apple.com/app/id<YOUR_APP_ID>';

export default function DownloadScreen() {
  const { colors: C, typography: T, roundness } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleDownload = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) Linking.openURL(url);
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background, paddingTop: insets.top }]}>
      <View style={[styles.navbar, { borderBottomColor: C.borderSecondary }]}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: C.text, fontSize: T.sizes.lg }]}>Download App</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: C.primaryContainer, borderRadius: roundness.lg }]}>
          <Ionicons name="phone-portrait-outline" size={52} color={C.primary} />
          <Text style={[styles.heroTitle, { color: C.text, fontSize: T.sizes.xxl }]}>GowdaCommunity</Text>
          <Text style={[styles.heroSub, { color: C.textMuted, fontSize: T.sizes.sm }]}>
            Connect with your community, stay updated on events, and more.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.downloadBtn, { backgroundColor: C.primary, borderRadius: roundness.md }]}
          onPress={() => handleDownload(APK_URL)}
          activeOpacity={0.85}
        >
          <Ionicons name="download-outline" size={22} color="#FFF" />
          <View style={{ flex: 1 }}>
            <Text style={styles.downloadBtnTitle}>Download APK</Text>
            <Text style={styles.downloadBtnSub}>Android · Direct install</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#FFF" />
        </TouchableOpacity>

        {Platform.OS !== 'ios' && (
          <TouchableOpacity
            style={[styles.storeBtn, { borderColor: C.border, borderRadius: roundness.md, backgroundColor: C.cardBg }]}
            onPress={() => handleDownload(PLAY_STORE_URL)}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-google-playstore" size={22} color={C.text} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.storeBtnTitle, { color: C.text }]}>Google Play Store</Text>
              <Text style={[styles.storeBtnSub, { color: C.textMuted }]}>Android</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
          </TouchableOpacity>
        )}

        {Platform.OS !== 'android' && (
          <TouchableOpacity
            style={[styles.storeBtn, { borderColor: C.border, borderRadius: roundness.md, backgroundColor: C.cardBg }]}
            onPress={() => handleDownload(APP_STORE_URL)}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-apple" size={22} color={C.text} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.storeBtnTitle, { color: C.text }]}>Apple App Store</Text>
              <Text style={[styles.storeBtnSub, { color: C.textMuted }]}>iOS</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
          </TouchableOpacity>
        )}

        <View style={[styles.infoBox, { backgroundColor: C.cardBg, borderColor: C.border, borderRadius: roundness.md }]}>
          {[
            { icon: 'people-outline', text: 'Connect with family & community members' },
            { icon: 'calendar-outline', text: 'Stay updated on local events' },
            { icon: 'chatbubble-ellipses-outline', text: 'Chat and share with your network' },
            { icon: 'leaf-outline', text: 'Access market rates & farming tools' },
          ].map((item) => (
            <View key={item.text} style={styles.infoRow}>
              <Ionicons name={item.icon as any} size={18} color={C.primary} />
              <Text style={[styles.infoText, { color: C.textSecondary, fontSize: T.sizes.sm }]}>{item.text}</Text>
            </View>
          ))}
        </View>
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
  scroll: { paddingHorizontal: 16, paddingBottom: 48, gap: 14 },
  hero: { alignItems: 'center', padding: 32, marginTop: 16, gap: 10 },
  heroTitle: { fontWeight: '800', textAlign: 'center' },
  heroSub: { textAlign: 'center', lineHeight: 20 },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  downloadBtnTitle: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  downloadBtnSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
  storeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  storeBtnTitle: { fontSize: 15, fontWeight: '600' },
  storeBtnSub: { fontSize: 12, marginTop: 2 },
  infoBox: { padding: 16, borderWidth: StyleSheet.hairlineWidth, gap: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoText: { flex: 1, lineHeight: 20 },
});
