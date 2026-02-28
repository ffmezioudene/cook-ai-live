import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '@/components/ui/Button';
import { colors, typography, spacing } from '@/constants/theme';

export default function HeroScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.primary + '20', colors.background]}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.content}>
        <Animated.View 
          entering={FadeIn.duration(800)}
          style={styles.iconContainer}
        >
          <Ionicons name="restaurant" size={80} color={colors.primary} />
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(200).duration(800)}
          style={styles.textContainer}
        >
          <Text style={styles.title}>Smart Cook</Text>
          <Text style={styles.subtitle}>
            Your fridge already knows{' \n'}what you should cook tonight
          </Text>
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(400).duration(800)}
          style={styles.footer}
        >
          <Button
            title="Get Started"
            onPress={() => router.push('/(onboarding)/problem1')}
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
    marginBottom: spacing.md,
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