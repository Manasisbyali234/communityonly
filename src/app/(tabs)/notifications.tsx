import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import {
  useNotificationsQuery,
  useMarkAllReadMutation,
  useMarkReadMutation,
  useNotificationSocket,
} from '../../api/chat';
import { useAcceptConnectionMutation, useRejectConnectionMutation } from '../../api/connections';
import { useApproveMemberMutation, useRejectMemberMutation } from '../../api/community';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import Skeleton from '../../components/feedback/Skeleton';
import { Ionicons } from '@expo/vector-icons';
import { useToastStore } from '../../store/toastStore';

type FilterTab = 'ALL' | 'UNREAD' | 'REQUESTS';
type IconCfg = { name: any; color: string; bg: string };

const ICON_MAP: Record<string, IconCfg> = {
  LIKE:                { name: 'heart',           color: '#EF4444', bg: '#FEE2E2' },
  COMMENT:             { name: 'chatbubble',       color: '#3B82F6', bg: '#DBEAFE' },
  FOLLOW:              { name: 'person-add',       color: '#6366F1', bg: '#E0E7FF' },
  MENTION:             { name: 'at',              color: '#F59E0B', bg: '#FEF3C7' },
  MESSAGE:             { name: 'chatbubbles',      color: '#10B981', bg: '#D1FAE5' },
  STORY_REPLY:         { name: 'arrow-undo',       color: '#8B5CF6', bg: '#EDE9FE' },
  STORY_LIKE:          { name: 'heart-circle',     color: '#EC4899', bg: '#FCE7F3' },
  POST_SHARE:          { name: 'share-social',     color: '#14B8A6', bg: '#CCFBF1' },
  COMMUNITY_JOIN:      { name: 'people',           color: '#8B5CF6', bg: '#EDE9FE' },
  COMMUNITY_INVITE:    { name: 'mail',             color: '#F97316', bg: '#FFEDD5' },
  EVENT_REMINDER:      { name: 'calendar',         color: '#0284C7', bg: '#E0F2FE' },
  CONNECTION_REQUEST:  { name: 'people',           color: '#2563EB', bg: '#DBEAFE' },
  CONNECTION_ACCEPTED: { name: 'checkmark-circle', color: '#16A34A', bg: '#DCFCE7' },
};

