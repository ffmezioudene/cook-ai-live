import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Button from '@/components/ui/Button';
import { getApiBaseUrl } from '@/lib/apiUrl';
import { useRecipeStore, Recipe } from '@/store/useRecipeStore';
import { colors, typography, spacing, borderRadius, shadows } from '@/constants/theme';

const MOCK_RECIPES: Record<string, Recipe> = {
  '1': {
    id: '1',
    title: 'Chicken Stir Fry with Bell Peppers',
    image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b',
    cuisine: 'Chinese',
    cookingTime: 25,
    difficulty: 'easy',
    servings: 4,
    ingredients: ['500g Chicken Breast', '2 Bell Peppers', '1 Onion', '4 cloves Garlic', '3 tbsp Soy Sauce', '2 tbsp Olive Oil'],
    steps: ['Cut chicken into pieces', 'Heat oil in wok', 'Cook chicken until golden', 'Add vegetables and stir fry', 'Add sauce and cook for 5 minutes', 'Serve hot with rice'],
  },
  '2': {
    id: '2',
    title: 'Spanish Tortilla with Tomatoes',
    image: 'https://images.unsplash.com/photo-1598511726623-d2e9996892f0',
    cuisine: 'Mediterranean',
    cookingTime: 30,
    difficulty: 'medium',
    servings: 6,
    ingredients: ['6 Eggs', '3 Tomatoes', '2 Onions', 'Olive Oil', 'Salt', 'Pepper'],
    steps: ['Slice onions and tomatoes', 'Cook onions until soft', 'Beat eggs in bowl', 'Mix everything together', 'Pour into pan and cook', 'Flip and finish cooking'],
  },
  '3': {
    id: '3',
    title: 'Creamy Tomato Pasta',
    image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9',
    cuisine: 'Italian',
    cookingTime: 20,
    difficulty: 'easy',
    servings: 4,
    ingredients: ['400g Pasta', '4 Tomatoes', '4 cloves Garlic', '1 cup Cream', 'Parmesan Cheese', 'Olive Oil'],
    steps: ['Cook pasta', 'Saute garlic', 'Add tomatoes', 'Stir in cream', 'Toss with pasta', 'Top with cheese'],
    missingIngredients: ['Cream', 'Pasta'],
  },
  '4': {
    id: '4',
    title: 'Garlic Butter Chicken',
    image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6',
    cuisine: 'American',
    cookingTime: 30,
    difficulty: 'easy',
    servings: 4,
    ingredients: ['4 Chicken Breasts', '6 cloves Garlic', '4 tbsp Butter', 'Fresh Herbs', 'Lemon'],
    steps: ['Season chicken', 'Melt butter', 'Add garlic', 'Cook chicken', 'Add herbs and lemon', 'Simmer'],
    missingIngredients: ['Butter', 'Lemon'],
  },
};

