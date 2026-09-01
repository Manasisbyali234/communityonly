import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../../components/common/Avatar';
import { User } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useSuggestedUsersQuery } from '../../api/user';
import { useStartConversationMutation } from '../../api/chat';

export default function NewChatScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { participantId } = useLocalSearchParams<{ participantId?: string }>();

  const startConversation = useStartConversationMutation();
  const hasResolvedParticipant = useRef(false);

  const [searchText, setSearchText] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { user: currentUser } = useAuthStore();
  const { data: users = [], isLoading } = useSuggestedUsersQuery(30);

  // Auto-resolve participant from query param if provided
  useEffect(() => {
    if (!participantId || hasResolvedParticipant.current) return;

    hasResolvedParticipant.current = true;
    startConversation.mutate(
      { participantId },
      {
        onSuccess: (conversation) => router.replace(`/chat/${conversation.id}`),
        onError: () => { hasResolvedParticipant.current = false; },
      }
    );
  }, [participantId, router, startConversation]);

  // Exclude current user and admin from list
  const availableUsers = users.filter((u: any) => u.id !== currentUser?.id && u.role !== 'ADMIN');

  const filteredUsers = availableUsers.filter((user: any) => {
    if (!searchText.trim()) return true;
    const query = searchText.toLowerCase();
    const name = (user.displayName || user.username || '').toLowerCase();
    const username = (user.username || '').toLowerCase();
    return name.includes(query) || username.includes(query);
  });

  const handleSelectUser = (item: User) => {
    setSelectedUserId(item.id);
    startConversation.mutate(
      { participantId: item.id },
      {
        onSuccess: (conversation) => {
          router.replace(`/chat/${conversation.id}`);
        },
        onError: () => {
          setSelectedUserId(null);
        },
      }
    );
  };

  const G = colors.primary;
  const BG = colors.background;
  const SURF = colors.surface;
  const BORDER = colors.border;
  const TEXT = colors.text;
  const TEXT2 = colors.textSecondary;
  const TEXT3 = colors.textMuted;

  const renderUserRow = ({ item }: { item: User }) => {
    const isSelected = selectedUserId === item.id && startConversation.isPending;

    return (
      <TouchableOpacity
        style={[
          styles.userCard,
          {
            backgroundColor: SURF,
            borderColor: isSelected ? G : BORDER,
          },
        ]}
        activeOpacity={0.75}
        onPress={() => handleSelectUser(item)}
        disabled={startConversation.isPending}
      >
        {/* Avatar with online dot */}
        <View style={styles.avatarWrap}>
          <Avatar
            url={item.avatarUrl}
            name={item.displayName || item.username || 'User'}
            size={48}
            online={(item as any).isOnline}
          />
        </View>

        {/* User Details */}
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.displayName, { color: TEXT }]} numberOfLines={1}>
              {item.displayName || item.username}
            </Text>
            {(item as any).isVerified && (
              <Ionicons name="shield-checkmark" size={14} color="#16A34A" style={{ marginLeft: 4 }} />
            )}
          </View>
          <Text style={[styles.username, { color: TEXT3 }]} numberOfLines={1}>
            @{item.username}
          </Text>
        </View>

        {/* Action Button */}
        <View
          style={[
            styles.messageBtn,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.primaryContainer,
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'transparent',
            },
          ]}
        >
          {isSelected ? (
            <ActivityIndicator size="small" color={G} />
          ) : (
            <Ionicons name="chatbubble-ellipses-outline" size={17} color={G} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: BG, paddingTop: insets.top }]}>
      {/* ── Top Navbar ─────────────────────────────────────────── */}
      <View style={[styles.navbar, { backgroundColor: SURF, borderBottomColor: BORDER }]}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/chat' as any))}
          style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.primaryContainer }]}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={19} color={G} />
        </TouchableOpacity>

        <View style={styles.navTitleWrap}>
          <Text style={[styles.navTitle, { color: TEXT }]}>New Message</Text>
          <Text style={[styles.navSubtitle, { color: TEXT3 }]}>
            {filteredUsers.length} community members
          </Text>
        </View>

        <View style={{ width: 36 }} />
      </View>

      {/* ── Search Bar ─────────────────────────────────────────── */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9', borderColor: BORDER }]}>
          <Ionicons name="search" size={17} color={TEXT3} style={styles.searchIcon} />
          <TextInput
            placeholder="Search by name or @username..."
            placeholderTextColor={TEXT3}
            value={searchText}
            onChangeText={setSearchText}
            autoFocus
            style={[styles.searchInput, { color: TEXT }]}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={17} color={TEXT3} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Suggested Contacts Label ───────────────────────────── */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionLabel, { color: TEXT3 }]}>
          {searchText ? 'SEARCH RESULTS' : 'SUGGESTED CONTACTS'}
        </Text>
        <Text style={[styles.sectionCount, { color: TEXT3 }]}>
          {filteredUsers.length}
        </Text>
      </View>

      {/* ── Users List ─────────────────────────────────────────── */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={G} />
          <Text style={[styles.loadingText, { color: TEXT3 }]}>Loading contacts...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUserRow}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContainer, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={() => (
            <View style={[styles.emptyContainer, { backgroundColor: SURF, borderColor: BORDER }]}>
              <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.primaryContainer }]}>
                <Ionicons name="people-outline" size={36} color={G} />
              </View>
              <Text style={[styles.emptyTitle, { color: TEXT }]}>
                No Members Found
              </Text>
              <Text style={[styles.emptySub, { color: TEXT3 }]}>
                {searchText
                  ? `No community member matches "${searchText}".`
                  : 'No contacts available to message right now.'}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitleWrap: {
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  navSubtitle: {
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 1,
  },

  // Search
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 13,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    padding: 0,
    fontSize: 13.5,
  },

  // Section Header
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  sectionCount: {
    fontSize: 11.5,
    fontWeight: '700',
  },

  // List
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  userCard: {
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
  avatarWrap: {
    position: 'relative',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  displayName: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  username: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  messageBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },

  // Loading & Empty State
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 13.5,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    marginTop: 10,
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
    maxWidth: 240,
    lineHeight: 18,
  },
});
