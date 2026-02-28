import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Button from '@/components/ui/Button';
import { useRecipeStore, Recipe } from '@/store/useRecipeStore';
import { colors, typography, spacing, borderRadius, shadows } from '@/constants/theme';

// Mock recipe lookup (in real app, this would be fetched from API/store)
const MOCK_RECIPE_DETAIL: Record<string, Recipe> = {
  '1': {
    id: '1',
    title: 'Chicken Stir Fry with Bell Peppers',
    image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b',
    cuisine: 'Chinese',
    cookingTime: 25,
    difficulty: 'easy',
    servings: 4,
    ingredients: [
      '500g Chicken Breast, cubed',
      '2 Bell Peppers, sliced',
      '1 Onion, sliced',
      '4 cloves Garlic, minced',
      '3 tbsp Soy Sauce',
      '2 tbsp Olive Oil',
      '1 tbsp Cornstarch',
      'Salt and Pepper to taste',
    ],
    steps: [
      'Cut chicken breast into bite-sized pieces and season with salt and pepper',
      'Heat 1 tablespoon of olive oil in a wok or large pan over high heat',
      'Add chicken and cook for 5-7 minutes until golden brown, then remove and set aside',
      'Add remaining oil to the pan and saut\u00e9 garlic until fragrant (about 30 seconds)',
      'Add bell peppers and onions, stir fry for 3-4 minutes until slightly softened',
      'Return chicken to the pan, add soy sauce and cornstarch mixture',
      'Stir everything together and cook for another 3-5 minutes until sauce thickens',
      'Taste and adjust seasoning. Serve hot with steamed rice or noodles',
    ],
  },
  '2': {
    id: '2',
    title: 'Spanish Tortilla with Tomatoes',
    image: 'https://images.unsplash.com/photo-1598511726623-d2e9996892f0',
    cuisine: 'Mediterranean',
    cookingTime: 30,
    difficulty: 'medium',
    servings: 6,
    ingredients: [
      '6 large Eggs',
      '3 medium Tomatoes, sliced',
      '2 Onions, thinly sliced',
      '1/4 cup Olive Oil',
      'Salt to taste',
      'Black Pepper to taste',
    ],
    steps: [
      'Slice onions and tomatoes very thinly for even cooking',
      'Heat olive oil in a non-stick pan over medium heat',
      'Add onions and cook slowly for 10 minutes until soft and golden',
      'Beat eggs well in a large bowl, season with salt and pepper',
      'Add the cooked onions and sliced tomatoes to the eggs, mix gently',
      'Heat the same pan with a bit more oil if needed',
      'Pour the egg mixture back into the pan, spread evenly',
      'Cook on medium-low heat for 8-10 minutes until edges set',
      'Place a large plate over the pan, flip the tortilla onto it',
      'Slide the tortilla back into the pan to cook the other side for 5 minutes',
      'Let it rest for 5 minutes before slicing and serving',
    ],
  },
  '3': {
    id: '3',
    title: 'Creamy Tomato Pasta',
    image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9',
    cuisine: 'Italian',
    cookingTime: 20,
    difficulty: 'easy',
    servings: 4,
    ingredients: [
      '400g Pasta (penne or fusilli)',
      '4 large Tomatoes, chopped',
      '4 cloves Garlic, minced',
      '1 cup Heavy Cream',
      '1/2 cup Parmesan Cheese, grated',
      '3 tbsp Olive Oil',
      'Fresh Basil leaves',
      'Salt and Pepper to taste',
    ],
    steps: [
      'Bring a large pot of salted water to boil and cook pasta according to package directions',
      'While pasta cooks, heat olive oil in a large pan over medium heat',
      'Saut\u00e9 minced garlic for 1 minute until fragrant',
      'Add chopped tomatoes and cook for 5-7 minutes, breaking them down',
      'Season with salt and pepper',
      'Pour in the heavy cream and stir well',
      'Let the sauce simmer for 3-4 minutes until it thickens slightly',
      'Drain pasta and add it to the sauce, toss to coat',
      'Remove from heat and stir in grated Parmesan cheese',
      'Garnish with fresh basil leaves and serve immediately',
    ],
    missingIngredients: ['Heavy Cream', 'Pasta'],
  },
  '4': {
    id: '4',
    title: 'Garlic Butter Chicken',
    image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6',
    cuisine: 'American',
    cookingTime: 30,
    difficulty: 'easy',
    servings: 4,
    ingredients: [
      '4 Chicken Breasts',
      '6 cloves Garlic, minced',
      '4 tbsp Butter',
      '2 tbsp Fresh Herbs (parsley, thyme)',
      '1 Lemon',
      'Salt and Pepper to taste',
    ],
    steps: [
      'Season chicken breasts generously with salt and pepper on both sides',
      'Melt 2 tablespoons of butter in a large skillet over medium-high heat',
      'Add chicken breasts and cook for 6-7 minutes per side until golden and cooked through',
      'Remove chicken and set aside on a plate',
      'In the same pan, add remaining butter and minced garlic',
      'Cook garlic for 1-2 minutes until fragrant but not burned',
      'Add fresh herbs and squeeze lemon juice into the pan',
      'Return chicken to the pan and spoon the garlic butter sauce over it',
      'Simmer for 2-3 minutes, basting chicken with sauce',
      'Serve hot with your choice of sides',
    ],
    missingIngredients: ['Butter', 'Lemon'],
  },
};

