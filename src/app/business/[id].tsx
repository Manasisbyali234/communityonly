import React, { useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  ActivityIndicator, Linking, Platform, Modal, Pressable, TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import {
  useBusinessQuery, useBusinessReviewsQuery, useSubmitReviewMutation, BusinessReview,
} from '../../api/business';
import { useStartConversationMutation } from '../../api/chat';
import { shareUrl } from '../../utils/shareUtils';

const CATEGORY_COLORS: Record<string, string> = {
  'Agriculture & Farming':      '#16A34A',
  'Construction & Real Estate': '#2563EB',
  'Education & Coaching':       '#D97706',
  'Food & Beverages':           '#EA580C',
  'Healthcare & Wellness':      '#0D9488',
  'IT & Technology':            '#7C3AED',
  'Retail & Shopping':          '#DB2777',
  'Services':                   '#0891B2',
  'Transport & Logistics':      '#CA8A04',
  'Manufacturing':              '#475569',
  'Other':                      '#64748B',
};

function StarRow({ rating, size = 15 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons
          key={s}
          name={rating >= s ? 'star' : rating >= s - 0.5 ? 'star-half' : 'star-outline'}
          size={size}
          color="#F59E0B"
        />
      ))}
    </View>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (r: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', marginVertical: 10 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <TouchableOpacity key={s} onPress={() => onChange(s)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name={value >= s ? 'star' : 'star-outline'} size={32} color="#F59E0B" />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ReviewCard({ review, colors }: { review: BusinessReview; colors: any }) {
  const date = new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return (
    <View style={[styles.reviewItemCard, { borderColor: colors.border }]}>
      <View style={styles.reviewHeader}>
        <View style={[styles.reviewAvatar, { backgroundColor: colors.primaryContainer }]}>
          {review.reviewerAvatarUrl ? (
            <Image source={{ uri: review.reviewerAvatarUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <Text style={[styles.reviewAvatarText, { color: colors.primary }]}>
              {review.reviewerName[0]?.toUpperCase() || 'M'}
            </Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.reviewName, { color: colors.text }]}>{review.reviewerName}</Text>
          <Text style={[styles.reviewDate, { color: colors.textMuted }]}>{date}</Text>
        </View>
        <StarRow rating={review.rating} size={13} />
      </View>
      <Text style={[styles.reviewComment, { color: colors.textSecondary }]}>{review.comment}</Text>
    </View>
  );
}

export default function BusinessDetailScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.showToast);

  const { data: business, isLoading } = useBusinessQuery(id);
  const { data: reviews = [] } = useBusinessReviewsQuery(id);
  const submitReview = useSubmitReviewMutation(id);
  const startConversation = useStartConversationMutation();

  const [photoIndex, setPhotoIndex] = useState(0);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');

  const catColor = business ? (CATEGORY_COLORS[business.category] ?? colors.primary) : colors.primary;

  const handleCall = () => {
    if (business?.phone) Linking.openURL(`tel:${business.phone}`);
  };

  const handleWhatsApp = () => {
    if (business?.whatsapp) {
      const num = business.whatsapp.replace(/[^0-9]/g, '');
      Linking.openURL(`https://wa.me/${num}?text=Hi, I found your business on GowdaCommunity!`);
    }
  };

  const handleWebsite = () => {
    if (business?.website) {
      const url = business.website.startsWith('http') ? business.website : `https://${business.website}`;
      Linking.openURL(url);
    }
  };

  const handleShare = async () => {
    if (!business) return;
    const link = `https://gowdacommunity.com/business/${business.id}`;
    const msg = `Check out ${business.businessName} on GowdaCommunity!\n${business.description}\n\nContact: ${business.phone ?? business.whatsapp ?? ''}\n\n${link}`;
    await shareUrl(msg, link);
  };

  const handleEmail = () => {
    if (business?.email) Linking.openURL(`mailto:${business.email}`);
  };

  const handleContactBusiness = async () => {
    if (!business) return;
    if (!user) {
      router.push('/(auth)/login' as any);
      return;
    }
    if (business.userId === user.id) {
      showToast('This is your business listing.', 'error');
      return;
    }
    try {
      const conversation = await startConversation.mutateAsync({ participantId: business.userId });
      router.push(`/chat/${conversation.id}` as any);
    } catch {
      showToast('Could not open a chat with this business. Please try again.', 'error');
    }
  };

  const handleSubmitReview = async () => {
    if (reviewRating === 0) { showToast('Please select a star rating.', 'error'); return; }
    if (!reviewComment.trim()) { showToast('Please write a review comment.', 'error'); return; }
    try {
      await submitReview.mutateAsync({
        rating: reviewRating,
        comment: reviewComment.trim(),
        reviewerName: user?.displayName ?? 'Community Member',
      });
      setShowReviewModal(false);
      setReviewRating(0);
      setReviewComment('');
      showToast('Review submitted successfully!', 'success');
    } catch {
      showToast('Failed to submit review.', 'error');
    }
  };

  const handleBack = () => {
    if (from === 'discover' || from === 'explore') {
      router.replace('/(tabs)/explore?tab=business' as any);
    } else {
      router.replace('/(tabs)/business' as any);
    }
  };

  const G = colors.primary;
  const BG = colors.background;
  const SURF = colors.surface;
  const BORDER = colors.border;
  const TEXT = colors.text;
  const TEXT2 = colors.textSecondary;
  const TEXT3 = colors.textMuted;

  if (isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: BG, paddingTop: insets.top }]}>
        <View style={[styles.navbar, { backgroundColor: SURF, borderBottomColor: BORDER }]}>
          <TouchableOpacity onPress={handleBack} style={[styles.navBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.primaryContainer }]}>
            <Ionicons name="arrow-back" size={19} color={G} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: TEXT }]}>Business Details</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={G} />
        </View>
      </View>
    );
  }

  if (!business) {
    return (
      <View style={[styles.root, { backgroundColor: BG, paddingTop: insets.top }]}>
        <View style={[styles.navbar, { backgroundColor: SURF, borderBottomColor: BORDER }]}>
          <TouchableOpacity onPress={handleBack} style={[styles.navBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.primaryContainer }]}>
            <Ionicons name="arrow-back" size={19} color={G} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: TEXT }]}>Business Details</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="storefront-outline" size={54} color={TEXT3} />
          <Text style={[styles.notFoundText, { color: TEXT3 }]}>Business not found.</Text>
        </View>
      </View>
    );
  }

  const photos = business.photos ?? [];

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      {/* ── Top Header Bar ── */}
      <View style={[styles.navbar, { backgroundColor: SURF, borderBottomColor: BORDER, paddingTop: insets.top > 0 ? insets.top + 6 : 14 }]}>
        <TouchableOpacity
          onPress={handleBack}
          style={[styles.navBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.primaryContainer }]}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={19} color={G} />
        </TouchableOpacity>

        <Text style={[styles.navTitle, { color: TEXT }]} numberOfLines={1}>
          {business.businessName}
        </Text>

        <TouchableOpacity
          onPress={handleShare}
          style={[styles.navBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.primaryContainer }]}
          activeOpacity={0.7}
        >
          <Ionicons name="share-social-outline" size={18} color={G} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Banner Section ── */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={isDark ? ['#1E293B', '#0F172A'] : [catColor + '20', catColor + '40']}
            style={styles.coverGradientBox}
          >
            {business.coverUrl ? (
              <Image source={{ uri: business.coverUrl }} style={styles.coverImage} contentFit="cover" />
            ) : (
              <View style={styles.coverFallbackPattern}>
                <View style={[styles.fallbackIconRing, { backgroundColor: catColor + '20' }]}>
                  <Ionicons name="storefront" size={32} color={catColor} />
                </View>
              </View>
            )}
          </LinearGradient>

          {/* Floating Profile Info Card */}
          <View style={[styles.profileCard, { backgroundColor: SURF, borderColor: BORDER }]}>
            <View style={styles.profileTopRow}>
              {/* Logo / Avatar */}
              <View style={[styles.businessAvatarWrap, { backgroundColor: catColor + '15', borderColor: SURF }]}>
                {business.logoUrl ? (
                  <Image source={{ uri: business.logoUrl }} style={styles.businessAvatarImg} contentFit="cover" />
                ) : (
                  <Ionicons name="business" size={26} color={catColor} />
                )}
              </View>

              {/* Status / Category Badges */}
              <View style={styles.badgeRow}>
                {business.isVerified && (
                  <View style={[styles.verifiedBadge, { backgroundColor: isDark ? 'rgba(22, 163, 74, 0.2)' : '#DCFCE7' }]}>
                    <Ionicons name="shield-checkmark" size={12} color="#16A34A" />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                )}
                <View style={[styles.catBadge, { backgroundColor: catColor + '15', borderColor: catColor + '30' }]}>
                  <Text style={[styles.catText, { color: catColor }]}>{business.category}</Text>
                </View>
              </View>
            </View>

            {/* Business Title & Owner */}
            <Text style={[styles.businessTitle, { color: TEXT }]}>{business.businessName}</Text>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="person-circle-outline" size={15} color={TEXT3} />
                <Text style={[styles.metaText, { color: TEXT2 }]}>{business.ownerName}</Text>
              </View>
              {business.location ? (
                <>
                  <Text style={styles.metaDot}>•</Text>
                  <View style={styles.metaItem}>
                    <Ionicons name="location-outline" size={15} color={TEXT3} />
                    <Text style={[styles.metaText, { color: TEXT2 }]} numberOfLines={1}>{business.location}</Text>
                  </View>
                </>
              ) : null}
            </View>

            {/* Rating / Review Stats */}
            {(business.reviewCount ?? 0) > 0 ? (
              <View style={styles.ratingBar}>
                <StarRow rating={business.averageRating ?? 0} size={15} />
                <Text style={[styles.ratingScore, { color: TEXT }]}>
                  {(business.averageRating ?? 0).toFixed(1)}
                </Text>
                <Text style={[styles.reviewTotal, { color: TEXT3 }]}>
                  ({business.reviewCount} {business.reviewCount === 1 ? 'review' : 'reviews'})
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Special Offer Banner (if present) ── */}
        {business.offers ? (
          <View style={styles.sectionPad}>
            <LinearGradient
              colors={isDark ? ['#78350F', '#451A03'] : ['#FFFBEB', '#FEF3C7']}
              style={[styles.offerBanner, { borderColor: isDark ? '#92400E' : '#FDE68A' }]}
            >
              <View style={styles.offerIconWrap}>
                <Ionicons name="pricetag" size={18} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.offerHeading}>Special Offer</Text>
                <Text style={[styles.offerBody, { color: isDark ? '#FDE68A' : '#92400E' }]}>{business.offers}</Text>
              </View>
            </LinearGradient>
          </View>
        ) : null}

        {/* ── About Section ── */}
        <View style={styles.sectionPad}>
          <View style={[styles.contentCard, { backgroundColor: SURF, borderColor: BORDER }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardHeaderIcon, { backgroundColor: '#4F46E515' }]}>
                <Ionicons name="document-text-outline" size={16} color="#4F46E5" />
              </View>
              <Text style={[styles.cardHeading, { color: TEXT }]}>About Business</Text>
            </View>
            <Text style={[styles.bodyDescription, { color: TEXT2 }]}>
              {business.description || 'No description provided.'}
            </Text>
          </View>
        </View>

        {/* ── Products & Services ── */}
        {business.productsServices ? (
          <View style={styles.sectionPad}>
            <View style={[styles.contentCard, { backgroundColor: SURF, borderColor: BORDER }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardHeaderIcon, { backgroundColor: '#05966915' }]}>
                  <Ionicons name="cube-outline" size={16} color="#059669" />
                </View>
                <Text style={[styles.cardHeading, { color: TEXT }]}>Products & Services</Text>
              </View>
              <View style={styles.pillContainer}>
                {business.productsServices.split(',').map((item, idx) => {
                  const label = item.trim();
                  if (!label) return null;
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.productPill,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
                          borderColor: BORDER,
                        },
                      ]}
                    >
                      <Ionicons name="checkmark-circle" size={13} color="#16A34A" />
                      <Text style={[styles.productPillText, { color: TEXT }]}>{label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        ) : null}

        {/* ── Location & Address ── */}
        {(business.address || business.location) && (
          <View style={styles.sectionPad}>
            <View style={[styles.contentCard, { backgroundColor: SURF, borderColor: BORDER }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardHeaderIcon, { backgroundColor: '#0891B215' }]}>
                  <Ionicons name="location-outline" size={16} color="#0891B2" />
                </View>
                <Text style={[styles.cardHeading, { color: TEXT }]}>Location & Address</Text>
              </View>
              <View style={styles.locationDetails}>
                <Text style={[styles.locationPrimary, { color: TEXT }]}>{business.location}</Text>
                {business.address && (
                  <Text style={[styles.locationSecondary, { color: TEXT2 }]}>{business.address}</Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* ── Photo Gallery (if any) ── */}
        {photos.length > 0 && (
          <View style={styles.sectionPad}>
            <View style={[styles.contentCard, { backgroundColor: SURF, borderColor: BORDER }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardHeaderIcon, { backgroundColor: '#9333EA15' }]}>
                  <Ionicons name="images-outline" size={16} color="#9333EA" />
                </View>
                <Text style={[styles.cardHeading, { color: TEXT }]}>Photo Gallery</Text>
                <View style={[styles.countTag, { backgroundColor: isDark ? colors.elevation2 : '#F1F5F9' }]}>
                  <Text style={[styles.countTagText, { color: TEXT2 }]}>{photos.length}</Text>
                </View>
              </View>

              <Image source={{ uri: photos[photoIndex] }} style={styles.mainGalleryImg} contentFit="cover" />

              {photos.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryThumbScroll}>
                  {photos.map((p, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => setPhotoIndex(i)}
                      activeOpacity={0.8}
                      style={[
                        styles.galleryThumbWrap,
                        { borderColor: photoIndex === i ? G : 'transparent' },
                      ]}
                    >
                      <Image source={{ uri: p }} style={styles.galleryThumb} contentFit="cover" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        )}

        {/* ── Contact Options Grid ── */}
        <View style={styles.sectionPad}>
          <View style={[styles.contentCard, { backgroundColor: SURF, borderColor: BORDER }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardHeaderIcon, { backgroundColor: '#EA580C15' }]}>
                <Ionicons name="call-outline" size={16} color="#EA580C" />
              </View>
              <Text style={[styles.cardHeading, { color: TEXT }]}>Contact Channels</Text>
            </View>

            <View style={styles.contactGrid}>
              {business.phone && (
                <TouchableOpacity
                  style={[styles.contactChannelItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC', borderColor: BORDER }]}
                  onPress={handleCall}
                  activeOpacity={0.7}
                >
                  <View style={[styles.channelIcon, { backgroundColor: '#05966915' }]}>
                    <Ionicons name="call" size={15} color="#059669" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.channelLabel, { color: TEXT3 }]}>Phone</Text>
                    <Text style={[styles.channelVal, { color: TEXT }]}>{business.phone}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={TEXT3} />
                </TouchableOpacity>
              )}

              {business.whatsapp && (
                <TouchableOpacity
                  style={[styles.contactChannelItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC', borderColor: BORDER }]}
                  onPress={handleWhatsApp}
                  activeOpacity={0.7}
                >
                  <View style={[styles.channelIcon, { backgroundColor: '#25D36618' }]}>
                    <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.channelLabel, { color: TEXT3 }]}>WhatsApp</Text>
                    <Text style={[styles.channelVal, { color: TEXT }]}>{business.whatsapp}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={TEXT3} />
                </TouchableOpacity>
              )}

              {business.email && (
                <TouchableOpacity
                  style={[styles.contactChannelItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC', borderColor: BORDER }]}
                  onPress={handleEmail}
                  activeOpacity={0.7}
                >
                  <View style={[styles.channelIcon, { backgroundColor: '#4F46E515' }]}>
                    <Ionicons name="mail" size={15} color="#4F46E5" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.channelLabel, { color: TEXT3 }]}>Email</Text>
                    <Text style={[styles.channelVal, { color: TEXT }]} numberOfLines={1}>{business.email}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={TEXT3} />
                </TouchableOpacity>
              )}

              {business.website && (
                <TouchableOpacity
                  style={[styles.contactChannelItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC', borderColor: BORDER }]}
                  onPress={handleWebsite}
                  activeOpacity={0.7}
                >
                  <View style={[styles.channelIcon, { backgroundColor: '#0891B215' }]}>
                    <Ionicons name="globe" size={15} color="#0891B2" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.channelLabel, { color: TEXT3 }]}>Website</Text>
                    <Text style={[styles.channelVal, { color: TEXT }]} numberOfLines={1}>{business.website}</Text>
                  </View>
                  <Ionicons name="open-outline" size={14} color={TEXT3} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* ── Reviews Section ── */}
        <View style={styles.sectionPad}>
          <View style={[styles.contentCard, { backgroundColor: SURF, borderColor: BORDER }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardHeaderIcon, { backgroundColor: '#D9770615' }]}>
                <Ionicons name="star-outline" size={16} color="#D97706" />
              </View>
              <Text style={[styles.cardHeading, { color: TEXT }]}>Customer Reviews</Text>
              {user && (
                <TouchableOpacity
                  style={[styles.writeReviewBtn, { backgroundColor: G }]}
                  onPress={() => setShowReviewModal(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="create-outline" size={13} color="#FFF" />
                  <Text style={styles.writeReviewText}>Write Review</Text>
                </TouchableOpacity>
              )}
            </View>

            {reviews.length === 0 ? (
              <View style={styles.emptyReviews}>
                <Ionicons name="chatbubbles-outline" size={28} color={TEXT3} />
                <Text style={[styles.emptyReviewTitle, { color: TEXT }]}>No reviews yet</Text>
                <Text style={[styles.emptyReviewSub, { color: TEXT3 }]}>
                  Be the first community member to leave feedback!
                </Text>
              </View>
            ) : (
              <View style={{ marginTop: 6, gap: 8 }}>
                {reviews.map((r) => <ReviewCard key={r.id} review={r} colors={colors} />)}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* ── Unified Modern Bottom Action Bar ── */}
      <View
        style={[
          styles.bottomActionBar,
          {
            backgroundColor: SURF,
            borderTopColor: BORDER,
            paddingBottom: insets.bottom > 0 ? insets.bottom + 6 : 14,
          },
        ]}
      >
        <View style={styles.bottomButtonsRow}>
          {business.phone ? (
            <TouchableOpacity
              style={[styles.circleActionBtn, { backgroundColor: isDark ? 'rgba(5,150,105,0.15)' : '#ECFDF5', borderColor: isDark ? 'rgba(5,150,105,0.3)' : '#A7F3D0' }]}
              onPress={handleCall}
              activeOpacity={0.7}
              accessibilityLabel="Call"
            >
              <Ionicons name="call" size={18} color="#059669" />
            </TouchableOpacity>
          ) : null}

          {business.whatsapp ? (
            <TouchableOpacity
              style={[styles.circleActionBtn, { backgroundColor: isDark ? 'rgba(37,211,102,0.15)' : '#F0FFF4', borderColor: isDark ? 'rgba(37,211,102,0.3)' : '#BBF7D0' }]}
              onPress={handleWhatsApp}
              activeOpacity={0.7}
              accessibilityLabel="WhatsApp"
            >
              <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
            </TouchableOpacity>
          ) : null}

          {business.website ? (
            <TouchableOpacity
              style={[styles.circleActionBtn, { backgroundColor: isDark ? 'rgba(8,145,178,0.15)' : '#F0F9FF', borderColor: isDark ? 'rgba(8,145,178,0.3)' : '#BAE6FD' }]}
              onPress={handleWebsite}
              activeOpacity={0.7}
              accessibilityLabel="Website"
            >
              <Ionicons name="globe-outline" size={18} color="#0891B2" />
            </TouchableOpacity>
          ) : null}

          {/* Primary Contact CTA Button */}
          <TouchableOpacity
            style={[styles.primaryCtaBtn, { backgroundColor: G }]}
            onPress={handleContactBusiness}
            disabled={startConversation.isPending}
            activeOpacity={0.85}
          >
            {startConversation.isPending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="chatbubble-ellipses" size={17} color="#FFF" />
                <Text style={styles.primaryCtaText}>Contact Business</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Review Modal ── */}
      <Modal visible={showReviewModal} transparent animationType="slide" onRequestClose={() => setShowReviewModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowReviewModal(false)}>
          <Pressable
            style={[styles.reviewSheet, { backgroundColor: SURF, paddingBottom: insets.bottom > 0 ? insets.bottom + 16 : 24 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.sheetHandle, { backgroundColor: BORDER }]} />
            <Text style={[styles.reviewModalTitle, { color: TEXT }]}>Write a Review</Text>
            <Text style={[styles.reviewModalSub, { color: TEXT2 }]}>
              How was your experience with {business.businessName}?
            </Text>
            <StarPicker value={reviewRating} onChange={setReviewRating} />
            <TextInput
              style={[styles.reviewTextInput, { color: TEXT, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB', borderColor: BORDER }]}
              placeholder="Share your experience with the community..."
              placeholderTextColor={TEXT3}
              value={reviewComment}
              onChangeText={setReviewComment}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.reviewSubmitBtn, { backgroundColor: reviewRating > 0 && reviewComment.trim() ? G : TEXT3 }]}
              onPress={handleSubmitReview}
              disabled={submitReview.isPending}
            >
              {submitReview.isPending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.reviewSubmitText}>Submit Review</Text>
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFoundText: { fontSize: 15, fontWeight: '600' },

  // Navbar
  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1, fontSize: 16, fontWeight: '700', textAlign: 'center', marginHorizontal: 10 },
  scrollContent: { padding: 0 },

  // Hero Section
  heroSection: { position: 'relative', marginBottom: 12 },
  coverGradientBox: { height: 110, width: '100%', position: 'relative', overflow: 'hidden' },
  coverImage: { width: '100%', height: '100%' },
  coverFallbackPattern: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fallbackIconRing: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },

  // Profile Info Card
  profileCard: {
    marginHorizontal: 16, marginTop: -32, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  profileTopRow: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    marginBottom: 10,
  },
  businessAvatarWrap: {
    width: 54, height: 54, borderRadius: 16, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  businessAvatarImg: { width: '100%', height: '100%' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1, marginLeft: 8 },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3.5, borderRadius: 10,
  },
  verifiedText: { color: '#16A34A', fontSize: 11.5, fontWeight: '700' },
  catBadge: {
    paddingHorizontal: 9, paddingVertical: 3.5, borderRadius: 10, borderWidth: 1,
  },
  catText: { fontSize: 11.5, fontWeight: '700' },

  businessTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, fontWeight: '500' },
  metaDot: { fontSize: 12 },

  ratingBar: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  ratingScore: { fontSize: 14, fontWeight: '800' },
  reviewTotal: { fontSize: 12.5 },

  // Sections
  sectionPad: { marginHorizontal: 16, marginBottom: 12 },
  contentCard: {
    borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3 },
      android: { elevation: 1 },
    }),
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  cardHeaderIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardHeading: { flex: 1, fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  bodyDescription: { fontSize: 14, lineHeight: 21 },
  countTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  countTagText: { fontSize: 11.5, fontWeight: '700' },

  // Offer
  offerBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 16, borderWidth: 1,
  },
  offerIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(217,119,6,0.15)', alignItems: 'center', justifyContent: 'center' },
  offerHeading: { color: '#D97706', fontSize: 13.5, fontWeight: '800', marginBottom: 2 },
  offerBody: { fontSize: 13, lineHeight: 18, fontWeight: '500' },

  // Products & Services
  pillContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  productPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 11, paddingVertical: 6, borderRadius: 12, borderWidth: 1,
  },
  productPillText: { fontSize: 13, fontWeight: '600' },

  // Location
  locationDetails: { gap: 3 },
  locationPrimary: { fontSize: 14.5, fontWeight: '700' },
  locationSecondary: { fontSize: 13, lineHeight: 18 },

  // Gallery
  mainGalleryImg: { width: '100%', height: 180, borderRadius: 12, marginBottom: 10 },
  galleryThumbScroll: { gap: 8 },
  galleryThumbWrap: { width: 60, height: 60, borderRadius: 10, borderWidth: 2, overflow: 'hidden' },
  galleryThumb: { width: '100%', height: '100%' },

  // Contact Channels
  contactGrid: { gap: 8 },
  contactChannelItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 11, borderRadius: 12, borderWidth: 1,
  },
  channelIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  channelLabel: { fontSize: 11, fontWeight: '600', marginBottom: 1 },
  channelVal: { fontSize: 13.5, fontWeight: '700' },

  // Reviews
  writeReviewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
  },
  writeReviewText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  emptyReviews: { alignItems: 'center', paddingVertical: 18, gap: 6 },
  emptyReviewTitle: { fontSize: 14, fontWeight: '700' },
  emptyReviewSub: { fontSize: 12.5, textAlign: 'center' },
  reviewItemCard: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 10 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  reviewAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  reviewAvatarText: { fontSize: 14, fontWeight: '700' },
  reviewName: { fontSize: 13.5, fontWeight: '700' },
  reviewDate: { fontSize: 11 },
  reviewComment: { fontSize: 13, lineHeight: 18 },

  // Bottom Action Bar
  bottomActionBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  bottomButtonsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  circleActionBtn: {
    width: 44, height: 44, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryCtaBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    height: 44, borderRadius: 14,
  },
  primaryCtaText: { color: '#FFF', fontSize: 14.5, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  reviewSheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingTop: 12 },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  reviewModalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 3 },
  reviewModalSub: { fontSize: 13, marginBottom: 6 },
  reviewTextInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, minHeight: 90, marginVertical: 10 },
  reviewSubmitBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  reviewSubmitText: { color: '#FFF', fontSize: 14.5, fontWeight: '700' },
});
