import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useArchivedPostsQuery, useUnarchivePostMutation } from '../api/feed';
import { useToastStore } from '../store/toastStore';
import { useConfirmStore } from '../store/confirmStore';
import PostCard from '../components/feed/PostCard';
import CommentSheet from '../components/feed/CommentSheet';

export default function ArchivedPostsScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const showToast = useToastStore((s) => s.showToast);
  const { data: posts = [], isLoading } = useArchivedPostsQuery();
  const unarchiveMutation = useUnarchivePostMutation();
  const [commentPostId, setCommentPostId] = useState<string | null>(null);

  const handleUnarchive = async (postId: string) => {
    const ok = await useConfirmStore.getState().confirm({
      title: 'Unarchive this post?',
      message: 'The post will be visible on your profile and feed again.',
      confirmText: 'Unarchive',
      cancelText: 'Cancel',
      isDestructive: false,
      icon: 'archive-outline',
    });
    if (!ok) return;
    unarchiveMutation.mutate(postId, {
      onSuccess: () => showToast('Post restored to feed.', 'success'),
      onError: () => showToast('Failed to unarchive post.', 'error'),
    });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Archived Posts</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }}>
        {isLoading && (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Loading...</Text>
        )}

        {!isLoading && posts.length === 0 && (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '14' }]}>
              <Ionicons name="archive-outline" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Archived Posts</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Posts you archive will appear here. Only you can see them.
            </Text>
          </View>
        )}

        {posts.map((post) => (
          <View key={post.id} style={styles.postWrapper}>
            <PostCard
              post={post as any}
              onCommentPress={(id) => setCommentPostId(id)}
              horizontalGutter={0}
            />
            <TouchableOpacity
              style={[styles.unarchiveBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => handleUnarchive(post.id)}
            >
              <Ionicons name="arrow-undo-outline" size={15} color={colors.primary} />
              <Text style={[styles.unarchiveBtnText, { color: colors.primary }]}>Restore to Feed</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <CommentSheet postId={commentPostId} visible={!!commentPostId} onClose={() => setCommentPostId(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptySubtitle: { fontSize: 13.5, textAlign: 'center', lineHeight: 20, paddingHorizontal: 24 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  postWrapper: { marginBottom: 8 },
  unarchiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  unarchiveBtnText: { fontSize: 13.5, fontWeight: '700' },
});
