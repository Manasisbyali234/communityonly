import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput } from 'react-native';
import { FlashList as ShopifyFlashList } from '@shopify/flash-list';
const FlashList = ShopifyFlashList as any;
import { useTheme } from '../../theme';
import BottomSheet from '../common/BottomSheet';
import Avatar from '../common/Avatar';
import { Ionicons } from '@expo/vector-icons';
import { useSuggestedUsersQuery } from '../../api/user';

interface ForwardSheetProps {
  postId: string | null;
  visible: boolean;
  onClose: () => void;
  onNativeShare: () => void;
}

export const ForwardSheet: React.FC<ForwardSheetProps> = ({ postId, visible, onClose, onNativeShare }) => {
  const { colors, typography } = useTheme();
  
  const { data: users = [] } = useSuggestedUsersQuery(20);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

  const filteredUsers = users.filter((u: any) => 
    (u.displayName || u.username).toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSend = (userId: string) => {
    setSentTo(prev => new Set(prev).add(userId));
  };

  const handleNativeShare = () => {
    onClose();
    setTimeout(() => {
      onNativeShare();
    }, 300);
  };

  const renderUser = ({ item }: { item: any }) => {
    const hasSent = sentTo.has(item.id);

    return (
      <View style={[styles.userRow, { borderBottomColor: colors.borderSecondary }]}>
        <Avatar url={item.avatarUrl} name={item.displayName || item.username} size={44} />
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.text }]}>{item.displayName || item.username}</Text>
          <Text style={[styles.userHandle, { color: colors.textMuted }]}>@{item.username}</Text>
        </View>
        <TouchableOpacity 
          style={[
            styles.sendBtn, 
            { backgroundColor: hasSent ? colors.surfaceVariant : colors.primary }
          ]}
          onPress={() => !hasSent && handleSend(item.id)}
          disabled={hasSent}
        >
          <Text style={[
            styles.sendBtnText, 
            { color: hasSent ? colors.textMuted : '#FFF' }
          ]}>
            {hasSent ? 'Sent' : 'Send'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Forward To">
      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchBox, { backgroundColor: colors.inputBg }]}>
            <Ionicons name="search" size={20} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search people or groups..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* User List */}
        <FlashList
          data={filteredUsers}
          renderItem={renderUser}
          estimatedItemSize={68}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />

        {/* Bottom External Share Option */}
        <View style={[styles.externalShareContainer, { borderTopColor: colors.borderSecondary, backgroundColor: colors.cardBg }]}>
          <TouchableOpacity style={styles.externalShareBtn} onPress={handleNativeShare}>
            <View style={[styles.externalIconWrap, { backgroundColor: colors.primaryContainer }]}>
              <Ionicons name="share-outline" size={22} color={colors.primary} />
            </View>
            <Text style={[styles.externalShareText, { color: colors.text }]}>Share via other apps</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 20,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
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
  userName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  userHandle: {
    fontSize: 13,
  },
  sendBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 70,
    alignItems: 'center',
  },
  sendBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  externalShareContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  externalShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  externalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  externalShareText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ForwardSheet;
