import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '@/components/ui/Button';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';

export default function Magic2Screen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.content}>
        <Animated.View 
          entering={FadeInDown.delay(100).duration(600)}
          style={styles.iconContainer}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="sparkles" size={60} color={colors.accent} />
          </View>
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(300).duration(600)}
          style={styles.textContainer}
        >
          <Text style={styles.step}>Step 2</Text>
          <Text style={styles.title}>AI understands{' \n'}ingredients</Text>
          <Text style={styles.description}>
            Advanced AI instantly recognizes{' \n'}everything in your fridge
          </Text>
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(500).duration(600)}
          style={styles.footer}
        >
          <Button
            title="Next"
            onPress={() => router.push('/(onboarding)/magic3')}
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
    backgroundColor: colors.accent + '20',
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
    color: colors.accent,
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