import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
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

  const handleViewRecipes = () => {
    if (scannedIngredients.length > 0) {
      router.push('/scan/recipes');
    }
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
                <Ionicons name="camera" size={64} color={colors.text} />
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
                onPress={handleViewRecipes}
                variant="secondary"
                size="lg"
                style={{ marginTop: spacing.lg }}
              />
            </Animated.View>
          )}
        </Animated.View>

        {/* Cuisine Tags */}
        {selectedCuisines.length > 0 && (
          <Animated.View 
            entering={FadeInDown.delay(500).duration(600)}
            style={styles.cuisinesSection}
          >
            <Text style={styles.cuisinesTitle}>Your Cuisines</Text>
            <View style={styles.cuisineTags}>
              {selectedCuisines.slice(0, 5).map((cuisine) => (
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
    padding: spacing.xl,
  },
  header: {
    marginBottom: spacing.xl,
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
  scanCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.lg,
  },
  scanGradient: {
    padding: spacing.xxxl,
    alignItems: 'center',
  },
  scanIcon: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
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
  cuisinesSection: {
    marginTop: spacing.xl,
  },
  cuisinesTitle: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  cuisineTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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