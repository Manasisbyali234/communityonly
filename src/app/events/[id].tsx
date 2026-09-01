import React, { useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Platform,
  Animated,
  useWindowDimensions,
  ActivityIndicator,
  Share,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { useConfirmStore } from '../../store/confirmStore';
import {
  useEventDetailQuery,
  useToggleInterestMutation,
  useToggleLikeMutation,
  useShareEventMutation,
} from '../../api/event';
import { useUserQuery } from '../../api/feed';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import Skeleton from '../../components/feedback/Skeleton';
import EventCommentSheet from '../../components/feed/EventCommentSheet';
import EventShareSheet from '../../components/feed/EventShareSheet';
import EventParticipantsSheet from '../../components/feed/EventParticipantsSheet';
import { shareUrl } from '../../utils/shareUtils';

export default function EventDetailScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleBack = () => {
    router.replace('/(tabs)/explore?tab=events' as any);
  };
  const { width: windowWidth } = useWindowDimensions();
  const showToast = useToastStore((state) => state.showToast);
  const currentUser = useAuthStore((state) => state.user);

  const scrollY = useRef(new Animated.Value(0)).current;
  const bannerHeight = Math.min(320, Math.round(windowWidth * 0.6));

  const { data: event, isLoading } = useEventDetailQuery(id);
  const { data: creator } = useUserQuery(event?.creatorId ?? '');

  const toggleInterest = useToggleInterestMutation();
  const toggleLike = useToggleLikeMutation();
  const shareEvent = useShareEventMutation();

  const [commentSheetVisible, setCommentSheetVisible] = useState(false);
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [participantsSheetVisible, setParticipantsSheetVisible] = useState(false);

  const G = colors.primary;
  const BG = colors.background;
  const SURF = colors.surface;
  const BORDER = colors.border;
  const TEXT = colors.text;
  const TEXT2 = colors.textSecondary;
  const TEXT3 = colors.textMuted;

  const isOwn = !!currentUser && event?.creatorId === currentUser.id;
  const isPast = event ? new Date(event.startsAt) < new Date() : false;
  const isInterested = event?.isInterested ?? false;
  const interestedCount = event?.interestedCount ?? event?.rsvpCount ?? 0;
  const isLiked = event?.isLiked ?? false;
  const likesCount = event?.likesCount ?? 0;
  const commentsCount = event?.commentsCount ?? 0;

  const confirm = useConfirmStore((s) => s.confirm);

  const handleInterest = async () => {
    if (!currentUser) {
      showToast('Please log in to join this event', 'error');
      return;
    }
    if (!event || toggleInterest.isPending) return;

    if (isInterested) {
      const ok = await confirm({
        title: 'Leave this event?',
        message: 'You will no longer be listed as attending this event.',
        confirmText: 'Leave',
        cancelText: 'Cancel',
        isDestructive: true,
        icon: 'calendar-outline',
      });
      if (!ok) return;
    } else {
      const ok = await confirm({
        title: 'Join this event?',
        message: 'You are about to join this event. Do you want to continue?',
        confirmText: 'Join',
        cancelText: 'Cancel',
        isDestructive: false,
        icon: 'calendar-outline',
      });
      if (!ok) return;
    }

    toggleInterest.mutate(event.id, {
      onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to update RSVP', 'error'),
    });
  };

  const handleLike = () => {
    if (!currentUser) {
      showToast('Please log in to like this event', 'error');
      return;
    }
    if (!event || toggleLike.isPending) return;
    toggleLike.mutate(event.id, {
      onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to update like', 'error'),
    });
  };

  const handleShare = useCallback(async () => {
    if (!event) return;
    shareEvent.mutate(event.id, { onError: () => {} });
    const base = Platform.OS === 'web' && typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}` : '';
    const link = `${base}/events/${event.id}`;
    const ok = await shareUrl(`Check out ${event.title} on GowdaCommunity! ${link}`, link);
    showToast(ok ? 'Event link copied to clipboard!' : 'Could not share event', ok ? 'success' : 'error');
  }, [event, shareEvent, showToast]);

  const openLocationInMaps = () => {
    if (!event?.location) return;
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(event.location)}`,
      android: `geo:0,0?q=${encodeURIComponent(event.location)}`,
      default: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`,
    });
    Linking.openURL(url!).catch(() => showToast('Could not open map', 'error'));
  };

  const navBgOpacity = scrollY.interpolate({
    inputRange: [bannerHeight - 90, bannerHeight - 40],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  if (isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: BG, paddingTop: insets.top }]}>
        <View style={[styles.navBar, { borderBottomColor: BORDER }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
            <Ionicons name="arrow-back" size={24} color={TEXT} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: TEXT }]}>Event Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <Skeleton width="100%" height={220} borderRadius={20} />
          <Skeleton width="75%" height={26} borderRadius={8} />
          <Skeleton width="45%" height={16} borderRadius={6} />
          <Skeleton width="100%" height={100} borderRadius={16} />
          <Skeleton width="100%" height={140} borderRadius={16} />
        </ScrollView>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: BG, paddingTop: insets.top }]}>
        <Ionicons name="calendar-outline" size={68} color={TEXT3} />
        <Text style={[styles.notFoundTitle, { color: TEXT }]}>Event Not Found</Text>
        <Text style={[styles.notFoundSubtitle, { color: TEXT3 }]}>This event may have been removed or ended.</Text>
        <Button
          title="Back to Explore"
          variant="primary"
          size="md"
          onPress={handleBack}
          style={{ marginTop: 16 }}
        />
      </View>
    );
  }

  const dateObj = new Date(event.startsAt);
  const dayNum = isNaN(dateObj.getTime()) ? '--' : dateObj.getDate();
  const monthShort = isNaN(dateObj.getTime()) ? '--' : dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const fullDateStr = isNaN(dateObj.getTime()) ? '--' : dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const timeStr = isNaN(dateObj.getTime()) ? '--' : dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const endTimeStr = event.endsAt && !isNaN(new Date(event.endsAt).getTime())
    ? new Date(event.endsAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      {/* ── Floating Top Navigation Bar ───────────────────────────────── */}
      <Animated.View style={[styles.navBar, { paddingTop: insets.top + 6, height: insets.top + 54 }]}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: SURF, opacity: navBgOpacity, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER }]} />
        <TouchableOpacity onPress={handleBack} style={styles.floatingCircleBtn}>
          <Ionicons name="arrow-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <Animated.Text style={[styles.navTitle, { color: TEXT, opacity: navBgOpacity }]} numberOfLines={1}>
          {event.title}
        </Animated.Text>
        <View style={styles.navRightGroup}>
          <TouchableOpacity style={styles.floatingCircleBtn} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={20} color={TEXT} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(110, insets.bottom + 90) }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* ── Banner Image ────────────────────────────────────────────── */}
        <View style={[styles.bannerContainer, { height: bannerHeight }]}>
          {event.coverUrl && !event.coverUrl.startsWith('blob:') ? (
            <ExpoImage
              source={{ uri: event.coverUrl }}
              style={styles.bannerImage}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={[styles.bannerImage, styles.bannerFallback]}>
              <Ionicons name="calendar-outline" size={64} color={G} />
            </View>
          )}
          <View style={styles.bannerGradient} />

          {/* Overlapping Date Badge */}
          <View style={[styles.dateBadge, { backgroundColor: G }]}>
            <Text style={styles.dateBadgeDay}>{dayNum}</Text>
            <Text style={styles.dateBadgeMonth}>{monthShort}</Text>
          </View>

          {/* Status Badge */}
          <View
            style={[
              styles.statusPill,
              { backgroundColor: isPast ? 'rgba(0,0,0,0.65)' : G },
            ]}
          >
            <Text style={styles.statusPillText}>
              {isPast ? 'Past Event' : 'Upcoming Event'}
            </Text>
          </View>
        </View>

        <View style={styles.contentContainer}>
          {/* ── Title & Creator Header ─────────────────────────────────── */}
          <Text style={[styles.eventTitle, { color: TEXT }]}>{event.title}</Text>

          {/* Organizer Row */}
          {(creator || event.creatorId) && (
            <TouchableOpacity
              style={[styles.organizerCard, { backgroundColor: SURF, borderColor: BORDER }]}
              activeOpacity={0.8}
              onPress={() => router.push(`/user/${event.creatorId}?from=events` as any)}
            >
              <Avatar url={creator?.avatarUrl} name={creator?.displayName || 'Organizer'} size={44} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.organizerLabel, { color: TEXT3 }]}>Organized by</Text>
                <Text style={[styles.organizerName, { color: TEXT }]} numberOfLines={1}>
                  {creator?.displayName || 'Community Member'}
                </Text>
              </View>
              <View style={[styles.organizerActionPill, { backgroundColor: G + '12' }]}>
                <Text style={[styles.organizerActionText, { color: G }]}>View Profile</Text>
                <Ionicons name="chevron-forward" size={12} color={G} />
              </View>
            </TouchableOpacity>
          )}

          {/* ── Key Information Cards ─────────────────────────────────── */}
          <View style={styles.infoCardsSection}>
            {/* Date & Time Card */}
            <View style={[styles.infoCard, { backgroundColor: SURF, borderColor: BORDER }]}>
              <View style={[styles.infoIconBox, { backgroundColor: G + '14' }]}>
                <Ionicons name="calendar" size={20} color={G} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoCardTitle, { color: TEXT }]}>{fullDateStr}</Text>
                <Text style={[styles.infoCardSub, { color: TEXT2 }]}>
                  {timeStr} {endTimeStr ? ` - ${endTimeStr}` : ''}
                </Text>
              </View>
            </View>

            {/* Location Card */}
            {event.location ? (
              <TouchableOpacity
                style={[styles.infoCard, { backgroundColor: SURF, borderColor: BORDER }]}
                activeOpacity={0.8}
                onPress={openLocationInMaps}
              >
                <View style={[styles.infoIconBox, { backgroundColor: '#3B82F614' }]}>
                  <Ionicons name="location" size={20} color="#3B82F6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoCardTitle, { color: TEXT }]} numberOfLines={1}>
                    {event.location}
                  </Text>
                  <Text style={[styles.infoCardSub, { color: '#3B82F6' }]}>
                    Open in Maps →
                  </Text>
                </View>
              </TouchableOpacity>
            ) : null}

            {/* Attendees / Participants Card */}
            <TouchableOpacity
              style={[styles.infoCard, { backgroundColor: SURF, borderColor: BORDER }]}
              activeOpacity={0.8}
              onPress={() => setParticipantsSheetVisible(true)}
            >
              <View style={[styles.infoIconBox, { backgroundColor: '#8B5CF614' }]}>
                <Ionicons name="people" size={20} color="#8B5CF6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoCardTitle, { color: TEXT }]}>
                  {interestedCount} {interestedCount === 1 ? 'Person Joined' : 'People Joined'}
                </Text>
                <Text style={[styles.infoCardSub, { color: '#8B5CF6' }]}>
                  View participant list →
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* ── About Event Description ───────────────────────────────── */}
          {event.description ? (
            <View style={[styles.aboutCard, { backgroundColor: SURF, borderColor: BORDER }]}>
              <Text style={[styles.sectionHeading, { color: TEXT }]}>About Event</Text>
              <Text style={[styles.descriptionText, { color: TEXT2 }]}>
                {event.description}
              </Text>
            </View>
          ) : null}

          {/* ── Social Action Bar ──────────────────────────────────────── */}
          <View style={[styles.socialRow, { backgroundColor: SURF, borderColor: BORDER }]}>
            <TouchableOpacity
              style={styles.socialBtn}
              onPress={handleLike}
              disabled={toggleLike.isPending}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={22}
                color={isLiked ? '#EF4444' : TEXT2}
              />
              <Text style={[styles.socialBtnText, { color: isLiked ? '#EF4444' : TEXT2 }]}>
                {likesCount > 0 ? `${likesCount} Likes` : 'Like'}
              </Text>
            </TouchableOpacity>

            <View style={[styles.socialDivider, { backgroundColor: BORDER }]} />

            <TouchableOpacity
              style={styles.socialBtn}
              onPress={() => setCommentSheetVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-outline" size={20} color={TEXT2} />
              <Text style={[styles.socialBtnText, { color: TEXT2 }]}>
                {commentsCount > 0 ? `${commentsCount} Comments` : 'Comment'}
              </Text>
            </TouchableOpacity>

            <View style={[styles.socialDivider, { backgroundColor: BORDER }]} />

            <TouchableOpacity
              style={styles.socialBtn}
              onPress={handleShare}
              activeOpacity={0.7}
            >
              <Ionicons name="share-social-outline" size={20} color={TEXT2} />
              <Text style={[styles.socialBtnText, { color: TEXT2 }]}>
                Share
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* ── Sticky Bottom Action Bar ──────────────────────────────────── */}
      <View style={[styles.bottomBar, { backgroundColor: SURF, borderTopColor: BORDER, paddingBottom: Math.max(16, insets.bottom + 8) }]}>
        <View style={styles.bottomBarInner}>
          {/* Quick Interest Star Toggle */}
          <TouchableOpacity
            style={[
              styles.interestBtn,
              { backgroundColor: isInterested ? '#F59E0B15' : isDark ? '#27272A' : '#F4F4F5', borderColor: isInterested ? '#F59E0B40' : BORDER },
            ]}
            onPress={handleInterest}
            disabled={toggleInterest.isPending}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isInterested ? 'star' : 'star-outline'}
              size={20}
              color={isInterested ? '#D97706' : TEXT2}
            />
          </TouchableOpacity>

          {/* Primary CTA */}
          <View style={{ flex: 1 }}>
            {isOwn ? (
              <Button
                title="Organizer View"
                icon="calendar"
                variant="secondary"
                size="lg"
                onPress={() => setParticipantsSheetVisible(true)}
              />
            ) : (
              <Button
                title={isPast ? 'Event Finished' : isInterested ? 'Joined Event ✓' : 'Join Event Now'}
                icon={isInterested ? 'checkmark-circle' : 'add-circle-outline'}
                variant={isInterested ? 'secondary' : 'primary'}
                size="lg"
                disabled={isPast || toggleInterest.isPending}
                loading={toggleInterest.isPending}
                onPress={handleInterest}
              />
            )}
          </View>
        </View>
      </View>

      {/* ── Sheets & Modals ───────────────────────────────────────────── */}
      <EventCommentSheet
        eventId={event.id}
        eventTitle={event.title}
        visible={commentSheetVisible}
        onClose={() => setCommentSheetVisible(false)}
      />

      <EventShareSheet
        eventId={event.id}
        eventTitle={event.title}
        shareUrl={`/events/${event.id}`}
        visible={shareSheetVisible}
        onClose={() => setShareSheetVisible(false)}
      />

      <EventParticipantsSheet
        eventId={event.id}
        eventTitle={event.title}
        count={interestedCount}
        visible={participantsSheetVisible}
        onClose={() => setParticipantsSheetVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },

  // Top Nav
  navBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  floatingCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  navTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginHorizontal: 10,
  },
  navRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navBtn: { padding: 8 },

  // Banner Hero
  bannerContainer: {
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerFallback: {
    backgroundColor: '#A3B899',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerGradient: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  dateBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    zIndex: 10,
    minWidth: 50,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  dateBadgeDay: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 20,
  },
  dateBadgeMonth: {
    color: '#FFF',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statusPill: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 46,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  statusPillText: {
    color: '#FFF',
    fontSize: 11.5,
    fontWeight: '700',
  },

  // Content
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 16,
  },
  eventTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 28,
  },

  // Organizer
  organizerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  organizerLabel: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  organizerName: {
    fontSize: 14.5,
    fontWeight: '700',
    marginTop: 1,
  },
  organizerActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  organizerActionText: {
    fontSize: 11.5,
    fontWeight: '700',
  },

  // Info Cards Section
  infoCardsSection: {
    gap: 10,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  infoIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCardTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  infoCardSub: {
    fontSize: 12.5,
    fontWeight: '500',
  },

  // About Card
  aboutCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '400',
  },

  // Social Row
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  socialBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  socialDivider: {
    width: StyleSheet.hairlineWidth,
    height: 22,
  },

  // Sticky Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
    zIndex: 50,
  },
  bottomBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  interestBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Not Found
  notFoundTitle: { fontSize: 20, fontWeight: '800', marginTop: 14 },
  notFoundSubtitle: { fontSize: 14, textAlign: 'center', marginTop: 4 },
});
