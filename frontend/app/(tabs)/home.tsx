import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Button from '@/components/ui/Button';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { useRecipeStore } from '@/store/useRecipeStore';
import { colors, typography, spacing, borderRadius, shadows } from '@/constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const selectedCuisines = useOnboardingStore(state => state.selectedCuisines);
  const scannedIngredients = useRecipeStore(state => state.scannedIngredients);

  const handleScanFridge = () => {
    router.push('/scan/camera');
  };

  const handleViewIngredients = () => {
    if (scannedIngredients.length > 0) {
      router.push('/scan/ingredients');
      return;
    }

    Alert.alert(
      'No ingredients yet',
      'Start with a quick scan so we can identify ingredients for you.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Scan Now', onPress: () => router.push('/scan/camera') },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.primary + '10', colors.background]}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.content}>
        {/* Header */}
        <Animated.View 
          entering={FadeInDown.delay(100).duration(600)}
          style={styles.header}
        >
          <Text style={styles.greeting}>Ready to cook?</Text>
          <Text style={styles.subtitle}>Let's find the perfect recipe</Text>
        </Animated.View>

        {/* Main CTA */}
        <Animated.View 
          entering={FadeInDown.delay(300).duration(600)}
          style={styles.mainSection}
        >
          <View style={styles.scanSection}>
            <Pressable
              onPress={handleScanFridge}
              style={({ pressed }) => [
                styles.scanCard,
                { opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.scanGradient}
              >
                <View style={styles.scanIcon}>
                  <Ionicons name="camera" size={56} color={colors.text} />
                </View>
                <Text style={styles.scanTitle}>Scan Your Fridge</Text>
                <Text style={styles.scanDescription}>
                  Take 2 quick photos and discover recipes
                </Text>
              </LinearGradient>
            </Pressable>

            {scannedIngredients.length > 0 && (
              <Animated.View entering={FadeInDown.delay(400).duration(600)}>
                <Button
                  title={`View ${scannedIngredients.length} Ingredients`}
                  onPress={handleViewIngredients}
                  variant="secondary"
                  size="lg"
                  style={styles.secondaryAction}
                />
              </Animated.View>
            )}
          </View>
        </Animated.View>

        {/* Cuisine Tags */}
        {selectedCuisines.length > 0 && (
          <Animated.View 
            entering={FadeInDown.delay(500).duration(600)}
            style={styles.cuisinesSection}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.cuisinesTitle}>Your Cuisines</Text>
              <Text style={styles.cuisinesSubtitle}>Based on your preferences</Text>
            </View>
            <View style={styles.cuisineTags}>
              {selectedCuisines.slice(0, 8).map((cuisine) => (
                <View key={cuisine} style={styles.cuisineTag}>
                  <Text style={styles.cuisineTagText}>
                    {cuisine.charAt(0).toUpperCase() + cuisine.slice(1)}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  header: {
    marginBottom: spacing.lg,
  },
  greeting: {
    fontSize: typography['5xl'],
    fontWeight: typography.extrabold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.lg,
    color: colors.textSecondary,
  },
  mainSection: {
    flex: 1,
    justifyContent: 'center',
  },
  scanSection: {
    gap: spacing.md,
  },
  scanCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.lg,
  },
  scanGradient: {
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
  },
  scanIcon: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  scanTitle: {
    fontSize: typography['3xl'],
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  scanDescription: {
    fontSize: typography.base,
    color: colors.text,
    opacity: 0.9,
    textAlign: 'center',
  },
  secondaryAction: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 340,
  },
  cuisinesSection: {
    marginTop: spacing.xl,
    paddingTop: spacing.md,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  cuisinesTitle: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  cuisinesSubtitle: {
    fontSize: typography.base,
    color: colors.textSecondary,
  },
  cuisineTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
  },
  cuisineTag: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  cuisineTagText: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
    color: colors.text,
  },
});