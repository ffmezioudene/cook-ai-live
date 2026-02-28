import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRecipeStore, Recipe } from '@/store/useRecipeStore';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { colors, typography, spacing, borderRadius, shadows } from '@/constants/theme';

// MOCKED Recipe Data
const MOCK_RECIPES: Recipe[] = [
  {
    id: '1',
    title: 'Chicken Stir Fry with Bell Peppers',
    image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b',
    cuisine: 'Chinese',
    cookingTime: 25,
    difficulty: 'easy',
    servings: 4,
    ingredients: ['Chicken Breast', 'Bell Peppers', 'Onions', 'Garlic', 'Soy Sauce', 'Olive Oil'],
    steps: [
      'Cut chicken into bite-sized pieces',
      'Heat oil in a wok or large pan',
      'Cook chicken until golden',
      'Add vegetables and stir fry',
      'Add sauce and cook for 5 minutes',
      'Serve hot with rice'
    ],
  },
  {
    id: '2',
    title: 'Spanish Tortilla with Tomatoes',
    image: 'https://images.unsplash.com/photo-1598511726623-d2e9996892f0',
    cuisine: 'Mediterranean',
    cookingTime: 30,
    difficulty: 'medium',
    servings: 6,
    ingredients: ['Eggs', 'Tomatoes', 'Onions', 'Olive Oil', 'Salt', 'Pepper'],
    steps: [
      'Slice onions and tomatoes thinly',
      'Cook onions in olive oil until soft',
      'Beat eggs in a bowl',
      'Add cooked onions and tomatoes to eggs',
      'Pour mixture back into pan',
      'Cook until set, flip and cook other side'
    ],
  },
  {
    id: '3',
    title: 'Creamy Tomato Pasta',
    image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9',
    cuisine: 'Italian',
    cookingTime: 20,
    difficulty: 'easy',
    servings: 4,
    ingredients: ['Tomatoes', 'Garlic', 'Cream', 'Pasta', 'Olive Oil', 'Cheese'],
    steps: [
      'Cook pasta according to package',
      'Sauté garlic in olive oil',
      'Add chopped tomatoes',
      'Stir in cream',
      'Toss with pasta',
      'Top with cheese'
    ],
    missingIngredients: ['Cream', 'Pasta'],
  },
  {
    id: '4',
    title: 'Garlic Butter Chicken',
    image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6',
    cuisine: 'American',
    cookingTime: 30,
    difficulty: 'easy',
    servings: 4,
    ingredients: ['Chicken Breast', 'Garlic', 'Butter', 'Herbs', 'Lemon'],
    steps: [
      'Season chicken with salt and pepper',
      'Melt butter in a large pan',
      'Add minced garlic',
      'Cook chicken until golden on both sides',
      'Add herbs and lemon juice',
      'Simmer for 10 minutes'
    ],
    missingIngredients: ['Butter', 'Lemon'],
  },
];

export default function RecipesScreen() {
  const router = useRouter();
  const { scannedIngredients, setRecipes, saveRecipe, unsaveRecipe, isRecipeSaved } = useRecipeStore();
  const selectedCuisines = useOnboardingStore(state => state.selectedCuisines);
  const [recipes, setLocalRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate recipe fetching
    const timer = setTimeout(() => {
      // Filter by selected cuisines if any
      const filteredRecipes = selectedCuisines.length > 0
        ? MOCK_RECIPES.filter(r => selectedCuisines.includes(r.cuisine.toLowerCase()))
        : MOCK_RECIPES;
      
      setLocalRecipes(filteredRecipes.length > 0 ? filteredRecipes : MOCK_RECIPES);
      setRecipes(MOCK_RECIPES);
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleRecipePress = (recipeId: string) => {
    router.push(`/recipe/${recipeId}`);
  };

  const handleToggleSave = (recipe: Recipe) => {
    if (isRecipeSaved(recipe.id)) {
      unsaveRecipe(recipe.id);
    } else {
      saveRecipe(recipe);
    }
  };

  const renderRecipeCard = ({ item, index }: { item: Recipe; index: number }) => (
    <Animated.View
      entering={FadeInDown.delay(200 + index * 100).duration(600)}
      style={styles.cardContainer}
    >
      <Pressable
        onPress={() => handleRecipePress(item.id)}
        style={({ pressed }) => [
          styles.card,
          { opacity: pressed ? 0.9 : 1 },
        ]}
      >
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={styles.recipeImage}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.recipeImage, styles.placeholderImage]}>
            <Ionicons name="restaurant" size={48} color={colors.textMuted} />
          </View>
        )}
        
        <View style={styles.cardContent}>
          <Text style={styles.recipeTitle} numberOfLines={2}>
            {item.title}
          </Text>
          
          <View style={styles.recipeInfo}>
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>{item.cookingTime} min</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="flame-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>{item.difficulty}</Text>
            </View>
            {item.servings && (
              <View style={styles.infoItem}>
                <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.infoText}>{item.servings}</Text>
              </View>
            )}
          </View>

          {item.missingIngredients && item.missingIngredients.length > 0 && (
            <View style={styles.missingContainer}>
              <Ionicons name="alert-circle-outline" size={14} color={colors.warning} />
              <Text style={styles.missingText}>
                Missing {item.missingIngredients.length} ingredient(s)
              </Text>
            </View>
          )}
          
          <View style={styles.cuisineTag}>
            <Text style={styles.cuisineText}>{item.cuisine}</Text>
          </View>
        </View>

        <Pressable
          onPress={() => handleToggleSave(item)}
          style={styles.bookmarkButton}
          hitSlop={8}
        >
          <Ionicons 
            name={isRecipeSaved(item.id) ? 'bookmark' : 'bookmark-outline'} 
            size={24} 
            color={colors.primary} 
          />
        </Pressable>
      </Pressable>
    </Animated.View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.loadingContainer}>
          <Animated.View entering={FadeInDown.duration(600)}>
            <Ionicons name="restaurant" size={80} color={colors.primary} />
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(200).duration(600)}>
            <Text style={styles.loadingTitle}>Finding recipes...</Text>
            <Text style={styles.loadingText}>
              Based on {scannedIngredients.length} ingredients
            </Text>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.content}>
        <Animated.View 
          entering={FadeInDown.delay(100).duration(600)}
          style={styles.header}
        >
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>Your Recipes</Text>
            <Text style={styles.subtitle}>{recipes.length} matches found</Text>
          </View>
        </Animated.View>

        <FlatList
          data={recipes}
          renderItem={renderRecipeCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  loadingTitle: {
    fontSize: typography['3xl'],
    fontWeight: typography.bold,
    color: colors.text,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: typography.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: typography['2xl'],
    fontWeight: typography.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  list: {
    padding: spacing.md,
    paddingTop: 0,
  },
  cardContainer: {
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  recipeImage: {
    width: '100%',
    height: 220,
    backgroundColor: colors.surfaceElevated,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    padding: spacing.md,
  },
  recipeTitle: {
    fontSize: typography.xl,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  recipeInfo: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  missingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.warning + '20',
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  missingText: {
    fontSize: typography.xs,
    color: colors.warning,
    fontWeight: typography.semibold,
  },
  cuisineTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  cuisineText: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  bookmarkButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background + 'DD',
    alignItems: 'center',
    justifyContent: 'center',
  },
});