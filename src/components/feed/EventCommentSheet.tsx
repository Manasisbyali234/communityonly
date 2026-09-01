import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { FlashList as ShopifyFlashList } from '@shopify/flash-list';
const FlashList = ShopifyFlashList as any;
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import BottomSheet from '../common/BottomSheet';
import Avatar from '../common/Avatar';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import {
  useEventCommentsQuery,
  useAddEventCommentMutation,
  useDeleteEventCommentMutation,
} from '../../api/event';

interface Props {
  eventId: string | null;
  eventTitle?: string;
  visible: boolean;
  onClose: () => void;
}

export default function EventCommentSheet({ eventId, eventTitle, visible, onClose }: Props) {
  const { colors, spacing, typography, palette } = useTheme();
  const currentUser = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.showToast);
  const [text, setText] = useState('');

  const { data: comments = [], isLoading } = useEventCommentsQuery(visible ? eventId : null);
  const addComment = useAddEventCommentMutation(eventId ?? '');
  const deleteComment = useDeleteEventCommentMutation(eventId ?? '');

  const handleSubmit = () => {
    if (!text.trim()) return;
    if (!currentUser) { showToast('Please log in to comment', 'error'); return; }
    addComment.mutate(text.trim(), {
      onSuccess: () => setText(''),
      onError: () => showToast('Failed to post comment', 'error'),
    });
  };

  const renderComment = ({ item }: { item: any }) => (
    <View style={[styles.commentItem, { borderBottomColor: colors.borderSecondary }]}>
      <Avatar url={item.author?.avatarUrl} name={item.author?.displayName} size={32} />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={[styles.commentAuthor, { color: colors.text, fontSize: typography.sizes.sm }]}>
            {item.author?.displayName || item.author?.username}
          </Text>
          <Text style={[styles.commentTime, { color: colors.textMuted, fontSize: typography.sizes.xs }]}>
            {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
        <Text style={[styles.commentText, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
          {item.content}
        </Text>
        {item.authorId === currentUser?.id && (
          <TouchableOpacity onPress={() => deleteComment.mutate(item.id)} disabled={deleteComment.isPending} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={15} color={colors.error} />
            <Text style={[styles.deleteText, { color: colors.error }]}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <BottomSheet visible={visible} onClose={onClose} title={eventTitle || 'Comments'}>
      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : (
          <FlashList
            data={comments}
            renderItem={renderComment}
            estimatedItemSize={70}
            keyExtractor={(item: any) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
                  No comments yet. Start the conversation!
                </Text>
              </View>
            )}
          />
        )}

        <View style={[styles.inputWrapper, { backgroundColor: colors.cardBg, borderTopColor: colors.borderSecondary }]}>
          <View style={[styles.inputContainer, { borderTopColor: colors.borderSecondary, backgroundColor: colors.cardBg, paddingBottom: spacing.sm }]}>
            <TextInput
              placeholder="Add a comment..."
              placeholderTextColor={colors.textMuted}
              value={text}
              onChangeText={setText}
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, fontSize: typography.sizes.sm }]}
              multiline
            />
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!text.trim() || addComment.isPending}
              style={[styles.sendBtn, { backgroundColor: text.trim() ? colors.primary : colors.inputBg }]}
            >
              {addComment.isPending ? (
                <ActivityIndicator size="small" color={palette.white} />
              ) : (
                <Ionicons name="arrow-up" size={18} color={text.trim() ? palette.white : colors.textMuted} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 80 },
  commentItem: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  commentContent: { flex: 1, marginLeft: 12 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  commentAuthor: { fontWeight: '600' },
  commentTime: {},
  commentText: { lineHeight: 18 },
  deleteButton: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 7, alignSelf: 'flex-start' },
  deleteText: { fontSize: 12, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontWeight: '500' },
  inputWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 10, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, paddingHorizontal: 16, paddingVertical: 8, maxHeight: 100, marginRight: 8, borderRadius: 20 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
