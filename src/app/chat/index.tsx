import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  TextInput, ScrollView, Platform, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useChatsQuery, useChatSocket, useUnreadChatCountQuery } from '../../api/chat';
import { useConnectionsListQuery } from '../../api/connections';
import { useAuthStore } from '../../store/authStore';
import Avatar from '../../components/common/Avatar';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Conversation } from '../../types';

type ChatTab = 'all' | 'unread' | 'groups';

export default function ChatListScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const currentUserId = useAuthStore((s) => s.user?.id);

  // Real backend chat socket listener
  useChatSocket();

  // Real backend queries
  const { data: serverChats = [], isLoading, isRefetching, refetch } = useChatsQuery();
  const { data: serverUnreadCount } = useUnreadChatCountQuery();
  const { data: myConnections = [] } = useConnectionsListQuery(currentUserId || '');

  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState<ChatTab>('all');

  // Real conversations from backend
  const conversations = useMemo(() => {
    return serverChats;
  }, [serverChats]);

  // Real unread calculation
  const totalUnread = useMemo(() => {
    if (typeof serverUnreadCount === 'number') return serverUnreadCount;
    return conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  }, [serverUnreadCount, conversations]);

  // Real active / connected contacts
  const activeContacts = useMemo(() => {
    const fromChats = conversations
      .map((c) => c.participant)
      .filter((p): p is NonNullable<typeof p> => !!p);

    const fromConn = (myConnections || []).map((cn: any) => cn.user || cn).filter(Boolean);

    const map = new Map<string, any>();
    [...fromChats, ...fromConn].forEach((u) => {
      if (u.id && u.id !== currentUserId && !map.has(u.id)) {
        map.set(u.id, u);
      }
    });

    return Array.from(map.values());
  }, [conversations, myConnections, currentUserId]);

  const filteredChats = useMemo(() => {
    return conversations.filter((c: Conversation) => {
      if (activeTab === 'unread' && (c.unreadCount || 0) <= 0) return false;
      if (activeTab === 'groups') {
        const name = (c.participant?.displayName || '').toLowerCase();
        if (!name.includes('sangha') && !name.includes('group') && !name.includes('community')) {
          return false;
        }
      }

      if (!searchText.trim()) return true;
      const q = searchText.toLowerCase();
      const name = (c.participant?.displayName || c.participant?.username || '').toLowerCase();
      const lastMsg = (c.lastMessage?.content || '').toLowerCase();
      return name.includes(q) || lastMsg.includes(q);
    });
  }, [conversations, activeTab, searchText]);

  const formatMsgTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m`;
      if (diffHours < 24) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      const isYesterday = now.getDate() - date.getDate() === 1;
      if (isYesterday) return 'Yesterday';
      return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const renderChatItem = (item: Conversation) => {
    const isUnread = (item.unreadCount || 0) > 0;
    const timeStr = formatMsgTime(item.lastMessage?.createdAt || item.lastMessageAt);
    const isSentByMe = item.lastMessage?.senderId === currentUserId;
    const isGroup = item.participant?.displayName?.toLowerCase().includes('sangha') || item.participant?.displayName?.toLowerCase().includes('group');

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.chatCard,
          {
            backgroundColor: isUnread
              ? (isDark ? 'rgba(45,106,45,0.18)' : '#F0FDF4')
              : (isDark ? 'rgba(255,255,255,0.02)' : colors.surface),
            borderColor: isUnread
              ? (isDark ? 'rgba(45,106,45,0.4)' : '#BBF7D0')
              : (isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9'),
          },
        ]}
        activeOpacity={0.7}
        onPress={() => router.push(`/chat/${item.id}` as any)}
      >
        {/* Avatar with status */}
        <View style={styles.avatarContainer}>
          <Avatar
            url={item.participant?.avatarUrl || ''}
            name={item.participant?.displayName || item.participant?.username || 'User'}
            size={52}
            online={item.participant?.isOnline}
          />
          {isGroup && (
            <View style={styles.groupBadge}>
              <Ionicons name="people" size={10} color="#FFF" />
            </View>
          )}
        </View>

        {/* Chat Info */}
        <View style={styles.chatInfo}>
          <View style={styles.chatHeaderRow}>
            <View style={styles.nameRow}>
              <Text
                style={[
                  styles.displayName,
                  {
                    color: colors.text,
                    fontWeight: isUnread ? '800' : '700',
                  },
                ]}
                numberOfLines={1}
              >
                {item.participant?.displayName || item.participant?.username || 'Community Member'}
              </Text>
              {(item.participant as any)?.isVerified && (
                <Ionicons name="shield-checkmark" size={14} color="#16A34A" style={{ marginLeft: 3 }} />
              )}
            </View>

            <Text
              style={[
                styles.timeText,
                {
                  color: isUnread ? '#16A34A' : colors.textMuted,
                  fontWeight: isUnread ? '800' : '500',
                },
              ]}
            >
              {timeStr}
            </Text>
          </View>

          {/* Last Message Preview */}
          <View style={styles.messagePreviewRow}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {isSentByMe && (
                <Ionicons name="checkmark-done" size={15} color="#16A34A" />
              )}
              <Text
                style={[
                  styles.messagePreview,
                  {
                    color: isUnread ? colors.text : colors.textMuted,
                    fontWeight: isUnread ? '700' : '400',
                  },
                ]}
                numberOfLines={1}
              >
                {item.lastMessage?.content || 'Started a new conversation'}
              </Text>
            </View>

            {isUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>
                  {item.unreadCount! > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as any))}
          style={styles.headerBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Messages</Text>
          {totalUnread > 0 && (
            <View style={styles.headerUnreadBadge}>
              <Text style={styles.headerUnreadText}>{totalUnread} new</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.headerNewBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/chat/new' as any)}
          activeOpacity={0.85}
        >
          <Feather name="edit" size={16} color="#FFF" />
          <Text style={styles.headerNewBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={[styles.searchBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F1F5F9' }]}>
            <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Search conversations, members, or groups..."
              placeholderTextColor={colors.textMuted}
              value={searchText}
              onChangeText={setSearchText}
              style={[styles.searchInput, { color: colors.text }]}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Active / Contacts Strip (from real backend connections) */}
        {activeContacts.length > 0 && (
          <View style={styles.activeNowSection}>
            <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>COMMUNITY CONTACTS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeMembersScroll}>
              {activeContacts.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  style={styles.activeMemberItem}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/chat/new?participantId=${u.id}` as any)}
                >
                  <View style={styles.activeAvatarWrapper}>
                    <Avatar url={u.avatarUrl} name={u.displayName || u.username} size={48} />
                    {u.isOnline && <View style={styles.onlineDot} />}
                  </View>
                  <Text style={[styles.activeMemberName, { color: colors.text }]} numberOfLines={1}>
                    {u.displayName || u.username}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Category Filter Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabChip, activeTab === 'all' && { backgroundColor: colors.primary }]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabChipText, { color: activeTab === 'all' ? '#FFF' : colors.textSecondary }]}>
              All Messages
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabChip, activeTab === 'unread' && { backgroundColor: colors.primary }]}
            onPress={() => setActiveTab('unread')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Text style={[styles.tabChipText, { color: activeTab === 'unread' ? '#FFF' : colors.textSecondary }]}>
                Unread
              </Text>
              {totalUnread > 0 && (
                <View style={[styles.miniBadge, { backgroundColor: activeTab === 'unread' ? '#FFF' : colors.primary }]}>
                  <Text style={[styles.miniBadgeText, { color: activeTab === 'unread' ? colors.primary : '#FFF' }]}>
                    {totalUnread}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabChip, activeTab === 'groups' && { backgroundColor: colors.primary }]}
            onPress={() => setActiveTab('groups')}
          >
            <Text style={[styles.tabChipText, { color: activeTab === 'groups' ? '#FFF' : colors.textSecondary }]}>
              Communities & Groups
            </Text>
          </TouchableOpacity>
        </View>

        {/* Conversation List */}
        <View style={styles.chatListWrap}>
          {isLoading ? (
            /* Loading Skeletons */
            <View style={{ gap: 8 }}>
              {[1, 2, 3, 4].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.chatCard,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                      borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0',
                      opacity: 0.6,
                    },
                  ]}
                >
                  <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: isDark ? '#334155' : '#E2E8F0' }} />
                  <View style={{ flex: 1, marginLeft: 12, gap: 6 }}>
                    <View style={{ width: '45%', height: 14, borderRadius: 4, backgroundColor: isDark ? '#334155' : '#E2E8F0' }} />
                    <View style={{ width: '75%', height: 11, borderRadius: 4, backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }} />
                  </View>
                </View>
              ))}
            </View>
          ) : filteredChats.length === 0 ? (
            /* Empty State */
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }]}>
                <Ionicons name="chatbubbles-outline" size={36} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {searchText ? 'No Matching Messages' : 'No Conversations Yet'}
              </Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                {searchText
                  ? 'Try searching for another community member or keyword.'
                  : 'Start direct conversations with community members and friends.'}
              </Text>
              <TouchableOpacity
                style={[styles.startChatBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/chat/new' as any)}
                activeOpacity={0.85}
              >
                <Feather name="plus" size={15} color="#FFF" />
                <Text style={styles.startChatBtnText}>Start New Message</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredChats.map((c) => renderChatItem(c))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerUnreadBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  headerUnreadText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '800',
  },
  headerNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  headerNewBtnText: {
    color: '#FFF',
    fontSize: 12.5,
    fontWeight: '700',
  },

  // Search
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    padding: 0,
    fontSize: 13.5,
  },

  // Active Strip
  activeNowSection: {
    paddingTop: 8,
    paddingBottom: 12,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  activeMembersScroll: {
    paddingHorizontal: 16,
    gap: 14,
  },
  activeMemberItem: {
    alignItems: 'center',
    width: 58,
    gap: 4,
  },
  activeAvatarWrapper: {
    position: 'relative',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#16A34A',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  activeMemberName: {
    fontSize: 11.5,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Tabs
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 10,
  },
  tabChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  miniBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  miniBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },

  // Chat Cards List
  chatListWrap: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  avatarContainer: {
    position: 'relative',
  },
  groupBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  chatInfo: {
    flex: 1,
    marginLeft: 12,
    gap: 3,
  },
  chatHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  displayName: {
    fontSize: 14.5,
  },
  timeText: {
    fontSize: 11.5,
  },
  messagePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  messagePreview: {
    fontSize: 12.5,
    lineHeight: 16,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 12.5,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 17,
  },
  startChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    marginTop: 6,
  },
  startChatBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
