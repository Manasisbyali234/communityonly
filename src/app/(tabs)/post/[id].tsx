import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, BackHandler } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePostQuery, useLikePostMutation, useSavePostMutation, useAddCommentMutation } from '../../../api/feed';
import { shareUrl } from '../../../utils/shareUtils';
import VideoPostPlayer from '../../../components/common/VideoPostPlayer';
import Avatar from '../../../components/common/Avatar';
import CommentSheet from '../../../components/feed/CommentSheet';
import { useTheme } from '../../../theme';
import { useToastStore } from '../../../store/toastStore';

export default function PostDetail() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, spacing, typography, palette, roundness } = useTheme();
  const showToast = useToastStore((state) => state.showToast);

  const { data: post, isLoading, error, refetch } = usePostQuery(id || '');
  const likeMutation = useLikePostMutation();
  const saveMutation = useSavePostMutation();
  const addCommentMutation = useAddCommentMutation();

  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [commentSheetVisible, setCommentSheetVisible] = useState(false);
  const commentInputRef = useRef<TextInput>(null);

  // Sync from server data whenever post loads or refreshes
  useEffect(() => {
    if (post) {
      setIsLiked(post.isLiked ?? false);
      setLikesCount(post.likesCount ?? 0);
    }
  }, [post?.isLiked, post?.likesCount]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/explore' as any);
    }
  };

  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => {
      subscription.remove();
    };
  }, []);

  if (isLoading || (!post && !error)) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: '#000000' }]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  if (error) {
    const errStatus = (error as any)?.status;
    if (errStatus === 401) {
      router.replace('/(auth)/login' as any);
      return null;
    }
    const is404 = errStatus === 404;
    return (
      <View style={[styles.centerContainer, { backgroundColor: '#000000' }]}>
        <Ionicons name={is404 ? 'document-outline' : 'cloud-offline-outline'} size={48} color="rgba(255,255,255,0.5)" />
        <Text style={{ color: '#FFFFFF', fontSize: typography.sizes.md, marginTop: 16, textAlign: 'center' }}>
          {is404 ? 'Post not found.' : 'Something went wrong. Please try again.'}
        </Text>
        {!is404 && (
          <TouchableOpacity onPress={() => refetch()} style={styles.backLink}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={handleBack} style={styles.backLink}>
          <Text style={{ color: colors.primary }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: '#000000' }]}>
        <Text style={{ color: '#FFFFFF', fontSize: typography.sizes.md }}>Post not found.</Text>
        <TouchableOpacity onPress={handleBack} style={styles.backLink}>
          <Text style={{ color: colors.primary }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleLike = () => {
    if (!post || likeMutation.isPending) return;
    const next = !isLiked;
    setIsLiked(next);
    setLikesCount(c => next ? c + 1 : Math.max(0, c - 1));
    likeMutation.mutate(post.id);
  };

  const handleSave = () => {
    saveMutation.mutate(post.id);
  };

  const handleShare = async () => {
    const base = Platform.OS === 'web' && typeof window !== 'undefined' && window.location
      ? `${window.location.protocol}//${window.location.host}`
      : '';
    const link = `${base}/post/${post.id}`;
    const ok = await shareUrl(
      `Check out this post on GowdaCommunity! ${link}`,
      link
    );
    showToast(ok ? 'Link copied to clipboard!' : 'Could not share post', ok ? 'success' : 'error');
  };

  const handleCommentSubmit = () => {
    if (commentText.trim() === '') return;
    addCommentMutation.mutate(
      { postId: post.id, content: commentText.trim() },
      {
        onSuccess: () => {
          setCommentText('');
          commentInputRef.current?.blur();
        },
      }
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: '#000000' }]}
    >
      {/* Immersive Fullscreen Media Viewer */}
      <View style={styles.mediaViewport}>
        {post.mediaUrl ? (
          post.mediaType === 'video' ? (
            <VideoPostPlayer url={post.mediaUrl} />
          ) : (
            <Image source={{ uri: post.mediaUrl }} style={styles.media} contentFit="contain" />
          )
        ) : (
          <View style={styles.noMediaContainer}>
            <Text style={[styles.noMediaText, { fontSize: typography.sizes.lg }]}>
              {post.content}
            </Text>
          </View>
        )}
      </View>

      {/* Top Gradient Overlay & Back Option */}
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'transparent']}
        style={[styles.topOverlay, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.authorHeader}>
            <Avatar url={post.author.avatarUrl} name={post.author.displayName} size={32} />
            <View style={{ marginLeft: 8 }}>
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: typography.sizes.sm }}>
                {post.author.displayName}
              </Text>
              {post.community && (
                <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: typography.sizes.xs }}>
                  in {post.community.name}
                </Text>
              )}
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Bottom Gradient Overlay containing metadata & actions */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={[styles.bottomOverlay, { paddingBottom: 16 }]}
      >
        <View style={styles.contentAndActions}>
          {/* Metadata Block (Left Column) */}
          <View style={styles.metadataBlock}>
            <Text numberOfLines={3} style={[styles.captionText, { fontSize: typography.sizes.sm }]}>
              {post.content}
            </Text>
            {post.tags && post.tags.length > 0 && (
              <View style={styles.tagTray}>
                {post.tags.map((tag) => (
                  <Text key={tag} style={[styles.tagText, { color: colors.primary }]}>
                    #{tag}{' '}
                  </Text>
                ))}
              </View>
            )}
          </View>

          {/* Right Floating Actions Column */}
          <View style={styles.actionsColumn}>
            {/* Like Action */}
            <TouchableOpacity onPress={handleLike} style={styles.actionItem} activeOpacity={0.8}>
              <View style={styles.actionIconContainer}>
                <Ionicons
                  name={isLiked ? 'heart' : 'heart-outline'}
                  size={28}
                  color={isLiked ? '#FF3B30' : '#FFFFFF'}
                />
              </View>
              <Text style={styles.actionCount}>{likesCount}</Text>
            </TouchableOpacity>

            {/* Comment Action */}
            <TouchableOpacity
              onPress={() => setCommentSheetVisible(true)}
              style={styles.actionItem}
              activeOpacity={0.8}
            >
              <View style={styles.actionIconContainer}>
                <Ionicons name="chatbubble-outline" size={26} color="#FFFFFF" />
              </View>
              <Text style={styles.actionCount}>{post.commentsCount}</Text>
            </TouchableOpacity>

            {/* Save Action */}
            <TouchableOpacity onPress={handleSave} style={styles.actionItem} activeOpacity={0.8}>
              <View style={styles.actionIconContainer}>
                <Ionicons
                  name={post.isBookmarked ? 'bookmark' : 'bookmark-outline'}
                  size={26}
                  color={post.isBookmarked ? colors.primary : '#FFFFFF'}
                />
              </View>
              <Text style={styles.actionLabel}>Save</Text>
            </TouchableOpacity>

            {/* Share Action */}
            <TouchableOpacity style={styles.actionItem} activeOpacity={0.8} onPress={handleShare}>
              <View style={styles.actionIconContainer}>
                <Ionicons name="paper-plane-outline" size={26} color="#FFFFFF" />
              </View>
              <Text style={styles.actionLabel}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Comment Input Bar at the Bottom */}
        <View style={[styles.commentBar, { backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: roundness.lg }]}>
          <TextInput
            ref={commentInputRef}
            placeholder="Write a comment..."
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
            value={commentText}
            onChangeText={setCommentText}
            style={styles.commentInput}
            onSubmitEditing={handleCommentSubmit}
          />
          <TouchableOpacity onPress={handleCommentSubmit} disabled={commentText.trim() === ''} style={styles.sendBtn}>
            <Text style={{ color: commentText.trim() === '' ? 'rgba(255, 255, 255, 0.4)' : colors.primary, fontWeight: '700' }}>
              Post
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
      <CommentSheet
        postId={post.id}
        visible={commentSheetVisible}
        onClose={() => setCommentSheetVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backLink: {
    marginTop: 16,
    padding: 8,
  },
  mediaViewport: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  noMediaContainer: {
    padding: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noMediaText: {
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '500',
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 20,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    padding: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
  },
  authorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 14,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  contentAndActions: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metadataBlock: {
    flex: 1,
    marginRight: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 12,
    borderRadius: 12,
  },
  captionText: {
    color: '#FFFFFF',
    lineHeight: 20,
  },
  tagTray: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  tagText: {
    fontWeight: '600',
    fontSize: 12,
  },
  actionsColumn: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  actionItem: {
    alignItems: 'center',
    marginBottom: 18,
  },
  actionIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  commentBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 52,
    marginBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  commentInput: {
    flex: 1,
    height: '100%',
    color: '#FFFFFF',
    paddingVertical: 8,
  },
  sendBtn: {
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
});
