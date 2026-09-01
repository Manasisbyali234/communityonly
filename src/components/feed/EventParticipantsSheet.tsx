import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { BottomSheet } from '../common/BottomSheet';
import Avatar from '../common/Avatar';
import { useEventParticipantsQuery } from '../../api/event';

interface Props {
  eventId: string | null;
  eventTitle?: string;
  count?: number;
  visible: boolean;
  onClose: () => void;
}

export default function EventParticipantsSheet({
  eventId,
  eventTitle,
  count = 0,
  visible,
  onClose,
}: Props) {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const { data: participants = [], isLoading } = useEventParticipantsQuery(visible ? eventId : null);

  const G = colors.primary;
  const TEXT = colors.text;
  const TEXT2 = colors.textSecondary;
  const TEXT3 = colors.textMuted;
  const BORDER = colors.border;
  const SURF = colors.surface;

  const handleUserPress = (userId: string) => {
    onClose();
    router.push(`/user/${userId}?from=events` as any);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Event Participants"
      height={480}
    >
      <View style={styles.sheetContainer}>
        {/* Header summary badge */}
        <View style={[styles.summaryBanner, { backgroundColor: G + '12', borderColor: G + '30' }]}>
          <View style={[styles.iconCircle, { backgroundColor: G }]}>
            <Ionicons name="people" size={16} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.summaryTitle, { color: TEXT }]} numberOfLines={1}>
              {eventTitle || 'Event Attendees'}
            </Text>
            <Text style={[styles.summarySubtitle, { color: G }]}>
              {count} {count === 1 ? 'member' : 'members'} registered & joined
            </Text>
          </View>
        </View>

        {/* List Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={G} />
            <Text style={[styles.loadingText, { color: TEXT3 }]}>Loading participants...</Text>
          </View>
        ) : participants.length > 0 ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          >
            {participants.map((item: any, index: number) => {
              const user = item.user || item;
              return (
                <TouchableOpacity
                  key={user.id || index}
                  style={[
                    styles.participantRow,
                    { borderBottomColor: BORDER, borderBottomWidth: index < participants.length - 1 ? StyleSheet.hairlineWidth : 0 },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => user.id && handleUserPress(user.id)}
                >
                  <Avatar url={user.avatarUrl} name={user.displayName || user.username} size={42} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.userName, { color: TEXT }]} numberOfLines={1}>
                      {user.displayName || user.username || 'Member'}
                    </Text>
                    {user.username ? (
                      <Text style={[styles.userHandle, { color: TEXT3 }]} numberOfLines={1}>
                        @{user.username}
                      </Text>
                    ) : null}
                  </View>
                  {user.village || user.occupation ? (
                    <View style={[styles.userBadge, { backgroundColor: isDark ? '#27272A' : '#F4F4F5' }]}>
                      <Text style={[styles.userBadgeText, { color: TEXT2 }]}>
                        {user.village || user.occupation}
                      </Text>
                    </View>
                  ) : (
                    <Ionicons name="chevron-forward" size={16} color={TEXT3} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: G + '12' }]}>
              <Ionicons name="people-outline" size={32} color={G} />
            </View>
            <Text style={[styles.emptyTitle, { color: TEXT }]}>
              {count > 0 ? `${count} Members Joined` : 'No Participants Yet'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: TEXT3 }]}>
              {count > 0
                ? 'Attendees have successfully joined this event.'
                : 'When community members RSVP and join your event, their profiles will appear here.'}
            </Text>
          </View>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  summarySubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
  },
  listContent: {
    paddingBottom: 24,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
  },
  userHandle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  userBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  userBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 8,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
