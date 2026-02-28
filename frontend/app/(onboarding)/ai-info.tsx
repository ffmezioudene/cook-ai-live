import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '@/components/ui/Button';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';

export default function AIInfoScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.content}>
        <Animated.View 
          entering={FadeInDown.delay(100).duration(600)}
          style={styles.header}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="sparkles" size={48} color={colors.primary} />
          </View>
          <Text style={styles.title}>You're in control</Text>
          <Text style={styles.subtitle}>
            Here's how our AI works
          </Text>
        </Animated.View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.delay(300).duration(600)}>
            <View style={styles.card}>
              <Ionicons name="eye" size={32} color={colors.primary} />
              <Text style={styles.cardTitle}>AI Detects Ingredients</Text>
              <Text style={styles.cardDescription}>
                Our AI analyzes your fridge photos and identifies ingredients with confidence scores.
              </Text>
            </View>

            <View style={styles.card}>
              <Ionicons name="checkbox" size={32} color={colors.success} />
              <Text style={styles.cardTitle}>You Confirm Everything</Text>
              <Text style={styles.cardDescription}>
                Tap to confirm detected items or easily edit the list. Nothing happens without your approval.
              </Text>
            </View>

            <View style={styles.card}>
              <Ionicons name="shield-checkmark" size={32} color={colors.accent} />
              <Text style={styles.cardTitle}>No Surprises</Text>
              <Text style={styles.cardDescription}>
                We only suggest recipes you can actually make with what you have confirmed.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>

        <Animated.View 
          entering={FadeInDown.delay(500).duration(600)}
          style={styles.footer}
        >
          <Button
            title="Got It"
            onPress={() => router.push('/(onboarding)/privacy')}
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
  },
  header: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography['4xl'],
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.base,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingTop: 0,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: typography.xl,
    fontWeight: typography.semibold,
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  cardDescription: {
    fontSize: typography.base,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.relaxed * typography.base,
  },
  footer: {
    padding: spacing.xl,
    paddingTop: spacing.md,
  },
});