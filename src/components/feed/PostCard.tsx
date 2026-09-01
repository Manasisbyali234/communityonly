import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
  StyleSheet, Text, View, Pressable,
  TouchableOpacity, Share, Platform, Modal,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withSequence, withDelay, withTiming,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { Post } from '../../types';
import Avatar from '../common/Avatar';
import VideoPostPlayer from '../common/VideoPostPlayer';
import { useLikePostMutation, useSavePostMutation, useDeletePostMutation } from '../../api/feed';
import { useToastStore } from '../../store/toastStore';
import { useConfirmStore } from '../../store/confirmStore';
import { useAuthStore } from '../../store/authStore';
import { useRouter } from 'expo-router';

const CARD_H_MARGIN = 16;
const MEDIA_HEIGHT = 320;
const SINGLE_IMAGE_FALLBACK_ASPECT_RATIO = 4 / 3;

interface PostCardProps {
  post: Post;
  onCommentPress: (postId: string) => void;
  onForwardPress?: (postId: string) => void;
  /** Set to 0 when the list itself already supplies the standard 16px gutter. */
  horizontalGutter?: number;
}

const LIKE_RED = '#FF3B30';

// ── Action button with press animation & modern pill styling ────────────────
const ActionBtn: React.FC<{
  icon: string;
  count?: number;
  active?: boolean;
  activeColor?: string;
  defaultColor?: string;
  onPress: () => void;
}> = ({ icon, count, active, activeColor, defaultColor, onPress }) => {
  const scale = useSharedValue(1);
  const resolvedActiveColor = activeColor ?? '#2D6A2D';
  const resolvedDefaultColor = defaultColor ?? 'rgba(0,0,0,0.55)';

  const handlePress = () => {
    scale.value = withSequence(
      withTiming(1.28, { duration: 90 }),
      withSpring(1, { damping: 6, stiffness: 220 }),
    );
    onPress();
  };

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const iconColor = active ? resolvedActiveColor : resolvedDefaultColor;

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={[
        styles.actionBtn,
        active && { backgroundColor: resolvedActiveColor + '12' },
      ]}
    >
      <Animated.View style={[styles.actionIconWrap, animStyle]}>
        <Ionicons
          name={icon as any}
          size={20}
          color={iconColor}
        />
      </Animated.View>
      {count !== undefined && count > 0 && (
        <Text style={[styles.actionCount, { color: iconColor }]}>
          {count > 999 ? `${(count / 1000).toFixed(1)}k` : count}
        </Text>
      )}
    </TouchableOpacity>
  );
};

