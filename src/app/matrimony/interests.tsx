import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator, Alert, Platform, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useMatrimonyInterestsQuery, useRespondInterestMutation,
  useMyMatrimonyProfileQuery, ProfileInterest,
  useMatrimonyLikeMatchesQuery,
} from '../../api/matrimony';
import { useTheme } from '../../theme';
import { useToastStore } from '../../store/toastStore';
import { useConfirmStore } from '../../store/confirmStore';

export default function MatrimonyInterestsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { data: myProfile } = useMyMatrimonyProfileQuery();
  const { data: interests = [], isLoading } = useMatrimonyInterestsQuery(!!myProfile?.id);
  const { data: likeMatches = [] } = useMatrimonyLikeMatchesQuery(!!myProfile?.id);
  const respondMutation = useRespondInterestMutation();

  const received = interests.filter((i: ProfileInterest) => i.toProfileId === myProfile?.id);
  const sent = interests.filter((i: ProfileInterest) => i.fromProfileId === myProfile?.id);

  // Build conversationId map from likeMatches keyed by the other profile's userId
  const likeMatchConvMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    likeMatches.forEach((m: any) => {
      if (m.conversationId && m.profile?.id) map[m.profile.id] = m.conversationId;
    });
    return map;
  }, [likeMatches]);

  const getConvId = (interest: ProfileInterest, otherProfileId: string) =>
    interest.conversationId ?? likeMatchConvMap[otherProfileId] ?? null;

  const handleRespond = async (interestId: string, status: 'ACCEPTED' | 'REJECTED', name: string) => {
    const ok = await useConfirmStore.getState().confirm({
      title: status === 'ACCEPTED' ? 'Accept interest?' : 'Decline interest?',
      message: status === 'ACCEPTED'
        ? `Accept interest from ${name}? You will be able to start chatting.`
        : `Decline interest from ${name}?`,
      confirmText: status === 'ACCEPTED' ? 'Accept' : 'Decline',
      cancelText: 'Cancel',
      isDestructive: status === 'REJECTED',
      icon: status === 'ACCEPTED' ? 'heart-outline' : 'close-circle-outline',
    });
    if (!ok) return;

    try {
      const result = await respondMutation.mutateAsync({ interestId, status });
      if (status === 'ACCEPTED' && result?.conversationId) {
        router.push(`/matrimony/chat/${result.conversationId}` as any);
      }
    } catch (e: any) {
      useToastStore.getState().showToast(e.response?.data?.message ?? 'Failed to respond', 'error');
    }
  };

  const allItems = [
    ...received.map(i => ({ interest: i, isReceived: true })),
    ...sent.map(i => ({ interest: i, isReceived: false })),
  ].sort((a, b) => new Date(b.interest.createdAt).getTime() - new Date(a.interest.createdAt).getTime());

  const renderCard = (interest: ProfileInterest, isReceived: boolean) => {
    const profile = isReceived ? interest.fromProfile : interest.toProfile;
    const otherProfileId = isReceived ? interest.fromProfileId : interest.toProfileId;
    if (!profile) return null;
    const photo = profile.photos?.[0] || profile.avatarUrl;
    const convId = getConvId(interest, otherProfileId);
    const statusColor =
      interest.status === 'ACCEPTED' ? colors.success :
      interest.status === 'REJECTED' ? colors.error : colors.warning;
    const statusLabel =
      interest.status === 'ACCEPTED' ? 'Accepted' :
      interest.status === 'REJECTED' ? 'Declined' : 'Pending';

    return (
      <TouchableOpacity
        key={interest.id}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => router.push(`/matrimony/${otherProfileId}` as any)}
        activeOpacity={0.85}
      >
        {photo ? (
          <Image source={{ uri: photo }} style={[styles.avatar, { borderColor: colors.primaryContainer }]} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer }]}>
            <Ionicons name="person" size={24} color={colors.primary} />
          </View>
        )}

        <View style={{ flex: 1 }}>
          <View style={styles.topRow}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {profile.displayName}, {profile.age}
            </Text>
            <View style={[styles.statusChip, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            {isReceived ? '📩 Received' : '📤 Sent'} · {profile.city} · {profile.occupation}
          </Text>
          {interest.message ? (
            <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={2}>
              "{interest.message}"
            </Text>
          ) : null}
          <Text style={[styles.date, { color: colors.textMuted }]}>
            {new Date(interest.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </View>

        <View style={styles.actions}>
          {interest.status === 'ACCEPTED' && convId ? (
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: '#7B3FA0' }]}
              onPress={() => router.push(`/matrimony/chat/${convId}` as any)}
            >
              <Ionicons name="chatbubble" size={16} color="#fff" />
            </TouchableOpacity>
          ) : null}
          {isReceived && interest.status === 'PENDING' && (
            <>
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: colors.success }]}
                onPress={() => handleRespond(interest.id, 'ACCEPTED', profile.displayName ?? '')}
              >
                <Ionicons name="checkmark" size={16} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: colors.error }]}
                onPress={() => handleRespond(interest.id, 'REJECTED', profile.displayName ?? '')}
              >
                <Ionicons name="close" size={16} color="#fff" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { backgroundColor: colors.primaryDark }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: 'rgba(255,255,255,0.18)' }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Interests 💌</Text>
        {allItems.length > 0 && (
          <View style={[styles.countBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Text style={styles.countText}>{allItems.length}</Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : allItems.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primaryContainer }]}>
            <Ionicons name="mail-outline" size={36} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No interests yet</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            When someone sends you interest or you express interest in someone, it will appear here.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {allItems.map(({ interest, isReceived }) => renderCard(interest, isReceived))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: '#fff' },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  countText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  list: { padding: 14, gap: 12 },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderRadius: 16, padding: 14, borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  avatar: { width: 58, height: 58, borderRadius: 29, borderWidth: 2 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  name: { fontSize: 15, fontWeight: '700', flex: 1 },
  meta: { fontSize: 12, marginBottom: 4 },
  message: { fontSize: 12, fontStyle: 'italic', marginBottom: 4 },
  date: { fontSize: 11 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginLeft: 6, flexShrink: 0 },
  statusText: { fontSize: 11, fontWeight: '700' },
  actions: { flexDirection: 'column', gap: 8, justifyContent: 'center', alignItems: 'center' },
  iconBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 10 },
  emptyIcon: { width: 80, height: 80, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { fontSize: 17, fontWeight: '800' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
