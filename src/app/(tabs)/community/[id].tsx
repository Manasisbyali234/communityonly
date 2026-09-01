import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useTheme } from '../../../theme';
import {
  useCommunityDetailsQuery,
  useJoinCommunityMutation,
  usePendingMembersQuery,
  useApproveMemberMutation,
  useRejectMemberMutation,
} from '../../../api/community';
import { useCommunityPostsQuery } from '../../../api/feed';
import { shareUrl } from '../../../utils/shareUtils';
import PostCard from '../../../components/feed/PostCard';
import CommentSheet from '../../../components/feed/CommentSheet';
import Avatar from '../../../components/common/Avatar';
import Button from '../../../components/common/Button';
import Skeleton from '../../../components/feedback/Skeleton';
import { Ionicons } from '@expo/vector-icons';
import { useToastStore } from '../../../store/toastStore';
import { useConfirmStore } from '../../../store/confirmStore';
import { FlashList as ShopifyFlashList } from '@shopify/flash-list';
const FlashList = ShopifyFlashList as any;

type TabType = 'posts' | 'rules' | 'requests';

export default function CommunityDetails() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const { colors, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleBack = () => {
    if (from === 'communities') {
      router.replace('/(tabs)/communities' as any);
    } else {
      router.replace('/(tabs)/explore?tab=communities' as any);
    }
  };
  const { width: windowWidth } = useWindowDimensions();
  const bannerHeight = Math.round(windowWidth * 0.45);
  const showToast = useToastStore((state) => state.showToast);

  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [commentSheetVisible, setCommentSheetVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const { data: community, isLoading: isDetailsLoading } = useCommunityDetailsQuery(id || '');
  const { data: posts = [], isLoading: isPostsLoading } = useCommunityPostsQuery(id || '');
  const joinMutation = useJoinCommunityMutation();

  const isAdmin = (community as any)?.memberRole === 'ADMIN';
  const isPrivate = (community as any)?.isPrivate;
  const { data: pendingMembers = [] } = usePendingMembersQuery(
    isAdmin && isPrivate ? id || '' : ''
  );
  const approveMutation = useApproveMemberMutation();
  const rejectMutation = useRejectMemberMutation();

  const confirm = useConfirmStore((s) => s.confirm);

  const handleJoinToggle = async () => {
    if (!community) return;
    const memberStatus = (community as any).memberStatus;
    if (memberStatus === 'PENDING') return;

    if (community.isJoined) {
      const ok = await confirm({
        title: 'Leave community?',
        message: 'You will no longer be a member of this community.',
        confirmText: 'Leave',
        cancelText: 'Cancel',
        isDestructive: true,
        icon: 'exit-outline',
      });
      if (!ok) return;
    } else {
      const ok = await confirm({
        title: isPrivate ? 'Request to join?' : 'Join community?',
        message: isPrivate ? 'Your request will be sent to the community admins for approval.' : `You will become a member of ${community.name}.`,
        confirmText: isPrivate ? 'Request' : 'Join',
        cancelText: 'Cancel',
        isDestructive: false,
        icon: isPrivate ? 'lock-closed-outline' : 'people-outline',
      });
      if (!ok) return;
    }

    joinMutation.mutate({ communityId: community.id, isJoined: community.isJoined ?? false });
  };

  const handleShare = async () => {
    if (!community) return;
    const base =
      Platform.OS === 'web' && typeof window !== 'undefined' && window.location
        ? `${window.location.protocol}//${window.location.host}`
        : '';
    const link = `${base}/community/${community.id}`;
    const ok = await shareUrl(
      `Check out the ${community.name} community on GowdaCommunity! ${link}`,
      link
    );
    showToast(ok ? 'Link copied to clipboard!' : 'Could not share community', ok ? 'success' : 'error');
  };

  const handleCommentPress = (postId: string) => {
    setSelectedPostId(postId);
    setCommentSheetVisible(true);
  };

  if (isDetailsLoading || !community) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const communityStatus = (community as any).status;
  const isApproved = !communityStatus || communityStatus === 'APPROVED';
  const showJoinAction = isApproved && (community as any).memberRole !== 'ADMIN';

  // Responsive horizontal padding: 16px on small screens, 20px on wider
  const hPad = windowWidth < 360 ? 12 : windowWidth < 480 ? 16 : 20;

  const renderHeader = () => (
    <View style={styles.detailsHeader}>
      {/* Banner */}
      <View style={[styles.bannerContainer, { height: bannerHeight }]}>
        <Image source={{ uri: community.bannerUrl }} style={styles.banner} contentFit="cover" />
        <TouchableOpacity
          onPress={handleBack}
          style={[styles.iconBtn, { top: insets.top + 10, left: 14 }]}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleShare}
          style={[styles.iconBtn, { top: insets.top + 10, right: 14 }]}
        >
          <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Info section */}
      <View style={[styles.infoContainer, { paddingHorizontal: hPad }]}>
        {/* Pending/Rejected banner */}
        {!isApproved && (
          <View style={styles.pendingBanner}>
            <Ionicons name="time-outline" size={16} color="#f59e0b" style={{ marginRight: 8, flexShrink: 0 }} />
            <Text style={styles.pendingText}>
              {communityStatus === 'REJECTED'
                ? 'This community request was rejected by admin.'
                : 'This community is pending admin approval. Posts cannot be created until approved.'}
            </Text>
          </View>
        )}

        {/* Avatar row */}
        <View style={styles.avatarRow}>
          <View style={[styles.avatarBox, { borderColor: colors.background }]}>
            <Avatar url={community.avatarUrl} name={community.name} size={60} />
          </View>
          <View style={[styles.membershipLabel, { backgroundColor: colors.primaryContainer }]}>
            <Ionicons name={community.isJoined ? 'checkmark-circle' : isPrivate ? 'lock-closed-outline' : 'globe-outline'} size={14} color={colors.primary} />
            <Text style={[styles.membershipLabelText, { color: colors.primary }]}>
              {community.isJoined ? 'Member' : isPrivate ? 'Private community' : 'Open community'}
            </Text>
          </View>
        </View>

        {/* Name */}
        <Text
          style={[
            styles.name,
            {
              color: colors.text,
              fontSize: windowWidth < 360 ? 18 : typography.sizes.xxl,
              fontWeight: typography.weights.bold,
            },
          ]}
          numberOfLines={2}
        >
          {community.name}
        </Text>

        {/* Category badge */}
        <View style={styles.categoryBadge}>
          <Text
            style={[styles.categoryText, { color: colors.primary, fontSize: typography.sizes.xs }]}
            numberOfLines={1}
          >
            {community.category}
          </Text>
        </View>

        {/* Description */}
        <Text
          style={[
            styles.description,
            { color: colors.textSecondary, fontSize: typography.sizes.sm },
          ]}
        >
          {community.description}
        </Text>

        {/* Stats row */}
        <TouchableOpacity
          onPress={() => router.push(`/community/${community.id}/members`)}
          style={[styles.statsRow, { borderBottomColor: colors.borderSecondary }]}
          activeOpacity={0.7}
        >
          <Ionicons name="people-outline" size={16} color={colors.textSecondary} style={{ flexShrink: 0 }} />
          <Text
            style={[styles.statsText, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}
            numberOfLines={1}
          >
            <Text style={{ fontWeight: 'bold', color: colors.text }}>
              {(community.membersCount || 0).toLocaleString()}
            </Text>
            {' members • View active list'}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={{ flexShrink: 0 }} />
        </TouchableOpacity>

        {/* Tabs */}
        <View style={[styles.tabsBar, { borderBottomColor: colors.borderSecondary }]}>
          {(['posts', 'rules'] as TabType[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tab,
                activeTab === tab && { borderBottomColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: activeTab === tab ? colors.text : colors.textSecondary,
                    fontSize: typography.sizes.sm,
                    fontWeight: activeTab === tab ? '700' : '500',
                  },
                ]}
              >
                {tab === 'posts' ? 'Feed Posts' : 'Rules'}
              </Text>
            </TouchableOpacity>
          ))}

          {isAdmin && isPrivate && (
            <TouchableOpacity
              onPress={() => setActiveTab('requests')}
              style={[
                styles.tab,
                activeTab === 'requests' && { borderBottomColor: colors.primary },
              ]}
            >
              <View style={styles.tabWithBadge}>
                <Text
                  style={[
                    styles.tabText,
                    {
                      color: activeTab === 'requests' ? colors.text : colors.textSecondary,
                      fontSize: typography.sizes.sm,
                      fontWeight: activeTab === 'requests' ? '700' : '500',
                    },
                  ]}
                >
                  Requests
                </Text>
                {pendingMembers.length > 0 && (
                  <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.badgeText}>{pendingMembers.length}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {activeTab === 'requests' ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: showJoinAction ? 108 : 40 }}>
          {renderHeader()}
          <View style={{ paddingHorizontal: hPad, paddingVertical: 20 }}>
            <Text
              style={{
                color: colors.text,
                fontSize: typography.sizes.md,
                fontWeight: '700',
                marginBottom: 16,
              }}
            >
              Join Requests ({pendingMembers.length})
            </Text>
            {pendingMembers.length === 0 ? (
              <Text style={{ color: colors.textMuted, fontSize: typography.sizes.sm }}>
                No pending requests.
              </Text>
            ) : (
              pendingMembers.map((member: any) => (
                <View
                  key={member.id}
                  style={[
                    styles.requestRow,
                    { backgroundColor: colors.cardBg, borderColor: colors.border },
                  ]}
                >
                  <Avatar url={member.avatarUrl} name={member.displayName} size={40} />
                  <View style={styles.requestInfo}>
                    <Text
                      style={{ color: colors.text, fontWeight: '600', fontSize: typography.sizes.sm }}
                      numberOfLines={1}
                    >
                      {member.displayName}
                    </Text>
                    <Text
                      style={{ color: colors.textMuted, fontSize: typography.sizes.xs }}
                      numberOfLines={1}
                    >
                      @{member.username}
                    </Text>
                  </View>
                  <Button
                    title="Reject"
                    variant="secondary"
                    size="sm"
                    loading={rejectMutation.isPending}
                    onPress={() =>
                      rejectMutation.mutate({ communityId: id!, userId: member.id })
                    }
                    style={{ marginRight: 8 }}
                  />
                  <Button
                    title="Approve"
                    variant="primary"
                    size="sm"
                    loading={approveMutation.isPending}
                    onPress={() =>
                      approveMutation.mutate({ communityId: id!, userId: member.id })
                    }
                  />
                </View>
              ))
            )}
          </View>
        </ScrollView>
      ) : activeTab === 'posts' ? (
        isPostsLoading ? (
          <ScrollView showsVerticalScrollIndicator={false}>
            {renderHeader()}
            <View style={{ padding: hPad }}>
              <Skeleton width="100%" height={150} borderRadius={12} style={{ marginBottom: 12 }} />
              <Skeleton width="100%" height={150} borderRadius={12} />
            </View>
          </ScrollView>
        ) : (
          <FlashList
            data={posts}
            renderItem={({ item }: { item: any }) => (
              <PostCard post={item} onCommentPress={handleCommentPress} />
            )}
            estimatedItemSize={400}
            ListHeaderComponent={() => (
              <>
                {renderHeader()}
                {community.feedPostPrompts && community.feedPostPrompts.length > 0 && (
                  <View style={{ paddingHorizontal: hPad, paddingTop: 12, paddingBottom: 4 }}>
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: typography.sizes.xs,
                        fontWeight: '700',
                        marginBottom: 8,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}
                    >
                      Feed Post Prompts
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {community.feedPostPrompts.map((prompt: string, idx: number) => (
                        <View
                          key={idx}
                          style={{
                            backgroundColor: colors.inputBg,
                            borderRadius: 20,
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            marginRight: 8,
                            borderWidth: 1,
                            borderColor: colors.border,
                          }}
                        >
                          <Text style={{ color: colors.text, fontSize: typography.sizes.sm }}>
                            {prompt}
                          </Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </>
            )}
            contentContainerStyle={{ paddingBottom: showJoinAction ? 108 : 40 }}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: showJoinAction ? 108 : 40 }}>
          {renderHeader()}
          <View style={[styles.rulesContainer, { paddingHorizontal: hPad }]}>
            {(!community.rules || community.rules.length === 0) && (
              <Text style={{ color: colors.textMuted, fontSize: typography.sizes.sm, fontWeight: '500' }}>
                No rules added yet.
              </Text>
            )}
            {community.rules?.map((rule: any, idx: number) => {
              const title = typeof rule === 'string' ? rule : rule.title;
              const desc = typeof rule === 'object' ? rule.description : undefined;
              return (
                <View
                  key={idx}
                  style={[styles.ruleRow, { borderBottomColor: colors.borderSecondary }]}
                >
                  <View style={[styles.ruleNum, { backgroundColor: colors.inputBg }]}>
                    <Text style={{ color: colors.text, fontWeight: 'bold' }}>{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={[styles.ruleText, { color: colors.text, fontSize: typography.sizes.md }]}
                    >
                      {title}
                    </Text>
                    {!!desc && (
                      <Text
                        style={{ color: colors.textSecondary, fontSize: typography.sizes.sm, marginTop: 2 }}
                      >
                        {desc}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {showJoinAction && (
        <View style={[styles.stickyAction, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Button
            title={community.isJoined ? 'Leave Community' : (community as any).memberStatus === 'PENDING' ? 'Join Request Pending' : isPrivate ? 'Request to Join' : 'Join Community'}
            icon={community.isJoined ? 'log-out-outline' : (community as any).memberStatus === 'PENDING' ? 'time-outline' : 'add'}
            variant={community.isJoined ? 'destructive-subtle' : (community as any).memberStatus === 'PENDING' ? 'secondary' : 'primary'}
            size="lg"
            fullWidth
            loading={joinMutation.isPending}
            onPress={handleJoinToggle}
            disabled={(community as any).memberStatus === 'PENDING' || joinMutation.isPending}
          />
        </View>
      )}

      <CommentSheet
        postId={selectedPostId}
        visible={commentSheetVisible}
        onClose={() => setCommentSheetVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsHeader: {
    width: '100%',
  },
  bannerContainer: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  banner: {
    width: '100%',
    height: '100%',
  },
  iconBtn: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    marginTop: -28,
  },
  pendingBanner: {
    backgroundColor: '#fffbeb',
    borderColor: '#fcd34d',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  pendingText: {
    color: '#92400e',
    fontSize: 13,
    flex: 1,
    flexWrap: 'wrap',
    lineHeight: 18,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  avatarBox: {
    borderWidth: 3,
    borderRadius: 34,
    overflow: 'hidden',
  },
  membershipLabel: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, maxWidth: '68%' },
  membershipLabelText: { fontSize: 12, fontWeight: '700', flexShrink: 1 },
  name: {
    marginTop: 4,
    flexShrink: 1,
  },
  stickyAction: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingTop: 12 },
  stickyJoinBtn: { width: '100%', minHeight: 46, borderRadius: 12 },
  categoryBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    maxWidth: '100%',
  },
  categoryText: {
    fontWeight: '700',
  },
  description: {
    marginTop: 10,
    lineHeight: 20,
    flexShrink: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    marginTop: 12,
    gap: 6,
  },
  statsText: {
    flex: 1,
    fontWeight: '500',
    flexShrink: 1,
  },
  tabsBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginTop: 8,
    flexWrap: 'nowrap',
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    marginRight: 16,
  },
  tabText: {},
  tabWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badge: {
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  rulesContainer: {
    paddingVertical: 20,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  ruleNum: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    flexShrink: 0,
  },
  ruleText: {
    fontWeight: '500',
    flexWrap: 'wrap',
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  requestInfo: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
