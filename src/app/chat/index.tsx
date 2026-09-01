import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  TextInput, ScrollView, Platform, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';
import { useChatsQuery, useChatSocket, useUnreadChatCountQuery } from '../../api/chat';
import { useConnectionsListQuery } from '../../api/connections';
import { useAuthStore } from '../../store/authStore';
import Avatar from '../../components/common/Avatar';
import { Ionicons } from '@expo/vector-icons';
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

  const G = colors.primary;
  const BG = colors.background;
  const SURF = colors.surface;
  const BORDER = colors.border;
  const TEXT = colors.text;
  const TEXT2 = colors.textSecondary;
  const TEXT3 = colors.textMuted;

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
              ? (isDark ? 'rgba(22, 163, 74, 0.12)' : '#F0FDF4')
              : SURF,
            borderColor: isUnread
              ? (isDark ? 'rgba(22, 163, 74, 0.35)' : '#BBF7D0')
              : BORDER,
          },
        ]}
        activeOpacity={0.75}
        onPress={() => router.push(`/chat/${item.id}` as any)}
      >
        {/* Avatar with status indicator */}
        <View style={styles.avatarContainer}>
          <Avatar
            url={item.participant?.avatarUrl || ''}
            name={item.participant?.displayName || item.participant?.username || 'User'}
            size={50}
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
                    color: TEXT,
                    fontWeight: isUnread ? '800' : '700',
                  },
                ]}
                numberOfLines={1}
              >
                {item.participant?.displayName || item.participant?.username || 'Community Member'}
              </Text>
              {(item.participant as any)?.isVerified && (
                <Ionicons name="shield-checkmark" size={14} color="#16A34A" style={{ marginLeft: 4 }} />
              )}
            </View>

            <Text
              style={[
                styles.timeText,
                {
                  color: isUnread ? '#16A34A' : TEXT3,
                  fontWeight: isUnread ? '700' : '500',
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
                    color: isUnread ? TEXT : TEXT3,
                    fontWeight: isUnread ? '600' : '400',
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
    <View style={[styles.container, { backgroundColor: BG, paddingTop: insets.top }]}>
      {/* ── Header ────────────────────────────────────────────── */}
      <View style={[styles.header, { backgroundColor: SURF, borderBottomColor: BORDER }]}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as any))}
          style={[styles.headerBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.primaryContainer }]}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={G} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: TEXT }]}>Messages</Text>
          {totalUnread > 0 && (
            <View style={styles.headerUnreadBadge}>
              <Text style={styles.headerUnreadText}>{totalUnread} new</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.headerNewBtn, { backgroundColor: G }]}
          onPress={() => router.push('/chat/new' as any)}
          activeOpacity={0.85}
        >
          <Ionicons name="create-outline" size={16} color="#FFF" />
          <Text style={styles.headerNewBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={G} />
        }
      >
        {/* ── Search Bar ────────────────────────────────────────── */}
        <View style={styles.searchSection}>
          <View style={[styles.searchBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9', borderColor: BORDER }]}>
            <Ionicons name="search" size={17} color={TEXT3} style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Search conversations, members, or groups..."
              placeholderTextColor={TEXT3}
              value={searchText}
              onChangeText={setSearchText}
              style={[styles.searchInput, { color: TEXT }]}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={17} color={TEXT3} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Active / Connected Community Contacts ─────────────── */}
        {activeContacts.length > 0 && (
          <View style={styles.activeNowSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionHeading, { color: TEXT3 }]}>COMMUNITY CONTACTS</Text>
              <View style={[styles.contactCountBadge, { backgroundColor: isDark ? colors.elevation2 : '#F1F5F9' }]}>
                <Text style={[styles.contactCountText, { color: TEXT3 }]}>{activeContacts.length}</Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeMembersScroll}>
              {/* Quick start new chat avatar */}
              <TouchableOpacity
                style={styles.activeMemberItem}
                activeOpacity={0.75}
                onPress={() => router.push('/chat/new' as any)}
              >
                <View style={[styles.newChatAvatarWrap, { borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#CBD5E1' }]}>
                  <Ionicons name="add" size={22} color={G} />
                </View>
                <Text style={[styles.activeMemberName, { color: TEXT3 }]} numberOfLines={1}>
                  New
                </Text>
              </TouchableOpacity>

              {activeContacts.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  style={styles.activeMemberItem}
                  activeOpacity={0.75}
                  onPress={() => router.push(`/chat/new?participantId=${u.id}` as any)}
                >
                  <View style={styles.activeAvatarWrapper}>
                    <Avatar url={u.avatarUrl} name={u.displayName || u.username} size={48} />
                    {u.isOnline && <View style={styles.onlineDot} />}
                  </View>
                  <Text style={[styles.activeMemberName, { color: TEXT }]} numberOfLines={1}>
                    {u.displayName || u.username}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Category Filter Tabs ──────────────────────────────── */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[
              styles.tabChip,
              activeTab === 'all'
                ? { backgroundColor: G, borderColor: G }
                : { backgroundColor: SURF, borderColor: BORDER },
            ]}
            onPress={() => setActiveTab('all')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabChipText, { color: activeTab === 'all' ? '#FFF' : TEXT2 }]}>
              All Messages
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabChip,
              activeTab === 'unread'
                ? { backgroundColor: G, borderColor: G }
                : { backgroundColor: SURF, borderColor: BORDER },
            ]}
            onPress={() => setActiveTab('unread')}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Text style={[styles.tabChipText, { color: activeTab === 'unread' ? '#FFF' : TEXT2 }]}>
                Unread
              </Text>
              {totalUnread > 0 && (
                <View
                  style={[
                    styles.miniBadge,
                    {
                      backgroundColor: activeTab === 'unread' ? '#FFF' : (isDark ? 'rgba(22,163,74,0.2)' : '#DCFCE7'),
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.miniBadgeText,
                      { color: activeTab === 'unread' ? G : '#166534' },
                    ]}
                  >
                    {totalUnread}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabChip,
              activeTab === 'groups'
                ? { backgroundColor: G, borderColor: G }
                : { backgroundColor: SURF, borderColor: BORDER },
            ]}
            onPress={() => setActiveTab('groups')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabChipText, { color: activeTab === 'groups' ? '#FFF' : TEXT2 }]}>
              Communities & Groups
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Conversation List ─────────────────────────────────── */}
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
                      backgroundColor: SURF,
                      borderColor: BORDER,
                      opacity: 0.6,
                    },
                  ]}
                >
                  <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: isDark ? '#334155' : '#E2E8F0' }} />
                  <View style={{ flex: 1, marginLeft: 12, gap: 8 }}>
                    <View style={{ width: '45%', height: 14, borderRadius: 4, backgroundColor: isDark ? '#334155' : '#E2E8F0' }} />
                    <View style={{ width: '75%', height: 11, borderRadius: 4, backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }} />
                  </View>
                </View>
              ))}
            </View>
          ) : filteredChats.length === 0 ? (
            /* Empty State */
            <View style={[styles.emptyContainer, { backgroundColor: SURF, borderColor: BORDER }]}>
              <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.primaryContainer }]}>
                <Ionicons name="chatbubbles-outline" size={36} color={G} />
              </View>
              <Text style={[styles.emptyTitle, { color: TEXT }]}>
                {searchText ? 'No Matching Messages' : 'No Conversations Yet'}
              </Text>
              <Text style={[styles.emptySub, { color: TEXT3 }]}>
                {searchText
                  ? 'Try searching for another community member or keyword.'
                  : 'Start direct conversations with community members, groups, and friends.'}
              </Text>
              <TouchableOpacity
                style={[styles.startChatBtn, { backgroundColor: G }]}
                onPress={() => router.push('/chat/new' as any)}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={17} color="#FFF" />
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 19,
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
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
      android: { elevation: 1 },
    }),
  },
  headerNewBtnText: {
    color: '#FFF',
    fontSize: 13,
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
    borderRadius: 13,
    borderWidth: 1,
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  contactCountBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  contactCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  activeMembersScroll: {
    paddingHorizontal: 16,
    gap: 14,
  },
  activeMemberItem: {
    alignItems: 'center',
    width: 60,
    gap: 5,
  },
  newChatAvatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  miniBadge: {
    paddingHorizontal: 6,
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
    borderRadius: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3 },
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
    fontSize: 15,
    letterSpacing: -0.2,
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
    fontSize: 13,
    lineHeight: 17,
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
    paddingVertical: 36,
    paddingHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    marginTop: 6,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 18,
  },
  startChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    marginTop: 6,
  },
  startChatBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