export default function RecipeDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const recipeId = params.id == null ? null : Array.isArray(params.id) ? params.id[0] : params.id;
  const { recipes, savedRecipes, saveRecipe, unsaveRecipe, isRecipeSaved } = useRecipeStore();
  const [showAllSteps, setShowAllSteps] = useState(false);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const API_BASE_URL = getApiBaseUrl();

  // Resolve recipe: store (API results) first, then saved, then mock fallback
  const fallbackRecipe = useMemo(() => {
    if (!recipeId) return null;
    const savedPayload = savedRecipes.find((r) => r.id === recipeId)?.payload;
    return (
      recipes.find((r) => r.id === recipeId) ??
      savedPayload ??
      MOCK_RECIPES[recipeId] ??
      null
    );
  }, [recipeId, recipes, savedRecipes]);

  const parseJsonResponse = async (response: Response) => {
    const text = await response.text();
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      return { ok: false, data: null as null | any, raw: text };
    }
    try {
      return { ok: true, data: JSON.parse(text), raw: text };
    } catch {
      return { ok: false, data: null as null | any, raw: text };
    }
  };

  useEffect(() => {
    const fetchRecipe = async () => {
      if (!recipeId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${API_BASE_URL}/recipe/${recipeId}`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        });

        const parsed = await parseJsonResponse(response);
        if (!parsed.ok || !response.ok) {
          throw new Error('Failed to fetch recipe detail');
        }

        const r = parsed.data;
        const mapped: Recipe = {
          id: r.id,
          title: r.title,
          image: r.image || undefined,
          cuisine: r.cuisine,
          cuisines: r.cuisines || [],
          cookingTime: r.cooking_time,
          difficulty: r.difficulty as 'easy' | 'medium' | 'hard',
          servings: r.servings,
          ingredients: r.ingredients,
          steps: r.steps,
          missingIngredients: r.missing_ingredients || [],
          calories: r.calories ?? null,
          usedIngredientsCount: r.used_ingredients_count ?? 0,
          missingIngredientsCount: r.missing_ingredients_count ?? 0,
          matchScore: r.match_score ?? 0,
          dishTypes: r.dish_types || [],
          mealType: r.meal_type ?? null,
          summary: r.summary ?? null,
        };
        setRecipe(mapped);
      } catch (err) {
        setError('Unable to load recipe details.');
        setRecipe(fallbackRecipe ?? null);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [API_BASE_URL, recipeId, fallbackRecipe]);
  const saved = recipe ? isRecipeSaved(recipe.id) : false;

  if (!recipe && !loading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={80} color={colors.error} />
          <Text style={styles.errorTitle}>Recipe Not Found</Text>
          <Button title="Go Back" onPress={() => router.back()} />
        </SafeAreaView>
      </View>
    );
  }

  if (loading && !recipe) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.errorContainer}>
          <Ionicons name="restaurant" size={80} color={colors.primary} />
          <Text style={styles.errorTitle}>Loading recipe...</Text>
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
    const youtubeUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;
    
    try {
      const supported = await Linking.canOpenURL(youtubeUrl);
      if (supported) {
        await Linking.openURL(youtubeUrl);
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
        <View style={styles.imageContainer}>
          {recipe.image ? (
            <Image
              source={{ uri: recipe.image }}
              style={styles.heroImage}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.heroImage, styles.placeholderImage]}>
              <Ionicons name="restaurant" size={80} color={colors.textMuted} />
            </View>
          )}
          
          <LinearGradient
            colors={['transparent', colors.background]}
            style={styles.imageGradient}
          />

          <SafeAreaView style={styles.headerButtons}>
            <Pressable onPress={() => router.back()} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </Pressable>
            <Pressable onPress={handleToggleSave} style={styles.headerButton}>
              <Ionicons 
                name={saved ? 'heart' : 'heart-outline'} 
                size={24} 
                color={saved ? colors.primary : colors.text} 
              />
            </Pressable>
          </SafeAreaView>
        </View>

        <View style={styles.content}>
          <Animated.View entering={FadeInDown.delay(100).duration(600)}>
            <View style={styles.cuisineTag}>
              <Text style={styles.cuisineText}>{recipe.cuisine}</Text>
            </View>
            
            <Text style={styles.title}>{recipe.title}</Text>

            <View style={styles.infoRow}>
              <View style={styles.infoCard}>
                <Ionicons name="time" size={20} color={colors.primary} />
                <Text style={styles.infoLabel}>Time</Text>
                <Text style={styles.infoValue}>{recipe.cookingTime} min</Text>
              </View>
              <View style={styles.infoCard}>
                <Ionicons name="flame" size={20} color={colors.accent} />
                <Text style={styles.infoLabel}>Level</Text>
                <Text style={styles.infoValue}>{recipe.difficulty}</Text>
              </View>
              <View style={styles.infoCard}>
                <Ionicons name="people" size={20} color={colors.success} />
                <Text style={styles.infoLabel}>Servings</Text>
                <Text style={styles.infoValue}>{recipe.servings}</Text>
              </View>
            </View>

            {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
              <View style={styles.warningCard}>
                <Ionicons name="alert-circle" size={24} color={colors.warning} />
                <View style={styles.warningText}>
                  <Text style={styles.warningTitle}>Missing Ingredients</Text>
                  <Text style={styles.warningSubtitle}>
                    You will need: {recipe.missingIngredients.join(', ')}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ingredients</Text>
              {recipe.ingredients.map((ingredient, index) => (
                <View key={index} style={styles.ingredientItem}>
                  <View style={styles.bulletPoint} />
                  <Text style={styles.ingredientText}>{ingredient}</Text>
                </View>
              ))}
            </View>

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
                  <Ionicons name="chevron-down" size={20} color={colors.primary} />
                </Pressable>
              )}
            </View>

            <View style={styles.section}>
              <Button
                title="Watch on YouTube"
                onPress={handleWatchOnYouTube}
                variant="secondary"
                size="lg"
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
