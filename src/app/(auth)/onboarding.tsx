import React, { useState } from 'react';
import { Image, ImageSourcePropType, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';
import Button from '../../components/common/Button';
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
    image: require('../../../assets/images/onboarding-pics/photo_5_2026-09-02_23-45-52.jpg'),
  },
  {
    id: 2,
    modules: 'Events \u2022 Communities',
    title: 'Discover Your Community',
    description: "Explore communities, discover upcoming events, and stay connected with what's happening around you.",
    image: require('../../../assets/images/onboarding-pics/photo_1_2026-09-02_23-45-52.jpg'),
  },
  {
    id: 3,
    modules: 'Jobs \u2022 Business \u2022 Krishi Mitra',
    title: 'Opportunities That Bring Us Together',
    description: 'Discover career opportunities, connect with community businesses, and get expert farming support through Krishi Mitra.',
    image: require('../../../assets/images/onboarding-pics/photo_3_2026-09-02_23-45-52.jpg'),
  },
  {
    id: 4,
    modules: 'Community Help \u2022 Achievements',
    title: 'Together, We Can Help',
    description: 'Support community members when they need help and celebrate the achievements that make our community proud.',
    image: require('../../../assets/images/onboarding-pics/photo_4_2026-09-02_23-45-52.jpg'),
  },
  {
    id: 5,
    modules: 'Connect \u2022 Celebrate \u2022 Grow',
    title: 'Our People. Our Stories. Our Sangama.',
    description: 'Celebrate achievements, share experiences, build meaningful connections, and keep our community growing together.',
    image: require('../../../assets/images/onboarding-pics/photo_2_2026-09-02_23-45-52.jpg'),
  },
];

export default function Onboarding() {
  const { colors, isDark, palette, spacing, typography } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();
  const completeOnboarding = useAuthStore((state) => state.completeOnboarding);
  const currentSlide = SLIDES[activeIndex];
  const isLastSlide = activeIndex === SLIDES.length - 1;
  const isCompactHeight = windowHeight < 720;
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <View style={[styles.header, { paddingHorizontal: spacing.xl }]}>
        <View style={styles.headerSpacer} />
        {!isLastSlide && (
          <Button
            title="Skip"
            variant="ghost"
            size="sm"
            onPress={finishOnboarding}
            textStyle={{ color: colors.textSecondary }}
            accessibilityLabel="Skip onboarding"
          />
        )}
      </View>

      <View style={[styles.content, { paddingHorizontal: spacing.xl }]}>
        <Animated.View
          key={currentSlide.id}
          entering={FadeInRight.duration(360)}
          exiting={FadeOutLeft.duration(220)}
          style={styles.slide}
        >
          <LinearGradient
            colors={isDark ? [colors.surfaceVariant, colors.surface] : ['#ECF7F7', '#F7FBF8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.mediaFrame,
              {
                borderColor: isDark ? colors.border : '#D8ECE8',
                height: isCompactHeight ? 220 : 300,
              },
            ]}
          >
            <View style={[styles.mediaAccent, { backgroundColor: palette.primaryLight }]} />
            <Image
              source={currentSlide.image}
              resizeMode="contain"
              style={styles.image}
              accessibilityLabel={currentSlide.title}
            />
          </LinearGradient>

          <View style={[styles.copy, { marginTop: isCompactHeight ? spacing.lg : spacing.xl }]}>
            <Text style={[styles.modules, { color: colors.primary, ...typography.labelMedium }]}>
              {currentSlide.modules}
            </Text>
            <Text style={[styles.title, { color: colors.text, ...typography.headlineMedium }]}>
              {currentSlide.title}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary, ...typography.bodyLarge }]}>
              {currentSlide.description}
            </Text>
          </View>
        </Animated.View>
      </View>

      <View style={[styles.footer, { paddingHorizontal: spacing.xl, paddingBottom: isCompactHeight ? spacing.lg : spacing.xl }]}>
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
                  width: index === activeIndex ? 26 : 7,
                  backgroundColor: index === activeIndex ? colors.primary : colors.border,
                },
              ]}
            />
          ))}
        </View>

        <Button
          title={isLastSlide ? 'Get Started' : 'Next'}
          variant="primary"
          size="lg"
          icon="arrow-forward"
          iconPosition="right"
          onPress={handleNext}
          style={styles.actionButton}
          accessibilityLabel={isLastSlide ? 'Get started with Sangama' : 'Continue to next onboarding screen'}
        />
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
    height: 48,
    justifyContent: 'space-between',
  },
  headerSpacer: {
    height: 36,
    width: 56,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    width: '100%',
  },
  slide: {
    maxWidth: 540,
    width: '100%',
  },
  mediaFrame: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  mediaAccent: {
    borderRadius: 999,
    height: 132,
    opacity: 0.1,
    position: 'absolute',
    right: -36,
    top: -46,
    width: 132,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  copy: {
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  modules: {
    textAlign: 'center',
  },
  title: {
    marginTop: 8,
    textAlign: 'center',
  },
  description: {
    marginTop: 10,
    maxWidth: 470,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    width: '100%',
  },
  indicatorContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 8,
    justifyContent: 'center',
  },
  indicator: {
    borderRadius: 4,
    height: 7,
    marginHorizontal: 3,
  },
  actionButton: {
    height: 52,
    maxWidth: 540,
    width: '100%',
  },
});
