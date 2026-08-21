import React, { useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  ActivityIndicator, FlatList, Linking, Platform, Modal, Pressable, TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import {
  useBusinessQuery, useBusinessReviewsQuery, useSubmitReviewMutation, BusinessReview,
} from '../../api/business';
import { shareUrl } from '../../utils/shareUtils';

const CATEGORY_COLORS: Record<string, string> = {
  'Agriculture & Farming':      '#2D6A2D',
  'Construction & Real Estate': '#1565C0',
  'Education & Coaching':       '#F9A825',
  'Food & Beverages':           '#E65100',
  'Healthcare & Wellness':      '#059669',
  'IT & Technology':            '#9333EA',
  'Retail & Shopping':          '#DB2777',
  'Services':                   '#0891B2',
  'Transport & Logistics':      '#D97706',
  'Manufacturing':              '#475569',
  'Other':                      '#6B7280',
};

function StarRow({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons
          key={s}
          name={rating >= s ? 'star' : rating >= s - 0.5 ? 'star-half' : 'star-outline'}
          size={size}
          color="#F9A825"
        />
      ))}
    </View>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (r: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', marginVertical: 8 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <TouchableOpacity key={s} onPress={() => onChange(s)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name={value >= s ? 'star' : 'star-outline'} size={30} color="#F9A825" />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ReviewCard({ review, colors }: { review: BusinessReview; colors: any }) {
  const date = new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return (
    <View style={[styles.reviewCard, { borderColor: colors.border }]}>
      <View style={styles.reviewHeader}>
        <View style={[styles.reviewAvatar, { backgroundColor: colors.primaryContainer }]}>
          {review.reviewerAvatarUrl ? (
            <Image source={{ uri: review.reviewerAvatarUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <Text style={[styles.reviewAvatarText, { color: colors.primary }]}>
              {review.reviewerName[0]?.toUpperCase()}
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.showToast);

  const { data: business, isLoading } = useBusinessQuery(id);
  const { data: reviews = [] } = useBusinessReviewsQuery(id);
  const submitReview = useSubmitReviewMutation(id);

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
    if (business?.website) Linking.openURL(business.website);
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

  if (isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.navbar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.navBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }]}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.text }]}>Business Details</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!business) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.navbar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.navBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }]}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.text }]}>Business Details</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="storefront-outline" size={54} color={colors.textMuted} />
          <Text style={[styles.notFoundText, { color: colors.textMuted }]}>Business not found.</Text>
        </View>
      </View>
    );
  }

  const photos = business.photos ?? [];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Navbar */}
      <View style={[styles.navbar, { backgroundColor: colors.cardBg, borderBottomColor: colors.border, paddingTop: insets.top > 0 ? insets.top + 6 : 14 }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.navBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }]}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.text }]} numberOfLines={1}>{business.businessName}</Text>
        <TouchableOpacity onPress={handleShare} style={[styles.navBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }]}>
          <Ionicons name="share-social-outline" size={19} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]} showsVerticalScrollIndicator={false}>

        {/* Cover Image */}
        <View style={styles.coverWrap}>
          {business.coverUrl ? (
            <Image source={{ uri: business.coverUrl }} style={styles.coverImage} contentFit="cover" />
          ) : (
            <View style={[styles.coverImage, styles.coverFallback, { backgroundColor: catColor + '22' }]}>
              <Ionicons name="storefront" size={60} color={catColor} />
            </View>
          )}
          {/* Gradient overlay */}
          <View style={styles.coverGradient} />
        </View>

        {/* Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: colors.cardBg, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]}>
          {/* Logo overlapping cover */}
          <View style={[styles.heroLogoWrap, { backgroundColor: colors.cardBg, borderColor: isDark ? colors.surface : '#FFF' }]}>
            {business.logoUrl ? (
              <Image source={{ uri: business.logoUrl }} style={styles.heroLogo} contentFit="cover" />
            ) : (
              <View style={[styles.heroLogo, { backgroundColor: catColor + '20', alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="business" size={30} color={catColor} />
              </View>
            )}
          </View>

          {/* Verified Badge */}
          {business.isVerified && (
            <View style={[styles.verifiedPill, { backgroundColor: isDark ? 'rgba(45,106,45,0.2)' : '#DCFCE7' }]}>
              <Ionicons name="shield-checkmark" size={14} color="#16A34A" />
              <Text style={styles.verifiedPillText}>⭐ Community Verified</Text>
            </View>
          )}

          <Text style={[styles.heroName, { color: colors.text }]}>{business.businessName}</Text>
          <View style={styles.heroOwnerRow}>
            <Ionicons name="person-circle-outline" size={16} color={colors.textMuted} />
            <Text style={[styles.heroOwnerText, { color: colors.textSecondary }]}>{business.ownerName}</Text>
          </View>

          {/* Category Pill */}
          <View style={[styles.heroCatPill, { backgroundColor: catColor + '18', borderColor: catColor + '40' }]}>
            <Text style={[styles.heroCatText, { color: catColor }]}>{business.category}</Text>
          </View>

          {/* Star rating summary */}
          {(business.reviewCount ?? 0) > 0 && (
            <View style={styles.ratingRow}>
              <StarRow rating={business.averageRating ?? 0} size={16} />
              <Text style={[styles.ratingValue, { color: colors.text }]}>{(business.averageRating ?? 0).toFixed(1)}</Text>
              <Text style={[styles.ratingCount, { color: colors.textMuted }]}>({business.reviewCount} reviews)</Text>
            </View>
          )}
        </View>

        {/* About */}
        <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: isDark ? 'rgba(79,70,229,0.2)' : '#EEF2FF' }]}>
              <Ionicons name="information-circle-outline" size={17} color="#4F46E5" />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
          </View>
          <Text style={[styles.sectionBody, { color: colors.textSecondary }]}>{business.description}</Text>
        </View>

        {/* Products & Services */}
        <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: isDark ? 'rgba(45,106,45,0.2)' : '#F4F9F4' }]}>
              <Ionicons name="cube-outline" size={17} color={colors.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Products & Services</Text>
          </View>
          <View style={styles.servicesContainer}>
            {business.productsServices.split(',').map((service, i) => (
              <View key={i} style={[styles.serviceTag, { backgroundColor: isDark ? 'rgba(45,106,45,0.15)' : '#F4F9F4', borderColor: isDark ? 'rgba(76,175,80,0.25)' : '#D1E7D1' }]}>
                <Ionicons name="checkmark-circle-outline" size={12} color={colors.primary} />
                <Text style={[styles.serviceTagText, { color: colors.text }]}>{service.trim()}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Location */}
        <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: isDark ? 'rgba(5,150,105,0.2)' : '#ECFDF5' }]}>
              <Ionicons name="navigate-outline" size={17} color="#059669" />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>
          </View>
          <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={17} color="#059669" style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.locationCity, { color: colors.text }]}>{business.location}</Text>
              {business.address && (
                <Text style={[styles.locationAddress, { color: colors.textSecondary }]}>{business.address}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Business Photos */}
        {photos.length > 0 && (
          <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: isDark ? 'rgba(147,51,234,0.2)' : '#FAF5FF' }]}>
                <Ionicons name="images-outline" size={17} color="#9333EA" />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Photos</Text>
              <Text style={[styles.photoBadge, { color: colors.textMuted }]}>{photos.length}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {photos.map((uri, i) => (
                <TouchableOpacity key={i} onPress={() => setPhotoIndex(i)} activeOpacity={0.85}>
                  <Image
                    source={{ uri }}
                    style={[styles.galleryPhoto, { borderColor: photoIndex === i ? colors.primary : 'transparent', borderWidth: photoIndex === i ? 2 : 0 }]}
                    contentFit="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
            {/* Featured photo */}
            <Image source={{ uri: photos[photoIndex] }} style={styles.featuredPhoto} contentFit="cover" />
          </View>
        )}

        {/* Offers */}
        {business.offers && (
          <View style={[styles.offerCard, { backgroundColor: isDark ? 'rgba(249,168,37,0.12)' : '#FFFBEB', borderColor: isDark ? 'rgba(249,168,37,0.3)' : '#FDE68A' }]}>
            <Ionicons name="pricetag" size={20} color="#D97706" />
            <View style={{ flex: 1 }}>
              <Text style={styles.offerTitle}>Special Offer</Text>
              <Text style={[styles.offerText, { color: isDark ? '#FDE68A' : '#92400E' }]}>{business.offers}</Text>
            </View>
          </View>
        )}

        {/* Contact Info */}
        <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: isDark ? 'rgba(147,51,234,0.2)' : '#FAF5FF' }]}>
              <Ionicons name="call-outline" size={17} color="#9333EA" />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact Details</Text>
          </View>
          <View style={{ gap: 8 }}>
            {business.phone && (
              <TouchableOpacity style={[styles.contactRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F9FAFB' }]} onPress={handleCall}>
                <Ionicons name="call" size={16} color="#059669" />
                <Text style={[styles.contactText, { color: colors.text }]}>{business.phone}</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </TouchableOpacity>
            )}
            {business.whatsapp && (
              <TouchableOpacity style={[styles.contactRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F9FAFB' }]} onPress={handleWhatsApp}>
                <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                <Text style={[styles.contactText, { color: colors.text }]}>{business.whatsapp}</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </TouchableOpacity>
            )}
            {business.email && (
              <TouchableOpacity style={[styles.contactRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F9FAFB' }]} onPress={handleEmail}>
                <Ionicons name="mail" size={16} color="#4F46E5" />
                <Text style={[styles.contactText, { color: colors.text }]}>{business.email}</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </TouchableOpacity>
            )}
            {business.website && (
              <TouchableOpacity style={[styles.contactRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F9FAFB' }]} onPress={handleWebsite}>
                <Ionicons name="globe" size={16} color="#0891B2" />
                <Text style={[styles.contactText, { color: colors.text }]} numberOfLines={1}>{business.website}</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Reviews */}
        <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]}>
          <View style={[styles.sectionHeader, { marginBottom: 0 }]}>
            <View style={[styles.sectionIcon, { backgroundColor: isDark ? 'rgba(249,168,37,0.2)' : '#FFFBEB' }]}>
              <Ionicons name="star-outline" size={17} color="#D97706" />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Reviews</Text>
            <Text style={[styles.photoBadge, { color: colors.textMuted }]}>{reviews.length}</Text>
            {user && (
              <TouchableOpacity
                style={[styles.addReviewBtn, { backgroundColor: colors.primary }]}
                onPress={() => setShowReviewModal(true)}
              >
                <Ionicons name="add" size={14} color="#FFF" />
                <Text style={styles.addReviewBtnText}>Add Review</Text>
              </TouchableOpacity>
            )}
          </View>
          {reviews.length === 0 ? (
            <Text style={[styles.noReviewsText, { color: colors.textMuted }]}>
              No reviews yet. Be the first to review!
            </Text>
          ) : (
            <View style={{ marginTop: 12, gap: 10 }}>
              {reviews.map((r) => <ReviewCard key={r.id} review={r} colors={colors} />)}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Bottom Bar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.cardBg, borderTopColor: colors.border, paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 16 }]}>
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {business.phone && (
            <TouchableOpacity style={[styles.quickBtn, { backgroundColor: isDark ? 'rgba(5,150,105,0.2)' : '#ECFDF5' }]} onPress={handleCall} accessibilityLabel="Call">
              <Ionicons name="call" size={20} color="#059669" />
              <Text style={[styles.quickBtnText, { color: '#059669' }]}>Call</Text>
            </TouchableOpacity>
          )}
          {business.whatsapp && (
            <TouchableOpacity style={[styles.quickBtn, { backgroundColor: isDark ? 'rgba(37,211,102,0.15)' : '#F0FFF4' }]} onPress={handleWhatsApp} accessibilityLabel="WhatsApp">
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
              <Text style={[styles.quickBtnText, { color: '#25D366' }]}>WhatsApp</Text>
            </TouchableOpacity>
          )}
          {business.website && (
            <TouchableOpacity style={[styles.quickBtn, { backgroundColor: isDark ? 'rgba(8,145,178,0.18)' : '#F0F9FF' }]} onPress={handleWebsite} accessibilityLabel="Website">
              <Ionicons name="globe-outline" size={20} color="#0891B2" />
              <Text style={[styles.quickBtnText, { color: '#0891B2' }]}>Website</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.quickBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }]} onPress={handleShare} accessibilityLabel="Share">
            <Ionicons name="share-social-outline" size={20} color={colors.text} />
            <Text style={[styles.quickBtnText, { color: colors.text }]}>Share</Text>
          </TouchableOpacity>
        </View>
        {/* Primary Contact CTA */}
        <TouchableOpacity
          style={[styles.contactCTA, { backgroundColor: colors.primary }]}
          onPress={business.phone ? handleCall : business.whatsapp ? handleWhatsApp : handleEmail}
          activeOpacity={0.85}
        >
          <Ionicons name="chatbubble-ellipses" size={19} color="#FFF" />
          <Text style={styles.contactCTAText}>Contact Business</Text>
        </TouchableOpacity>
      </View>

      {/* Review Modal */}
      <Modal visible={showReviewModal} transparent animationType="slide" onRequestClose={() => setShowReviewModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowReviewModal(false)}>
          <Pressable
            style={[styles.reviewSheet, { backgroundColor: colors.cardBg, paddingBottom: insets.bottom > 0 ? insets.bottom + 16 : 24 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.reviewModalTitle, { color: colors.text }]}>Write a Review</Text>
            <Text style={[styles.reviewModalSub, { color: colors.textSecondary }]}>
              How was your experience with {business.businessName}?
            </Text>
            <StarPicker value={reviewRating} onChange={setReviewRating} />
            <TextInput
              style={[styles.reviewTextInput, { color: colors.text, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB', borderColor: colors.border }]}
              placeholder="Share your experience..."
              placeholderTextColor={colors.textMuted}
              value={reviewComment}
              onChangeText={setReviewComment}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.reviewSubmitBtn, { backgroundColor: reviewRating > 0 && reviewComment.trim() ? colors.primary : colors.textMuted }]}
              onPress={handleSubmitReview}
              disabled={submitReview.isPending}
            >
              {submitReview.isPending
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Text style={styles.reviewSubmitText}>Submit Review</Text>
              }
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
  notFoundText: { fontSize: 16, fontWeight: '600' },
  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1, fontSize: 16, fontWeight: '700', textAlign: 'center', marginHorizontal: 10 },
  scrollContent: { padding: 0 },

  // Cover
  coverWrap: { height: 220, position: 'relative' },
  coverImage: { width: '100%', height: '100%' },
  coverFallback: { alignItems: 'center', justifyContent: 'center' },
  coverGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, backgroundColor: 'rgba(0,0,0,0.1)' },

  // Hero Card
  heroCard: {
    margin: 16, marginTop: -24, borderRadius: 20, borderWidth: 1, padding: 16,
    paddingTop: 36, alignItems: 'center',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 }, android: { elevation: 4 } }),
  },
  heroLogoWrap: {
    position: 'absolute', top: -30, alignSelf: 'center',
    width: 60, height: 60, borderRadius: 16, borderWidth: 3, overflow: 'hidden',
  },
  heroLogo: { width: '100%', height: '100%' },
  verifiedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 6,
  },
  verifiedPillText: { color: '#16A34A', fontSize: 12.5, fontWeight: '700' },
  heroName: { fontSize: 21, fontWeight: '800', textAlign: 'center', letterSpacing: -0.3, marginBottom: 4 },
  heroOwnerRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroOwnerText: { fontSize: 14, fontWeight: '500' },
  heroCatPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, borderWidth: 1, marginTop: 8, marginBottom: 6 },
  heroCatText: { fontSize: 13, fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  ratingValue: { fontSize: 15, fontWeight: '800' },
  ratingCount: { fontSize: 13 },

  // Section Cards
  sectionCard: {
    marginHorizontal: 16, marginBottom: 14, borderRadius: 18, borderWidth: 1, padding: 16,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }, android: { elevation: 2 } }),
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { flex: 1, fontSize: 15.5, fontWeight: '700' },
  sectionBody: { fontSize: 14.5, lineHeight: 22 },
  photoBadge: { fontSize: 13, fontWeight: '600' },
  addReviewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  addReviewBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

  // Services
  servicesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serviceTag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1 },
  serviceTagText: { fontSize: 13, fontWeight: '600' },

  // Location
  locationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  locationCity: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  locationAddress: { fontSize: 13.5, lineHeight: 18 },

  // Gallery
  galleryPhoto: { width: 72, height: 72, borderRadius: 12 },
  featuredPhoto: { width: '100%', height: 200, borderRadius: 14, marginTop: 10 },

  // Offer Card
  offerCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    marginHorizontal: 16, marginBottom: 14, padding: 14, borderRadius: 16, borderWidth: 1,
  },
  offerTitle: { color: '#D97706', fontSize: 13, fontWeight: '800', marginBottom: 3 },
  offerText: { fontSize: 13.5, lineHeight: 19 },

  // Contact
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12 },
  contactText: { flex: 1, fontSize: 14, fontWeight: '500' },

  // Reviews
  reviewCard: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 12 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  reviewAvatarText: { fontSize: 16, fontWeight: '700' },
  reviewName: { fontSize: 14, fontWeight: '700' },
  reviewDate: { fontSize: 12, marginTop: 1 },
  reviewComment: { fontSize: 14, lineHeight: 20 },
  noReviewsText: { fontSize: 14, marginTop: 12, textAlign: 'center' },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth, gap: 10,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 10 }, android: { elevation: 8 } }),
  },
  quickActions: { flexDirection: 'row', gap: 8 },
  quickBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 12, gap: 3 },
  quickBtnText: { fontSize: 11.5, fontWeight: '600' },
  contactCTA: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
  },
  contactCTAText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  // Review Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  reviewSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  reviewModalTitle: { fontSize: 19, fontWeight: '800', marginBottom: 4 },
  reviewModalSub: { fontSize: 13.5, marginBottom: 8 },
  reviewTextInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14.5, minHeight: 100, marginVertical: 12 },
  reviewSubmitBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  reviewSubmitText: { color: '#FFF', fontSize: 15.5, fontWeight: '700' },
});
