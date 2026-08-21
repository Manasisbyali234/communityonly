import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../../theme';
import { useCommunityMembersQuery } from '../../../../api/community';
import Avatar from '../../../../components/common/Avatar';
import Skeleton from '../../../../components/feedback/Skeleton';
import { Ionicons } from '@expo/vector-icons';

export default function CommunityMembers() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, typography, roundness } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: members = [], isLoading } = useCommunityMembersQuery(id || '');
  const [searchText, setSearchText] = useState('');

  const filteredMembers = members.filter((member) => {
    if (searchText.trim() === '') return true;
    const query = searchText.toLowerCase();
    return (
      member.displayName.toLowerCase().includes(query) ||
      member.username.toLowerCase().includes(query)
    );
  });

  const renderMemberRow = ({ item }: { item: any }) => (
    <View style={[styles.memberRow, { borderBottomColor: colors.borderSecondary }]}>
      <Avatar url={item.avatarUrl} name={item.displayName} size={40} />
      <View style={styles.memberInfo}>
        <Text style={[styles.displayName, { color: colors.text, fontSize: typography.sizes.md }]}>
          {item.displayName}
        </Text>
        <Text style={[styles.username, { color: colors.textSecondary, fontSize: typography.sizes.xs }]}>
          @{item.username}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => router.push({ pathname: '/chat/[id]', params: { id: `chat_${item.username}` } })}
        style={[styles.messageBtn, { backgroundColor: colors.inputBg, borderRadius: roundness.sm }]}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.text} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Top Navbar */}
      <View style={[styles.navbar, { borderBottomColor: colors.borderSecondary }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.text, fontSize: typography.sizes.lg }]}>
          Members
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search Members */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.inputBg, borderRadius: roundness.md }]}>
          <Ionicons name="search" size={16} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            placeholder="Search members..."
            placeholderTextColor={colors.textMuted}
            value={searchText}
            onChangeText={setSearchText}
            style={[styles.searchInput, { color: colors.text, fontSize: typography.sizes.sm }]}
          />
        </View>
      </View>

      {/* Members FlatList */}
      {isLoading ? (
        <View style={{ padding: 20 }}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Skeleton width={40} height={40} borderRadius={20} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Skeleton width="40%" height={14} style={{ marginBottom: 6 }} />
                <Skeleton width="20%" height={10} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={filteredMembers}
          renderItem={renderMemberRow}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
                No members found matching your search.
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
    paddingVertical: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
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
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  displayName: {
    fontWeight: '600',
  },
  username: {
    marginTop: 1,
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
    fontWeight: '500',
    textAlign: 'center',
  },
});
