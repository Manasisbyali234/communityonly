import React, { useState } from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { useTheme } from '../../theme';
import Button from '../../components/common/Button';
import { useAuthStore } from '../../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
  {
    id: 1,
    title: 'Find Your Circle',
    description: 'Connect, engage, and grow with specialized interest communities built by passionate creators.',
    icon: 'people-circle-outline',
  },
  {
    id: 2,
    title: 'Share Your Story',
    description: 'Post text, high-res images, and video reels. Share setups, travel stories, and milestones.',
    icon: 'sparkles-outline',
  },
  {
    id: 3,
    title: 'Premium UX & Interaction',
    description: 'Experience ultra-smooth gesture controls, dark modes, fast loading speeds, and beautiful layouts.',
    icon: 'heart-circle-outline',
  },
];

export default function Onboarding() {
  const { colors, spacing, typography, palette, roundness } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();
  const completeOnboarding = useAuthStore((state) => state.completeOnboarding);

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      setActiveIndex((prev) => prev + 1);
    } else {
      completeOnboarding();
      router.replace('/(auth)/login');
    }
  };

  const handleSkip = () => {
    completeOnboarding();
    router.replace('/(auth)/login');
  };

  const currentSlide = SLIDES[activeIndex];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Skip */}
      <View style={styles.header}>
        <View />
        {activeIndex < SLIDES.length - 1 && (
          <Button
            title="Skip"
            variant="ghost"
            onPress={handleSkip}
            size="sm"
            textStyle={{ color: colors.textSecondary }}
          />
        )}
      </View>

      {/* Slide Content */}
      <View style={styles.slideContainer}>
        <Animated.View
          key={activeIndex}
          entering={FadeInRight.duration(400)}
          exiting={FadeOutLeft.duration(400)}
          style={styles.slideCard}
        >
          {/* Accent Sphere */}
          <LinearGradient
            colors={[palette.gradientStart, palette.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.iconWrapper, { borderRadius: roundness.xxl }]}
          >
            <Ionicons name={currentSlide.icon as any} size={64} color={palette.white} />
          </LinearGradient>

          <Text
            style={[
              styles.title,
              {
                color: colors.text,
                fontSize: typography.sizes.xxxl,
                fontWeight: typography.weights.black,
                marginTop: spacing.xl,
              },
            ]}
          >
            {currentSlide.title}
          </Text>

          <Text
            style={[
              styles.description,
              {
                color: colors.textSecondary,
                fontSize: typography.sizes.md,
                marginTop: spacing.md,
                lineHeight: 22,
              },
            ]}
          >
            {currentSlide.description}
          </Text>
        </Animated.View>
      </View>

      {/* Footer controls */}
      <View style={styles.footer}>
        {/* Page Indicators */}
        <View style={styles.indicatorContainer}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                {
                  width: index === activeIndex ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: index === activeIndex ? colors.primary : colors.border,
                },
              ]}
            />
          ))}
        </View>

        {/* Next Button */}
        <Button
          title={activeIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          variant={activeIndex === SLIDES.length - 1 ? 'gradient' : 'primary'}
          onPress={handleNext}
          style={styles.actionBtn}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 48,
    alignItems: 'center',
  },
  slideContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  slideCard: {
    width: '100%',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    maxWidth: '85%',
  },
  footer: {
    paddingHorizontal: 30,
    paddingBottom: 30,
    alignItems: 'center',
  },
  indicatorContainer: {
    flexDirection: 'row',
    marginBottom: 30,
  },
  indicator: {
    marginHorizontal: 4,
  },
  actionBtn: {
    width: '100%',
    height: 52,
  },
});
