import React, { useState } from 'react';
import { Image, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useAuthStore } from '../../store/authStore';

type Slide = {
  id: number;
  modules: string;
  title: string;
  description: string;
  image: ImageSourcePropType;
};

const SLIDES: Slide[] = [
  {
    id: 1,
    modules: 'People \u2022 Matrimony',
    title: 'Connecting Our People',
    description: 'Meet community members and discover meaningful connections within a trusted community network.',
    image: require('../../../assets/images/onboarding-pics/photo_5_2026-09-02_23-45-52-removebg-preview.png'),
  },
  {
    id: 2,
    modules: 'Events \u2022 Communities',
    title: 'Discover Your Community',
    description: "Explore communities, discover upcoming events, and stay connected with what's happening around you.",
    image: require('../../../assets/images/onboarding-pics/photo_1_2026-09-02_23-45-52-removebg-preview.png'),
  },
  {
    id: 3,
    modules: 'Jobs \u2022 Business \u2022 Krishi Mitra',
    title: 'Opportunities That Bring Us Together',
    description: 'Discover career opportunities, connect with community businesses, and get expert farming support through Krishi Mitra.',
    image: require('../../../assets/images/onboarding-pics/photo_3_2026-09-02_23-45-52-removebg-preview.png'),
  },
  {
    id: 4,
    modules: 'Community Help \u2022 Achievements',
    title: 'Together, We Can Help',
    description: 'Support community members when they need help and celebrate the achievements that make our community proud.',
    image: require('../../../assets/images/onboarding-pics/photo_4_2026-09-02_23-45-52-removebg-preview.png'),
  },
  {
    id: 5,
    modules: 'Connect \u2022 Celebrate \u2022 Grow',
    title: 'Our People. Our Stories. Our Sangama.',
    description: 'Celebrate achievements, share experiences, build meaningful connections, and keep our community growing together.',
    image: require('../../../assets/images/onboarding-pics/photo_2_2026-09-02_23-45-52-removebg-preview.png'),
  },
];

export default function Onboarding() {
  const { colors, isDark, spacing, typography } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();
  const completeOnboarding = useAuthStore((state) => state.completeOnboarding);
  const currentSlide = SLIDES[activeIndex];
  const isLastSlide = activeIndex === SLIDES.length - 1;
  const isCompactHeight = windowHeight < 720;
  const mediaHeight = isCompactHeight ? 220 : Math.min(340, Math.max(260, windowHeight * 0.43));
  const progressLabel = `Screen ${activeIndex + 1} of ${SLIDES.length}`;

  const finishOnboarding = () => {
    completeOnboarding();
    router.replace('/(auth)/login');
  };

  const handleNext = () => {
    if (isLastSlide) {
      finishOnboarding();
      return;
    }

    setActiveIndex((previousIndex) => previousIndex + 1);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.background : '#FBF8F2' }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <View style={[styles.header, { paddingHorizontal: spacing.xl }]}>
        <View style={styles.headerSpacer} />
        {!isLastSlide && (
          <TouchableOpacity
            onPress={finishOnboarding}
            style={styles.skipButton}
            accessibilityLabel="Skip onboarding"
          >
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.content, { paddingHorizontal: spacing.xl }]}>
        <Animated.View
          key={currentSlide.id}
          entering={FadeInRight.duration(360)}
          exiting={FadeOutLeft.duration(220)}
          style={styles.slide}
        >
          <View style={[styles.mediaFrame, { height: mediaHeight }]}>
            <Image
              source={currentSlide.image}
              resizeMode="contain"
              style={styles.image}
              accessibilityLabel={currentSlide.title}
            />
          </View>

          <View style={[styles.copy, { marginTop: isCompactHeight ? spacing.sm : spacing.md }]}>
            <Text style={[styles.slideNumber, { color: isDark ? colors.textMuted : '#A38D64' }]}>
              {String(currentSlide.id).padStart(2, '0')}
            </Text>
            <Text style={[typography.labelMedium, styles.modules, { color: colors.primary }]}>
              {currentSlide.modules}
            </Text>
            <Text style={[typography.headlineMedium, styles.title, { color: isDark ? colors.text : '#244328' }]}>
              {currentSlide.title}
            </Text>
            <Text style={[typography.bodyLarge, styles.description, { color: colors.textSecondary }]}>
              {currentSlide.description}
            </Text>
          </View>
        </Animated.View>
      </View>

      <View style={[styles.footer, { paddingHorizontal: spacing.xl, paddingBottom: isCompactHeight ? spacing.md : spacing.xl }]}>
        <View
          style={[styles.indicatorContainer, { marginBottom: spacing.lg }]}
          accessibilityRole="progressbar"
          accessibilityLabel={progressLabel}
          accessibilityValue={{ min: 1, max: SLIDES.length, now: activeIndex + 1 }}
        >
          {SLIDES.map((slide, index) => (
            <View
              key={slide.id}
              style={[
                styles.indicator,
                {
                  width: 5,
                  backgroundColor: index === activeIndex ? colors.primary : (isDark ? colors.border : '#CFC9BD'),
                },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={handleNext}
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          accessibilityLabel={isLastSlide ? 'Get started with Sangama' : 'Continue to next onboarding screen'}
        >
          <Text style={styles.actionText}>{isLastSlide ? 'Get Started' : 'Next'}</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={styles.actionIcon} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 44,
    justifyContent: 'space-between',
  },
  headerSpacer: {
    height: 32,
    width: 44,
  },
  skipButton: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: 4,
    width: 44,
  },
  skipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'space-evenly',
    width: '100%',
  },
  slide: {
    maxWidth: 410,
    width: '100%',
  },
  mediaFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  copy: {
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  slideNumber: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 7,
  },
  modules: {
    fontSize: 11,
    lineHeight: 15,
    maxWidth: 280,
    textAlign: 'center',
  },
  title: {
    fontSize: 25,
    lineHeight: 30,
    marginTop: 7,
    maxWidth: 330,
    textAlign: 'center',
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 9,
    maxWidth: 315,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    width: '100%',
  },
  indicatorContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 7,
    justifyContent: 'center',
  },
  indicator: {
    borderRadius: 3,
    height: 5,
    marginHorizontal: 4,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 14,
    flexDirection: 'row',
    height: 50,
    justifyContent: 'center',
    maxWidth: 410,
    width: '100%',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  actionIcon: {
    marginLeft: 7,
  },
});