export default function RecipeDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { saveRecipe, unsaveRecipe, isRecipeSaved } = useRecipeStore();
  const [showAllSteps, setShowAllSteps] = useState(false);
  
  const recipe = id ? MOCK_RECIPE_DETAIL[id] : null;
  const saved = recipe ? isRecipeSaved(recipe.id) : false;

  if (!recipe) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.errorContainer}>
          <Ionicons name=\"alert-circle-outline\" size={80} color={colors.error} />
          <Text style={styles.errorTitle}>Recipe Not Found</Text>
          <Button title=\"Go Back\" onPress={() => router.back()} />
        </SafeAreaView>
      </View>
    );
  }

  const handleToggleSave = () => {
    if (saved) {
      unsaveRecipe(recipe.id);
    } else {
      saveRecipe(recipe);
    }
  };

  const handleWatchOnYouTube = async () => {
    const searchQuery = encodeURIComponent(recipe.title + ' recipe');
    const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;
    
    try {
      const supported = await Linking.canOpenURL(youtubeSearchUrl);
      if (supported) {
        await Linking.openURL(youtubeSearchUrl);
      } else {
        Alert.alert('Error', 'Cannot open YouTube');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open YouTube');
    }
  };

  const displayedSteps = showAllSteps ? recipe.steps : recipe.steps.slice(0, 3);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <View style={styles.imageContainer}>
          {recipe.image ? (
            <Image
              source={{ uri: recipe.image }}
              style={styles.heroImage}
              contentFit=\"cover\"
            />
          ) : (
            <View style={[styles.heroImage, styles.placeholderImage]}>
              <Ionicons name=\"restaurant\" size={80} color={colors.textMuted} />
            </View>
          )}
          
          <LinearGradient
            colors={['transparent', colors.background]}
            style={styles.imageGradient}
          />

          {/* Header Buttons */}
          <SafeAreaView style={styles.headerButtons}>
            <Pressable onPress={() => router.back()} style={styles.headerButton}>
              <Ionicons name=\"arrow-back\" size={24} color={colors.text} />
            </Pressable>
            <Pressable onPress={handleToggleSave} style={styles.headerButton}>
              <Ionicons 
                name={saved ? 'bookmark' : 'bookmark-outline'} 
                size={24} 
                color={saved ? colors.primary : colors.text} 
              />
            </Pressable>
          </SafeAreaView>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Animated.View entering={FadeInDown.delay(100).duration(600)}>
            <View style={styles.cuisineTag}>
              <Text style={styles.cuisineText}>{recipe.cuisine}</Text>
            </View>
            
            <Text style={styles.title}>{recipe.title}</Text>

            {/* Recipe Info */}
            <View style={styles.infoRow}>
              <View style={styles.infoCard}>
                <Ionicons name=\"time\" size={20} color={colors.primary} />
                <Text style={styles.infoLabel}>Time</Text>
                <Text style={styles.infoValue}>{recipe.cookingTime} min</Text>
              </View>
              <View style={styles.infoCard}>
                <Ionicons name=\"flame\" size={20} color={colors.accent} />
                <Text style={styles.infoLabel}>Level</Text>
                <Text style={styles.infoValue}>{recipe.difficulty}</Text>
              </View>
              <View style={styles.infoCard}>
                <Ionicons name=\"people\" size={20} color={colors.success} />
                <Text style={styles.infoLabel}>Servings</Text>
                <Text style={styles.infoValue}>{recipe.servings}</Text>
              </View>
            </View>

            {/* Missing Ingredients Warning */}
            {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
              <View style={styles.warningCard}>
                <Ionicons name=\"alert-circle\" size={24} color={colors.warning} />
                <View style={styles.warningText}>
                  <Text style={styles.warningTitle}>Missing Ingredients</Text>
                  <Text style={styles.warningSubtitle}>
                    You'll need: {recipe.missingIngredients.join(', ')}
                  </Text>
                </View>
              </View>
            )}

            {/* Ingredients Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ingredients</Text>
              {recipe.ingredients.map((ingredient, index) => (
                <View key={index} style={styles.ingredientItem}>
                  <View style={styles.bulletPoint} />
                  <Text style={styles.ingredientText}>{ingredient}</Text>
                </View>
              ))}
            </View>

            {/* Steps Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Steps</Text>
              {displayedSteps.map((step, index) => (
                <View key={index} style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
              
              {!showAllSteps && recipe.steps.length > 3 && (
                <Pressable onPress={() => setShowAllSteps(true)} style={styles.showMore}>
                  <Text style={styles.showMoreText}>
                    Show {recipe.steps.length - 3} more steps
                  </Text>
                  <Ionicons name=\"chevron-down\" size={20} color={colors.primary} />
                </Pressable>
              )}
            </View>

            {/* YouTube Button */}
            <View style={styles.section}>
              <Button
                title=\"Watch on YouTube\"
                onPress={handleWatchOnYouTube}
                variant=\"secondary\"
                size=\"lg\"
              />
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.xl,
  },
  errorTitle: {
    fontSize: typography['3xl'],
    fontWeight: typography.bold,
    color: colors.text,
  },
  imageContainer: {
    position: 'relative',
    height: 400,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  headerButtons: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background + 'DD',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  content: {
    padding: spacing.xl,
  },
  cuisineTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  cuisineText: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: typography['4xl'],
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: spacing.lg,
    lineHeight: typography.lineHeight.tight * typography['4xl'],
  },
  infoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  infoCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoLabel: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.text,
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: colors.warning + '15',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  warningText: {
    flex: 1,
  },
  warningTitle: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  warningSubtitle: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography['2xl'],
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 8,
  },
  ingredientText: {
    flex: 1,
    fontSize: typography.base,
    color: colors.text,
    lineHeight: typography.lineHeight.relaxed * typography.base,
  },
  stepItem: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: typography.base,
    fontWeight: typography.bold,
    color: colors.text,
  },
  stepText: {
    flex: 1,
    fontSize: typography.base,
    color: colors.text,
    lineHeight: typography.lineHeight.relaxed * typography.base,
  },
  showMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  showMoreText: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.primary,
  },
});