const formatTime = (createdAt: string) => {
  const diff = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const showToast = useToastStore((s) => s.showToast);

  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');
  const [handled, setHandled] = useState<Record<string, string>>({});
  const tappedRef = useRef<Set<string>>(new Set());

  const { data: notifications = [], isLoading } = useNotificationsQuery();
  const markAllRead = useMarkAllReadMutation();
  const markRead = useMarkReadMutation();
  const acceptConn = useAcceptConnectionMutation();
  const rejectConn = useRejectConnectionMutation();
  const approveMember = useApproveMemberMutation();
  const rejectMember = useRejectMemberMutation();
  useNotificationSocket();

  const NON_CLICKABLE_TYPES = useMemo(() => new Set([
    'MATRIMONY_APPROVED', 'MATRIMONY_REJECTED', 'PROFILE_APPROVED', 'PROFILE_REJECTED',
    'ACCOUNT_VERIFIED', 'SYSTEM', 'ANNOUNCEMENT',
  ]), []);

  const unreadCount = useMemo(
    () => notifications.filter((n: any) => !n.isRead).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'UNREAD') {
      return notifications.filter((n: any) => !n.isRead);
    }
    if (activeFilter === 'REQUESTS') {
      return notifications.filter((n: any) =>
        n.type === 'CONNECTION_REQUEST' || (n.type === 'COMMUNITY_JOIN' && n.entityId && n.actorId)
      );
    }
    return notifications;
  }, [notifications, activeFilter]);

  const handleNotificationPress = useCallback((item: any) => {
    if (NON_CLICKABLE_TYPES.has(item.type)) {
      if (!item.isRead) markRead.mutate(item.id);
      return;
    }
    if (tappedRef.current.has(item.id)) return;
    tappedRef.current.add(item.id);
    setTimeout(() => tappedRef.current.delete(item.id), 1000);

    if (!item.isRead) markRead.mutate(item.id);

    const id = item.entityId;
    const actorId = item.actorId;
    const resolvePostId = () => item.postId || (item.entityType === 'POST' ? item.entityId : null) || item.entityId;

    switch (item.type) {
      case 'LIKE':
      case 'POST_SHARE': {
        const postId = resolvePostId();
        if (postId) router.push(`/(tabs)/post/${postId}` as any);
        break;
      }
      case 'COMMENT':
      case 'MENTION': {
        const postId = item.postId || (item.entityType === 'Post' ? item.entityId : null) || item.entityId;
        if (postId) router.push(`/(tabs)/post/${postId}` as any);
        break;
      }
      case 'FOLLOW':
      case 'CONNECTION_ACCEPTED':
        if (actorId) router.push(`/(tabs)/user/${actorId}` as any);
        break;
      case 'MESSAGE': {
        const conversationId = item.conversationId || (item.entityType === 'CONVERSATION' ? id : null);
        if (conversationId) router.push(`/chat/${conversationId}` as any);
        else if (actorId) router.push(`/chat/new?participantId=${actorId}` as any);
        break;
      }
      case 'COMMUNITY_INVITE':
        if (id) router.push(`/(tabs)/community/${id}` as any);
        break;
      case 'EVENT_REMINDER':
      case 'EVENT_INTERESTED':
      case 'EVENT_LIKE':
      case 'EVENT_COMMENT':
      case 'EVENT_APPROVED':
      case 'EVENT_REJECTED':
        if (id) router.push(`/(tabs)/explore?tab=events&eventId=${id}` as any);
        break;
      case 'STORY_REPLY':
      case 'STORY_LIKE':
        if (id) router.push(`/story/${id}` as any);
        break;
      default:
        break;
    }
  }, [router, markRead, NON_CLICKABLE_TYPES]);

  const handleActorPress = useCallback((item: any) => {
    if (!item.actorId) return;
    if (!item.isRead) markRead.mutate(item.id);
    router.push(`/(tabs)/user/${item.actorId}` as any);
  }, [router, markRead]);

  const renderItem = ({ item }: { item: any }) => {
    const isConnRequest = item.type === 'CONNECTION_REQUEST';
    const isCommunityJoinRequest = item.type === 'COMMUNITY_JOIN' && item.entityId && item.actorId;
    const handledStatus = handled[item.id];
    const isActionable = isConnRequest || isCommunityJoinRequest;
    const actorName = item.actor?.displayName;
    const cfg = ICON_MAP[item.type] ?? ICON_MAP.COMMUNITY_JOIN;

    const body = actorName && item.body?.startsWith(actorName)
      ? item.body.slice(actorName.length).replace(/^[\s:,-]+/, '')
      : item.body;

    const isUnread = !item.isRead;

    return (
      <View style={styles.rowContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.notificationCard,
            {
              backgroundColor: isUnread
                ? (isDark ? 'rgba(30, 41, 59, 0.65)' : 'rgba(238, 242, 255, 0.65)')
                : colors.surface,
              borderColor: isUnread ? colors.primary + '30' : colors.border,
              opacity: pressed && !isActionable ? 0.88 : 1,
            },
          ]}
          onPress={() => !isActionable && handleNotificationPress(item)}
          disabled={NON_CLICKABLE_TYPES.has(item.type)}
        >
          {/* Avatar & Icon Overlay */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleActorPress(item)}
            style={styles.avatarWrapper}
          >
            <Avatar url={item.actor?.avatarUrl} name={item.actor?.displayName ?? '?'} size={46} />
            <View
              style={[
                styles.badgeCircle,
                {
                  backgroundColor: isDark ? '#1E293B' : cfg.bg,
                  borderColor: isUnread ? (isDark ? '#0F172A' : '#EEF2FF') : colors.surface,
                },
              ]}
            >
              <Ionicons name={cfg.name} size={11} color={cfg.color} />
            </View>
          </TouchableOpacity>

          {/* Details & Actions */}
          <View style={styles.cardContent}>
            <View style={styles.contentHeader}>
              <Text style={[styles.bodyText, { color: colors.text }]} numberOfLines={3}>
                {item.actor ? (
                  <>
                    <Text
                      style={[styles.actorHighlight, { color: colors.text }]}
                      onPress={() => handleActorPress(item)}
                    >
                      {item.actor.displayName}
                    </Text>
                    {body ? ` ${body}` : ''}
                  </>
                ) : (
                  body ?? ''
                )}
              </Text>
              {isUnread && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
            </View>

            <Text style={[styles.timestamp, { color: colors.textMuted }]}>
              {formatTime(item.createdAt)}
            </Text>

            {/* Connection Request Flow */}
            {isConnRequest && item.entityId && (
              handledStatus ? (
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: handledStatus === 'accepted' ? '#DCFCE7' : '#FEE2E2',
                    },
                  ]}
                >
                  <Ionicons
                    name={handledStatus === 'accepted' ? 'checkmark-circle' : 'close-circle'}
                    size={13}
                    color={handledStatus === 'accepted' ? '#16A34A' : '#DC2626'}
                  />
                  <Text
                    style={[
                      styles.statusPillText,
                      { color: handledStatus === 'accepted' ? '#16A34A' : '#DC2626' },
                    ]}
                  >
                    {handledStatus === 'accepted' ? 'Connection Accepted' : 'Request Declined'}
                  </Text>
                </View>
              ) : (
                <View style={styles.actionGroup}>
                  <Button
                    title="Accept"
                    variant="primary"
                    size="sm"
                    loading={acceptConn.isPending}
                    disabled={rejectConn.isPending}
                    onPress={() =>
                      acceptConn.mutate(item.entityId, {
                        onSuccess: () => {
                          setHandled((h) => ({ ...h, [item.id]: 'accepted' }));
                        },
                        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed', 'error'),
                      })
                    }
                  />
                  <Button
                    title="Decline"
                    variant="secondary"
                    size="sm"
                    loading={rejectConn.isPending}
                    disabled={acceptConn.isPending}
                    onPress={() =>
                      rejectConn.mutate(item.entityId, {
                        onSuccess: () => {
                          setHandled((h) => ({ ...h, [item.id]: 'rejected' }));
                        },
                        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed', 'error'),
                      })
                    }
                  />
                </View>
              )
            )}

            {/* Community Join Request Flow */}
            {isCommunityJoinRequest && (
              handledStatus ? (
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: handledStatus === 'approved' ? '#DCFCE7' : '#FEE2E2',
                    },
                  ]}
                >
                  <Ionicons
                    name={handledStatus === 'approved' ? 'checkmark-circle' : 'close-circle'}
                    size={13}
                    color={handledStatus === 'approved' ? '#16A34A' : '#DC2626'}
                  />
                  <Text
                    style={[
                      styles.statusPillText,
                      { color: handledStatus === 'approved' ? '#16A34A' : '#DC2626' },
                    ]}
                  >
                    {handledStatus === 'approved' ? 'Member Approved' : 'Request Declined'}
                  </Text>
                </View>
              ) : (
                <View style={styles.actionGroup}>
                  <Button
                    title="Approve"
                    variant="primary"
                    size="sm"
                    loading={approveMember.isPending}
                    disabled={rejectMember.isPending}
                    onPress={() =>
                      approveMember.mutate(
                        { communityId: item.entityId, userId: item.actorId },
                        {
                          onSuccess: () => {
                            setHandled((h) => ({ ...h, [item.id]: 'approved' }));
                          },
                          onError: (e: any) => showToast(e?.response?.data?.message || 'Failed', 'error'),
                        }
                      )
                    }
                  />
                  <Button
                    title="Decline"
                    variant="secondary"
                    size="sm"
                    loading={rejectMember.isPending}
                    disabled={approveMember.isPending}
                    onPress={() =>
                      rejectMember.mutate(
                        { communityId: item.entityId, userId: item.actorId },
                        {
                          onSuccess: () => {
                            setHandled((h) => ({ ...h, [item.id]: 'rejected' }));
                          },
                          onError: (e: any) => showToast(e?.response?.data?.message || 'Failed', 'error'),
                        }
                      )
                    }
                  />
                </View>
              )
            )}
          </View>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* App Bar */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          style={[
            styles.iconBtn,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
          ]}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.iconBtn,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
          ]}
          activeOpacity={0.7}
          onPress={() =>
            markAllRead.mutate(undefined, {
              onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to mark read', 'error'),
            })
          }
        >
          <Ionicons name="checkmark-done-sharp" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Segmented Filter Pills */}
      <View style={[styles.filterBar, { borderBottomColor: colors.border }]}>
        {(['ALL', 'UNREAD', 'REQUESTS'] as FilterTab[]).map((tab) => {
          const active = activeFilter === tab;
          const label = tab === 'ALL' ? 'All' : tab === 'UNREAD' ? 'Unread' : 'Requests';
          return (
            <TouchableOpacity
              key={tab}
              style={[
                styles.filterPill,
                active
                  ? [styles.filterPillActive, { backgroundColor: colors.primary }]
                  : [
                      styles.filterPillInactive,
                      {
                        backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                        borderColor: 'transparent',
                      },
                    ],
              ]}
              onPress={() => setActiveFilter(tab)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: active ? '#FFF' : colors.textMuted, fontWeight: active ? '700' : '600' },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Main List / Skeleton / Empty */}
      {isLoading ? (
        <View style={styles.skeletonContainer}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View
              key={i}
              style={[
                styles.skeletonCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Skeleton width={46} height={46} borderRadius={23} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Skeleton width="80%" height={14} style={{ marginBottom: 8, borderRadius: 4 }} />
                <Skeleton width="35%" height={10} style={{ borderRadius: 4 }} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <View
                style={[
                  styles.emptyIconBox,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' },
                ]}
              >
                <Ionicons name="notifications-off-outline" size={40} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {activeFilter === 'ALL'
                  ? 'No notifications yet'
                  : activeFilter === 'UNREAD'
                  ? 'No unread notifications'
                  : 'No pending requests'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                We'll notify you as soon as there are new updates, mentions, or connection requests.
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header Bar
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  unreadBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Filters Bar
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  filterPillActive: {},
  filterPillInactive: {},
  filterText: {
    fontSize: 12.5,
  },

  // List & Cards
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 8,
  },
  rowContainer: {
    borderRadius: 16,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1.5,
      },
    }),
  },
  avatarWrapper: {
    position: 'relative',
  },
  badgeCircle: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 6,
  },
  bodyText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: '400',
  },
  actorHighlight: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginTop: 6,
  },
  timestamp: {
    fontSize: 11.5,
    marginTop: 4,
    fontWeight: '500',
  },

  // Action Buttons & Status Badges
  actionGroup: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  primaryActionBtn: {
    paddingHorizontal: 16,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 76,
  },
  primaryActionText: {
    color: '#FFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    paddingHorizontal: 16,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 76,
  },
  secondaryActionText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  statusPillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },

  // Skeletons & Empty States
  skeletonContainer: {
    padding: 16,
    gap: 8,
  },
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: 32,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});