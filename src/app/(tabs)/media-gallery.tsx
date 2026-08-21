import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  FlatList, Modal, Platform,
  Pressable, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUserFilesQuery } from '../../api/media';
import Skeleton from '../../components/feedback/Skeleton';
import { useTheme } from '../../theme';

const COLS = 3;
const GAP = 2;

export default function MediaGalleryScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const tileSize = (windowWidth - GAP * (COLS + 1)) / COLS;

  const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');
  const [lightbox, setLightbox] = useState<string | null>(null);

  const mimeParam = filter === 'image' ? 'image' : filter === 'video' ? 'video' : undefined;
  const { data: files = [], isLoading } = useUserFilesQuery(mimeParam);

  const images = files.filter((f) => f.mimeType.startsWith('image'));
  const videos = files.filter((f) => f.mimeType.startsWith('video'));
  const displayed = filter === 'image' ? images : filter === 'video' ? videos : files;

  const FILTERS: { id: typeof filter; label: string }[] = [
    { id: 'all', label: `All (${files.length})` },
    { id: 'image', label: `Photos (${images.length})` },
    { id: 'video', label: `Videos (${videos.length})` },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/profile')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>My Media</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter chips */}
      <View style={[styles.filterRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.id}
            onPress={() => setFilter(f.id)}
            style={[
              styles.chip,
              filter === f.id
                ? { backgroundColor: colors.primaryContainer, borderColor: colors.primary }
                : { backgroundColor: 'transparent', borderColor: colors.border },
            ]}
          >
            <Text style={[styles.chipText, { color: filter === f.id ? colors.primaryDark : colors.textMuted }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Grid */}
      {isLoading ? (
        <View style={styles.skeletonGrid}>
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} width={tileSize} height={tileSize} borderRadius={0} />
          ))}
        </View>
      ) : displayed.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="images-outline" size={52} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No media found</Text>
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => item.id}
          numColumns={COLS}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => item.mimeType.startsWith('image') && setLightbox(item.url)}
              style={[styles.tile, { width: tileSize, height: tileSize }]}
            >
              <Image source={{ uri: item.url }} style={styles.tileImg} contentFit="cover" transition={200} />
              {item.mimeType.startsWith('video') && (
                <View style={styles.videoOverlay}>
                  <Ionicons name="play-circle" size={32} color="rgba(255,255,255,0.9)" />
                </View>
              )}
            </Pressable>
          )}
          contentContainerStyle={{ gap: GAP, paddingBottom: 40 }}
          columnWrapperStyle={{ gap: GAP }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Lightbox */}
      <Modal visible={!!lightbox} transparent animationType="fade" onRequestClose={() => setLightbox(null)}>
        <Pressable style={styles.lightboxBg} onPress={() => setLightbox(null)}>
          <Image source={{ uri: lightbox! }} style={{ width: windowWidth, height: windowHeight }} contentFit="contain" />
          <TouchableOpacity style={[styles.lightboxClose, { top: insets.top + 16 }]} onPress={() => setLightbox(null)}>
            <Ionicons name="close-circle" size={36} color="#FFF" />
          </TouchableOpacity>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, height: 56, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 8 },
  title: { fontSize: 17, fontWeight: '700' },
  filterRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, padding: GAP },
  tile: { overflow: 'hidden', position: 'relative' },
  tileImg: { width: '100%', height: '100%' },
  videoOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 15, fontWeight: '500' },
  lightboxBg: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center', justifyContent: 'center',
  },
  lightboxClose: { position: 'absolute', right: 16 },
});
