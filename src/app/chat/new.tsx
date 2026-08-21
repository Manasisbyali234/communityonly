import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity } from 'react-native';
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
  const { colors, spacing, typography, roundness } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { participantId } = useLocalSearchParams<{ participantId?: string }>();
  
  const startConversation = useStartConversationMutation();
  const hasResolvedParticipant = useRef(false);

  const [searchText, setSearchText] = useState('');

  const { user: currentUser } = useAuthStore();
  const { data: users = [] } = useSuggestedUsersQuery(20);

  // Message notifications only identify the sender in some cases. Resolve or
  // create that sender's conversation before rendering the composer route.
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

  // Exclude current user from the list
  const availableUsers = users.filter((u: any) => u.id !== currentUser?.id && u.role !== 'ADMIN');

  const filteredUsers = availableUsers.filter((user: any) => {
    if (searchText.trim() === '') return true;
    const query = searchText.toLowerCase();
    return (
      (user.displayName || user.username).toLowerCase().includes(query) ||
      user.username.toLowerCase().includes(query)
    );
  });

  const renderUserRow = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={[styles.userRow, { borderBottomColor: colors.borderSecondary }]}
      activeOpacity={0.7}
      onPress={() => {
        startConversation.mutate({ participantId: item.id }, {
          onSuccess: (conversation) => {
            router.push(`/chat/${conversation.id}`);
          }
        });
      }}
      disabled={startConversation.isPending}
    >
      <Avatar url={item.avatarUrl} name={item.displayName || item.username} size={44} />
      <View style={styles.userInfo}>
        <Text style={[styles.displayName, { color: colors.text, fontSize: typography.sizes.md }]}>
          {item.displayName || item.username}
        </Text>
        <Text style={[styles.username, { color: colors.textSecondary, fontSize: typography.sizes.xs }]}>
          @{item.username}
        </Text>
      </View>
      <View style={[styles.messageBtn, { backgroundColor: colors.inputBg, borderRadius: roundness.sm }]}>
        <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.text} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Top Navbar */}
      <View style={[styles.navbar, { borderBottomColor: colors.borderSecondary }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/chat')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.text, fontSize: typography.sizes.lg }]}>
          New Message
        </Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.inputBg, borderRadius: roundness.md }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            placeholder="Search by name or @username..."
            placeholderTextColor={colors.textMuted}
            value={searchText}
            onChangeText={setSearchText}
            autoFocus
            style={[styles.searchInput, { color: colors.text, fontSize: typography.sizes.sm }]}
          />
        </View>
      </View>

      {/* Users List */}
      <FlatList
        data={filteredUsers}
        renderItem={renderUserRow}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
              No users found matching your search.
            </Text>
          </View>
        )}
      />
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
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  navTitle: {
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    padding: 0,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  displayName: {
    fontWeight: '600',
  },
  username: {
    marginTop: 2,
  },
  messageBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});
