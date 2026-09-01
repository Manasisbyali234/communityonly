import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

const OPTIONS = [
  {
    route: '/create/post',
    icon: 'create-outline' as const,
    title: 'Create Post',
    desc: 'Share updates, photos, and community news.',
  },
  {
    route: '/create/event',
    icon: 'calendar-outline' as const,
    title: 'Create Event',
    desc: 'Organize community gatherings, meetings, and celebrations.',
  },
  {
    route: '/create/community',
    icon: 'home-outline' as const,
    title: 'Create Community Page',
    desc: 'Create a new village, association, or interest-based community.',
  },
  {
    route: '/create/post',
    icon: 'newspaper-outline' as const,
    title: 'Community Feed Post',
    desc: 'Post to the community feed and share with your neighbors.',
  },
];

export default function CreateScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 16) }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Create</Text>
      </View>

      {/* Options */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.list}>
          {OPTIONS.map((opt, i) => (
            <TouchableOpacity
              key={`${opt.route}-${i}`}
              style={[
                styles.option,
                { borderBottomColor: colors.borderSecondary },
                i === OPTIONS.length - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={() => router.push(opt.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, { backgroundColor: colors.primaryContainer }]}>
                <Ionicons name={opt.icon} size={24} color={colors.primary} />
              </View>
              <View style={styles.textWrap}>
                <Text style={[styles.title, { color: colors.text }]}>{opt.title}</Text>
                <Text style={[styles.desc, { color: colors.textSecondary }]}>{opt.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  list: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textWrap: { flex: 1, marginRight: 12 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 3 },
  desc: { fontSize: 13, lineHeight: 18 },
});
