import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '@/components/ui/Button';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { colors, typography, spacing } from '@/constants/theme';

export default function ReadyScreen() {
  const router = useRouter();
  const completeOnboarding = useOnboardingStore(state => state.completeOnboarding);

  const handleGetStarted = () => {
    completeOnboarding();
    router.replace('/(tabs)/home');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.primary + '30', colors.accent + '20', colors.background]}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.content}>
        <Animated.View 
          entering={FadeIn.duration(1000)}
          style={styles.iconContainer}
        >
          <Ionicons name="checkmark-circle" size={120} color={colors.success} />
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(300).duration(800)}
          style={styles.textContainer}
        >
          <Text style={styles.title}>
            You're ready to{' \n'}cook smarter
          </Text>
          <Text style={styles.subtitle}>
            Let's scan your fridge and{' \n'}find your first recipe
          </Text>
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(600).duration(800)}
          style={styles.footer}
        >
          <Button
            title="Start Cooking"
            onPress={handleGetStarted}
            size="lg"
          />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'space-between',
  },
  iconContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  title: {
    fontSize: typography['6xl'],
    fontWeight: typography.extrabold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: typography.lineHeight.tight * typography['6xl'],
  },
  subtitle: {
    fontSize: typography.xl,
    fontWeight: typography.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.lineHeight.relaxed * typography.xl,
  },
  footer: {
    marginBottom: spacing.xl,
  },
});