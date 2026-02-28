import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '@/components/ui/Button';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';

export default function Magic3Screen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.content}>
        <Animated.View 
          entering={FadeInDown.delay(100).duration(600)}
          style={styles.iconContainer}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="fast-food" size={60} color={colors.success} />
          </View>
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(300).duration(600)}
          style={styles.textContainer}
        >
          <Text style={styles.step}>Step 3</Text>
          <Text style={styles.title}>Recipes appear{' \n'}instantly</Text>
          <Text style={styles.description}>
            Get personalized recipes you can{' \n'}actually make right now
          </Text>
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(500).duration(600)}
          style={styles.footer}
        >
          <Button
            title="Let's Personalize"
            onPress={() => router.push('/(onboarding)/cuisines')}
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
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: borderRadius.full,
    backgroundColor: colors.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  step: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.success,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography['5xl'],
    fontWeight: typography.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: typography.lineHeight.tight * typography['5xl'],
  },
  description: {
    fontSize: typography.lg,
    fontWeight: typography.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.lineHeight.relaxed * typography.lg,
  },
  footer: {
    marginBottom: spacing.xl,
  },
});