// ── Main PostCard ────────────────────────────────────────────────────────────
export const PostCard: React.FC<PostCardProps> = React.memo(({
  post,
  onCommentPress,
  onForwardPress,
  horizontalGutter = CARD_H_MARGIN,
}) => {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const likeMutation = useLikePostMutation();
  const saveMutation = useSavePostMutation();
  const deleteMutation = useDeletePostMutation();
  const showToast = useToastStore((s) => s.showToast);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isOwnPost = currentUserId === post.author.id;

  const lastTapRef = useRef<number>(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked ?? false);
  const [isLiked, setIsLiked] = useState(post.isLiked ?? false);
  const [likesCount, setLikesCount] = useState(post.likesCount ?? 0);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [imageAspectRatio, setImageAspectRatio] = useState(SINGLE_IMAGE_FALLBACK_ASPECT_RATIO);
  const moreBtnRef = useRef<View>(null);
  const mediaUri = post.mediaUrl || (post.images && post.images[0]);

  // Sync like state from server whenever the post prop updates
  useEffect(() => {
    setIsLiked(post.isLiked ?? false);
    setLikesCount(post.likesCount ?? 0);
  }, [post.isLiked, post.likesCount]);

  useEffect(() => {
    setIsBookmarked(post.isBookmarked ?? false);
  }, [post.isBookmarked]);

  useEffect(() => {
    setImageAspectRatio(SINGLE_IMAGE_FALLBACK_ASPECT_RATIO);
  }, [mediaUri]);

  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: heartOpacity.value,
  }));

  const triggerDoubleTapHeart = () => {
    heartScale.value = withSequence(
      withSpring(1.3, { damping: 6, stiffness: 140 }),
      withDelay(450, withSpring(0, { damping: 12 })),
    );
    heartOpacity.value = withSequence(
      withTiming(1, { duration: 120 }),
      withDelay(450, withTiming(0, { duration: 220 })),
    );
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!isLiked && !likeMutation.isPending) {
        setIsLiked(true);
        setLikesCount(c => c + 1);
        likeMutation.mutate(post.id);
      }
      triggerDoubleTapHeart();
    }
    lastTapRef.current = now;
  };

  const handleLike = () => {
    if (likeMutation.isPending) return;
    const next = !isLiked;
    setIsLiked(next);
    setLikesCount(c => next ? c + 1 : Math.max(0, c - 1));
    likeMutation.mutate(post.id);
  };

  const handleComment = () => onCommentPress(post.id);

  const handleSave = () => {
    const next = !isBookmarked;
    setIsBookmarked(next);
    saveMutation.mutate(post.id);
  };

  const handleShare = async () => {
    if (onForwardPress) {
      onForwardPress(post.id);
    } else {
      try {
        await Share.share({
          message: `${post.author.displayName}: "${post.content}"`,
        });
      } catch (_) {}
    }
  };

  const handleMorePress = () => {
    moreBtnRef.current?.measureInWindow((x, y, w, h) => {
      setMenuPos({ top: y + h + 4, right: 16 });
      setMenuVisible(true);
    });
  };

  const navigateToCommunity = () => {
    if (post.community) router.push(`/community/${post.community.id}?from=feed`);
  };
  const navigateToAuthor = () => router.push(`/user/${post.author.id}?from=feed` as any);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const displayContent = post.content.replace(/^[\s\u200B-\u200D\uFEFF]+|[\s\u200B-\u200D\uFEFF]+$/g, '');

  const parsedContent = useMemo(() => {
    return displayContent.split(/([\s]+)/).map((part, i) => {
      if (part.startsWith('#'))
        return <Text key={i} style={[styles.hashtagText, { color: colors.primary }]}>{part}</Text>;
      if (part.startsWith('@'))
        return <Text key={i} style={[styles.mentionText, { color: colors.primary }]}>{part}</Text>;
      return part;
    });
  }, [displayContent, colors.primary]);

  const hasMedia = !!(post.videoUrl || post.mediaUrl || (post.images && post.images.length > 0));
  const isVideo = post.videoUrl || post.mediaType === 'video' || post.mediaType === 'VIDEO';
  const isSingleImage = !isVideo && !(post.images && post.images.length > 1);
  const shouldShowReadMore = displayContent.length > 130 || displayContent.split('\n').length > 3;
  const hasCaption = displayContent.length > 0;

  const cardBorderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const subtleDividerColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const iconDefaultColor = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)';

  return (
    <View
      style={[
        styles.card,
        {
          marginHorizontal: horizontalGutter,
          backgroundColor: colors.surface,
          borderColor: cardBorderColor,
        },
      ]}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={post.community ? navigateToCommunity : navigateToAuthor}
          style={styles.avatarWrap}
        >
          <Avatar
            url={post.community?.avatarUrl || post.author.avatarUrl}
            name={post.community?.name || post.author.displayName}
            size={42}
            gradientBorder={post.community?.isJoined === false}
          />
          {post.community && (
            <TouchableOpacity
              onPress={navigateToAuthor}
              style={[styles.authorBadge, { borderColor: colors.surface }]}
            >
              <Avatar url={post.author.avatarUrl} name={post.author.displayName} size={16} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        <View style={styles.headerMeta}>
          <View style={styles.nameRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={post.community ? navigateToCommunity : navigateToAuthor}
              style={styles.nameTouchable}
            >
              <Text
                style={[styles.displayName, { color: colors.text }]}
                numberOfLines={1}
              >
                {post.community?.name || post.author.displayName}
              </Text>
            </TouchableOpacity>
            {post.community && (
              <View style={[styles.communityPill, { backgroundColor: colors.primaryContainer + '60' }]}>
                <Ionicons name="people" size={10} color={colors.primary} />
                <Text style={[styles.communityPillText, { color: colors.primary }]}>Group</Text>
              </View>
            )}
          </View>

          <View style={styles.metaRow}>
            {post.community && (
              <TouchableOpacity onPress={navigateToAuthor}>
                <Text style={[styles.authorName, { color: colors.textMuted }]}>
                  {post.author.displayName}
                </Text>
              </TouchableOpacity>
            )}
            {post.community && <Text style={[styles.metaDot, { color: colors.textMuted }]}>•</Text>}
            <Text style={[styles.timeText, { color: colors.textMuted }]}>
              {timeAgo(post.createdAt)}
            </Text>
          </View>
        </View>

        <View ref={moreBtnRef} collapsable={false}>
          <Pressable
            style={({ pressed }) => [
              styles.moreBtn,
              {
                backgroundColor: pressed
                  ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)')
                  : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'),
              },
            ]}
            onPress={handleMorePress}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={iconDefaultColor} />
          </Pressable>
        </View>

        <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
          <View style={StyleSheet.absoluteFill}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuVisible(false)} />
            <View style={[styles.dropdown, { top: menuPos.top, right: 16, backgroundColor: colors.surface, borderColor: cardBorderColor }]}>
              {!isOwnPost && (
                <Pressable
                  style={styles.dropdownItem}
                  onPress={() => {
                    setMenuVisible(false);
                    showToast('Post reported. Thank you!', 'info');
                  }}
                >
                  <View style={[styles.dropdownIconBox, { backgroundColor: '#FFEBEE' }]}>
                    <Ionicons name="flag-outline" size={13} color="#E53935" />
                  </View>
                  <Text style={[styles.dropdownText, { color: '#E53935' }]}>Report Post</Text>
                </Pressable>
              )}
              {isOwnPost && (
                <Pressable
                  disabled={deleteMutation.isPending}
                  style={[styles.dropdownItem, deleteMutation.isPending && { opacity: 0.5 }]}
                  onPress={async () => {
                    setMenuVisible(false);
                    const ok = await useConfirmStore.getState().confirm({
                      title: 'Delete this post?',
                      message: 'This action cannot be undone and will permanently remove your post.',
                      confirmText: 'Delete',
                      cancelText: 'Cancel',
                      isDestructive: true,
                      icon: 'trash-outline',
                    });
                    if (!ok) return;
                    deleteMutation.mutate(post.id, {
                      onError: () => showToast('Failed to delete post.', 'error'),
                    });
                  }}
                >
                  <View style={[styles.dropdownIconBox, { backgroundColor: '#FFEBEE' }]}>
                    <Ionicons name="trash-outline" size={13} color="#E53935" />
                  </View>
                  <Text style={[styles.dropdownText, { color: '#E53935' }]}>Delete Post</Text>
                </Pressable>
              )}
            </View>
          </View>
        </Modal>
      </View>

      {/* ── Content / Caption (Above media for modern social feel) ── */}
      {hasCaption && (
        <View style={styles.content}>
          {post.tags && post.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {post.tags.slice(0, 3).map((tag, i) => (
                <View
                  key={i}
                  style={[styles.tagChip, { backgroundColor: colors.primaryContainer + '50' }]}
                >
                  <Text style={[styles.tagText, { color: colors.primary }]}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}

          <Text
            style={[styles.bodyText, { color: colors.text }]}
            numberOfLines={isExpanded ? 0 : 3}
          >
            {parsedContent}
          </Text>

          {shouldShowReadMore && (
            <TouchableOpacity
              onPress={() => setIsExpanded(!isExpanded)}
              style={styles.readMoreTouch}
              activeOpacity={0.7}
            >
              <Text style={[styles.readMore, { color: colors.primary }]}>
                {isExpanded ? 'See less' : 'See more'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Media Showcase ─────────────────────────────────────────────── */}
      {hasMedia && (
        <View style={styles.mediaContainer}>
          <Pressable
            onPress={handleDoubleTap}
            style={[
              styles.mediaFrame,
              isSingleImage
                ? { aspectRatio: imageAspectRatio }
                : styles.fixedMediaFrame,
            ]}
          >
            <View style={styles.mediaContent}>
              {isVideo ? (
                <VideoPostPlayer
                  url={post.videoUrl || post.mediaUrl!}
                  onDoubleTap={handleDoubleTap}
                />
              ) : post.images && post.images.length > 1 ? (
                <View style={styles.imageGrid}>
                  {post.images.slice(0, 4).map((uri, i) => {
                    const isExtra = i === 3 && post.images!.length > 4;
                    const extraCount = post.images!.length - 4;
                    return (
                      <View key={i} style={styles.gridImgWrap}>
                        <Image
                          source={{ uri }}
                          style={styles.gridImg}
                          contentFit="cover"
                          transition={300}
                        />
                        {isExtra && (
                          <View style={styles.extraPhotosOverlay}>
                            <Text style={styles.extraPhotosText}>+{extraCount}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Image
                  source={{ uri: mediaUri }}
                  style={styles.singleImage}
                  contentFit="cover"
                  transition={300}
                  onLoad={(event) => {
                    const { width, height } = event.source;
                    if (width > 0 && height > 0) {
                      const ratio = width / height;
                      // Clamped ratio between 0.8 and 1.9 for balanced layout
                      setImageAspectRatio(Math.max(0.8, Math.min(1.85, ratio)));
                    }
                  }}
                />
              )}

              {/* Bottom scrim gradient on image */}
              {!isVideo && !isSingleImage && (
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.3)']}
                  style={styles.mediaGradient}
                  pointerEvents="none"
                />
              )}
            </View>

            {/* Double-tap heart animation with backdrop glow */}
            <Animated.View style={[styles.heartOverlay, heartStyle]} pointerEvents="none">
              <View style={styles.heartGlow}>
                <Ionicons name="heart" size={82} color="#FFF" />
              </View>
            </Animated.View>
          </Pressable>
        </View>
      )}

      {/* ── Subtle Divider ──────────────────────────────────────────────── */}
      <View style={[styles.divider, { backgroundColor: subtleDividerColor }]} />

      {/* ── Reaction Bar (Footer) ───────────────────────────────────────── */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <ActionBtn
            icon={isLiked ? 'heart' : 'heart-outline'}
            count={likesCount}
            active={isLiked}
            activeColor={LIKE_RED}
            defaultColor={iconDefaultColor}
            onPress={handleLike}
          />
          <ActionBtn
            icon="chatbubble-outline"
            count={post.commentsCount}
            defaultColor={iconDefaultColor}
            onPress={handleComment}
          />
          <ActionBtn
            icon="paper-plane-outline"
            defaultColor={iconDefaultColor}
            onPress={handleShare}
          />
        </View>

        <ActionBtn
          icon={isBookmarked ? 'bookmark' : 'bookmark-outline'}
          active={isBookmarked}
          activeColor={colors.secondary || '#E65100'}
          defaultColor={iconDefaultColor}
          onPress={handleSave}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    borderRadius: 18,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 11,
  },
  avatarWrap: {
    position: 'relative',
  },
  authorBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    borderRadius: 10,
    borderWidth: 2,
    overflow: 'hidden',
  },
  headerMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nameTouchable: {
    flexShrink: 1,
  },
  displayName: {
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  communityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  communityPillText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  authorName: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  metaDot: {
    fontSize: 12,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '400',
  },
  moreBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Dropdown Menu ─────────────────────────────────────────────────────────
  dropdown: {
    position: 'absolute',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 3,
    minWidth: 135,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10 },
      android: { elevation: 6 },
    }),
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  dropdownIconBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dropdownDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },

  // ── Content ───────────────────────────────────────────────────────────────
  content: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  tagChip: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  bodyText: {
    fontSize: 14.5,
    lineHeight: 21.5,
    fontWeight: '400',
    letterSpacing: -0.15,
  },
  hashtagText: {
    fontWeight: '700',
  },
  mentionText: {
    fontWeight: '600',
  },
  readMoreTouch: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingVertical: 2,
  },
  readMore: {
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Media ─────────────────────────────────────────────────────────────────
  mediaContainer: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  mediaFrame: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  fixedMediaFrame: {
    height: MEDIA_HEIGHT,
  },
  mediaContent: {
    ...StyleSheet.absoluteFill,
  },
  singleImage: {
    width: '100%',
    height: '100%',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    height: MEDIA_HEIGHT,
    gap: 3,
  },
  gridImgWrap: {
    flex: 1,
    minWidth: '48%',
    position: 'relative',
  },
  gridImg: {
    width: '100%',
    height: '100%',
  },
  extraPhotosOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraPhotosText: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
  },
  mediaGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  heartOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartGlow: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: 'rgba(255,59,48,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },

  // ── Divider ───────────────────────────────────────────────────────────────
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    marginTop: 2,
  },

  // ── Reaction Bar (Footer) ─────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  actionIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCount: {
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});

export default PostCard;
