import React, { useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../theme';
import { useStoryQuery, STORY_CATEGORIES } from '../../api/ourPeople';
import { shareUrl } from '../../utils/shareUtils';
import { useAuthStore } from '../../store/authStore';
import { useUserApprovalStore, resolveUserApproval } from '../../store/userApprovalStore';
import { useToastStore } from '../../store/toastStore';

export default function StoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.showToast);
  const { isApproved } = resolveUserApproval(currentUser);

  React.useEffect(() => {
    if (!isApproved) {
      showToast('Community profiles and stories are restricted until approved.', 'warning');
      router.replace('/(auth)/approval-status');
    }
  }, [isApproved]);

  const { data: story, isLoading } = useStoryQuery(id);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const catConfig = STORY_CATEGORIES.find((c) => c.id === story?.category);

  const handleShare = async () => {
    if (!story) return;
    const link = `https://gowdacommunity.com/our-people/${story.id}`;
    const msg = `Inspiring Community Story: ${story.title}\n\nRead about ${story.personName} (${story.profession}, ${story.location}) on the Gowda Community App.\n\n${link}`;
    await shareUrl(msg, link);
  };

  const handleBack = () => {
    router.replace('/(tabs)/explore?tab=stories' as any);
  };

  if (!isApproved) {
    return null;
  }

  if (isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.navbar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleBack} style={[styles.navBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }]}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.text }]}>Community Story</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!story) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.navbar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleBack} style={[styles.navBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }]}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.text }]}>Community Story</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.centerLoading}>
          <Ionicons name="book-outline" size={54} color={colors.textMuted} />
          <Text style={[styles.notFoundText, { color: colors.textMuted }]}>Story not found.</Text>
        </View>
      </View>
    );
  }

  const formattedDate = new Date(story.publishedAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const additionalImages = story.additionalImages || [];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Navbar */}
      <View style={[styles.navbar, { backgroundColor: colors.cardBg, borderBottomColor: colors.border, paddingTop: insets.top > 0 ? insets.top + 6 : 14 }]}>
        <TouchableOpacity onPress={handleBack} style={[styles.navBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }]}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.text }]} numberOfLines={1}>Our People</Text>
        <TouchableOpacity onPress={handleShare} style={[styles.navBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }]}>
          <Ionicons name="share-social-outline" size={19} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        <View style={styles.heroWrap}>
          <Image
            source={{ uri: story.featuredImage }}
            style={styles.heroImage}
            contentFit="cover"
          />
          <View style={styles.heroOverlay} />

          <View style={[styles.catBadge, { backgroundColor: (catConfig?.color || colors.primary) }]}>
            <Text style={styles.catEmoji}>{catConfig?.emoji || '🌟'}</Text>
            <Text style={styles.catText}>{story.category}</Text>
          </View>
        </View>

        {/* Article Body Container */}
        <View style={styles.bodyWrap}>
          {/* Metadata info */}
          <View style={styles.metaRow}>
            <Text style={[styles.metaText, { color: colors.textMuted }]}>{formattedDate}</Text>
            <Text style={[styles.metaDot, { color: colors.textMuted }]}>•</Text>
            <Text style={[styles.metaText, { color: colors.textMuted }]}>{story.readTimeMinutes} min read</Text>
          </View>

          {/* Title */}
          <Text style={[styles.articleTitle, { color: colors.text }]}>
            {story.title}
          </Text>

          {/* Person Profile Box */}
          <View style={[styles.profileBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F9FAFB', borderColor: colors.border }]}>
            {story.personAvatarUrl ? (
              <Image source={{ uri: story.personAvatarUrl }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 16 }}>{story.personName[0]}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.personName, { color: colors.text }]}>{story.personName}</Text>
              <Text style={[styles.profession, { color: colors.textSecondary }]}>{story.profession}</Text>
              <View style={styles.locRow}>
                <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                <Text style={[styles.locText, { color: colors.textMuted }]}>{story.location}</Text>
              </View>
            </View>
          </View>

          {/* Short Description Lead Quote */}
          <View style={[styles.leadBox, { backgroundColor: (catConfig?.color || colors.primary) + '12', borderColor: (catConfig?.color || colors.primary) + '35' }]}>
            <Text style={[styles.leadText, { color: colors.text }]}>
              "{story.shortDescription}"
            </Text>
          </View>

          {/* Full Story Paragraphs */}
          <View style={styles.storyTextWrap}>
            {story.fullStory.split('\n\n').map((paragraph, idx) => (
              <Text key={idx} style={[styles.paragraph, { color: colors.textSecondary }]}>
                {paragraph}
              </Text>
            ))}
          </View>

          {/* Additional Photos Gallery */}
          {additionalImages.length > 0 && (
            <View style={styles.galleryWrap}>
              <Text style={[styles.galleryHeading, { color: colors.text }]}>Photo Gallery</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, marginTop: 10 }}>
                {additionalImages.map((imgUri, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setSelectedPhoto(imgUri)}
                    activeOpacity={0.88}
                  >
                    <Image
                      source={{ uri: imgUri }}
                      style={styles.galleryThumb}
                      contentFit="cover"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky Bottom Share Bar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.cardBg, borderTopColor: colors.border, paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 16 }]}>
        <TouchableOpacity
          style={[styles.shareBtn, { backgroundColor: colors.primary }]}
          onPress={handleShare}
          activeOpacity={0.85}
        >
          <Ionicons name="share-social" size={18} color="#FFF" />
          <Text style={styles.shareBtnText}>Share Story with Friends</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centerLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFoundText: { fontSize: 16, fontWeight: '600' },
  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1, fontSize: 16, fontWeight: '700', textAlign: 'center', marginHorizontal: 10 },

  scrollContent: { padding: 0 },

  // Hero
  heroWrap: { height: 260, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  catBadge: {
    position: 'absolute', bottom: 16, left: 16,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  catEmoji: { fontSize: 12 },
  catText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

  // Body
  bodyWrap: { padding: 18, gap: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12.5, fontWeight: '600' },
  metaDot: { fontSize: 12 },

  articleTitle: { fontSize: 22, fontWeight: '800', lineHeight: 30, letterSpacing: -0.3 },

  profileBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 16, borderWidth: 1, marginVertical: 4,
  },
  avatar: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden' },
  personName: { fontSize: 15, fontWeight: '800' },
  profession: { fontSize: 13, marginTop: 1 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  locText: { fontSize: 12 },

  leadBox: { padding: 14, borderRadius: 12, borderWidth: 1, marginVertical: 4 },
  leadText: { fontSize: 14.5, fontStyle: 'italic', lineHeight: 22, fontWeight: '500' },

  storyTextWrap: { gap: 14, marginTop: 4 },
  paragraph: { fontSize: 15.5, lineHeight: 25, letterSpacing: 0.1 },

  galleryWrap: { marginTop: 12 },
  galleryHeading: { fontSize: 15, fontWeight: '700' },
  galleryThumb: { width: 140, height: 95, borderRadius: 12 },

  // Bottom Bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth,
  },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
  },
  shareBtnText: { color: '#FFF', fontSize: 15.5, fontWeight: '700' },
});
