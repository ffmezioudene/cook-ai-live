import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRecipeStore, Recipe } from '@/store/useRecipeStore';
import { getApiBaseUrl } from '@/lib/apiUrl';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { isFreeAccessActive } from '@/lib/freeAccess';
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
  const params = useLocalSearchParams<{ meal?: string; time?: string; cuisine?: string }>();
  const { scannedIngredients, setRecipes, saveRecipe, unsaveRecipe, isRecipeSaved } = useRecipeStore();
  const selectedCuisines = useOnboardingStore(state => state.selectedCuisines);
  const { refresh: refreshSubscription, isPro } = useSubscriptionStore();
  const [recipes, setLocalRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [freeAccessActive, setFreeAccessActive] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mealFilter, setMealFilter] = useState<'any' | 'breakfast' | 'main course' | 'dessert' | 'snack'>('any');
  const [timeFilter, setTimeFilter] = useState<'any' | 15 | 30 | 45>('any');
  const [cuisineFilter, setCuisineFilter] = useState<string>('all');

  useEffect(() => {
    let isMounted = true;
    const checkAccess = async () => {
      const freeActive = await isFreeAccessActive();
      if (isMounted) {
        setFreeAccessActive(freeActive);
      }

      if (!freeActive) {
        const pro = await refreshSubscription();
        if (!pro) {
          router.replace({
            pathname: '/paywall',
            params: { next: '/scan/recipes' },
          });
        }
      }

      if (isMounted) {
        setCheckingAccess(false);
      }
    };

    checkAccess();
    return () => {
      isMounted = false;
    };
  }, [refreshSubscription, router]);

  useEffect(() => {
    if (params.meal && ['breakfast', 'main course', 'dessert', 'snack'].includes(params.meal)) {
      setMealFilter(params.meal as any);
    }
    if (params.time && ['15', '30', '45'].includes(params.time)) {
      setTimeFilter(Number(params.time) as any);
    }
    if (params.cuisine) {
      setCuisineFilter(params.cuisine);
    }
  }, [params.meal, params.time, params.cuisine]);

  useEffect(() => {
    if (checkingAccess || (!freeAccessActive && !isPro)) {
      return;
    }
    // Fetch recipes from backend
    const fetchRecipes = async () => {
      try {
        const API_BASE_URL = getApiBaseUrl();
        
        const ingredientNames = scannedIngredients.map(ing => ing.name);
        const filtersActive =
          timeFilter !== 'any' || mealFilter !== 'any' || cuisineFilter !== 'all';

        const payload: {
          ingredients: string[];
          max_results: number;
          max_time?: number;
          meal_type?: string;
          cuisines?: string[];
        } = {
          ingredients: ingredientNames,
          max_results: filtersActive ? 10 : 40,
        };

        if (timeFilter !== 'any') {
          payload.max_time = timeFilter;
        }
        if (mealFilter !== 'any') {
          payload.meal_type = mealFilter;
        }
        if (cuisineFilter !== 'all') {
          payload.cuisines = [cuisineFilter];
        }
        
        const response = await fetch(`${API_BASE_URL}/recipes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch recipes');
        }
        
        const data = await response.json();
        
        if (data.success && data.recipes) {
          // Transform backend recipes to match our Recipe model
          const transformedRecipes = data.recipes.map((r: any) => ({
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
            dishTypes: r.dish_types || [],
            mealType: r.meal_type ?? null,
          }));
          
          setLocalRecipes(transformedRecipes);
          setRecipes(transformedRecipes);
        } else {
          // Fallback to mock data if API fails
          setLocalRecipes(MOCK_RECIPES);
          setRecipes(MOCK_RECIPES);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch recipes:', error);
        // Fallback to mock data on error
        setLocalRecipes(MOCK_RECIPES);
        setRecipes(MOCK_RECIPES);
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchRecipes, 1500);
    return () => clearTimeout(timer);
  }, [checkingAccess, freeAccessActive, isPro, scannedIngredients, selectedCuisines]);

  const inferMealType = (recipe: Recipe) => {
    if (recipe.mealType) {
      return recipe.mealType;
    }
    if (recipe.dishTypes && recipe.dishTypes.length > 0) {
      const dishTypes = recipe.dishTypes.map(t => t.toLowerCase());
      if (dishTypes.includes('breakfast') || dishTypes.includes('brunch')) return 'breakfast';
      if (dishTypes.includes('dessert')) return 'dessert';
      if (dishTypes.includes('snack') || dishTypes.includes('fingerfood')) return 'snack';
      if (dishTypes.includes('main course') || dishTypes.includes('main dish')) return 'main course';
    }
    const t = recipe.title.toLowerCase();
    if (/(cocktail|mocktail|smoothie|juice|latte|espresso|tea|coffee|mojito|martini|margarita)/.test(t)) {
      return 'snack';
    }
    if (/(pancake|omelet|omelette|breakfast|toast|waffle|granola|cereal|porridge)/.test(t)) return 'breakfast';
    if (/(cake|cookie|brownie|dessert|pie|tart|ice cream)/.test(t)) return 'dessert';
    if (/(snack|appetizer|hors d'oeuvre|hor d'oeuvre)/.test(t)) return 'snack';
    return 'main course';
  };

  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      if (timeFilter !== 'any' && recipe.cookingTime > timeFilter) {
        return false;
      }
      if (cuisineFilter !== 'all') {
        const target = cuisineFilter.toLowerCase();
        const recipeCuisines = (recipe.cuisines && recipe.cuisines.length > 0)
          ? recipe.cuisines.map(c => c.toLowerCase())
          : [recipe.cuisine.toLowerCase()];
        if (!recipeCuisines.includes(target)) {
          return false;
        }
      }
      if (mealFilter !== 'any') {
        const inferred = inferMealType(recipe);
        if (inferred !== mealFilter) {
          return false;
        }
      }
      return true;
    });
  }, [recipes, timeFilter, cuisineFilter, mealFilter]);

  const balancedRecipes = useMemo(() => {
    if (mealFilter !== 'any') {
      return filteredRecipes;
    }

    const main = filteredRecipes.filter(r => inferMealType(r) === 'main course');
    const dessert = filteredRecipes.filter(r => inferMealType(r) === 'dessert');
    const breakfast = filteredRecipes.filter(r => inferMealType(r) === 'breakfast');
    const others = filteredRecipes.filter(r => {
      const t = inferMealType(r);
      return t !== 'main course' && t !== 'dessert' && t !== 'breakfast';
    });

    const total = filteredRecipes.length;
    const targetMain = Math.floor(total * 0.5);
    const targetDessert = Math.floor(total * 0.25);
    const targetBreakfast = total - targetMain - targetDessert;

    const pick = (arr: Recipe[], count: number) => arr.slice(0, Math.min(arr.length, count));
    const result: Recipe[] = [
      ...pick(main, targetMain),
      ...pick(dessert, targetDessert),
      ...pick(breakfast, targetBreakfast),
    ];

    if (result.length < total) {
      const remaining = filteredRecipes.filter(r => !result.includes(r));
      result.push(...remaining.slice(0, total - result.length));
    }

    return result;
  }, [filteredRecipes, mealFilter]);

  const uniqueBalancedRecipes = useMemo(() => {
    const seen = new Set<string>();
    return balancedRecipes.filter((recipe) => {
      if (seen.has(recipe.id)) {
        return false;
      }
      seen.add(recipe.id);
      return true;
    });
  }, [balancedRecipes]);

  const clearFilters = () => {
    setMealFilter('any');
    setTimeFilter('any');
    setCuisineFilter('all');
  };

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
            name={isRecipeSaved(item.id) ? 'heart' : 'heart-outline'} 
            size={24} 
            color={colors.primary} 
          />
        </Pressable>
      </Pressable>
    </Animated.View>
  );

  if (checkingAccess) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.loadingContainer}>
          <Animated.View entering={FadeInDown.duration(600)}>
            <Ionicons name="lock-closed" size={72} color={colors.primary} />
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(200).duration(600)}>
            <Text style={styles.loadingTitle}>Checking access...</Text>
            <Text style={styles.loadingText}>Verifying your subscription</Text>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  if (!freeAccessActive && !isPro) {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.loadingContainer}>
          <Animated.View entering={FadeInDown.duration(600)} style={styles.loadingHeader}>
            <View style={styles.loadingIconWrap}>
              <Ionicons name="sparkles" size={38} color={colors.primary} />
            </View>
            <Text style={styles.loadingTitle}>Chef is thinking…</Text>
            <Text style={styles.loadingText}>
              This can take a few seconds (up to ~30 sec) while we match the best recipes.
            </Text>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(250).duration(600)} style={styles.loadingSteps}>
            <View style={styles.loadingStep}>
              <Ionicons name="flask-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.loadingStepText}>Chef is experimenting…</Text>
            </View>
            <View style={styles.loadingStep}>
              <Ionicons name="eye-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.loadingStepText}>Chef is tasting 👀</Text>
            </View>
            <View style={styles.loadingStep}>
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
              <Text style={styles.loadingStepText}>Chef found something good!</Text>
            </View>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  if (recipes.length > 0 && filteredRecipes.length === 0) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.loadingContainer}>
          <Animated.View entering={FadeInDown.duration(600)}>
            <Ionicons name="alert-circle-outline" size={80} color={colors.textMuted} />
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(200).duration(600)}>
            <Text style={styles.loadingTitle}>No matches</Text>
            <Text style={styles.loadingText}>Try clearing filters to see more recipes.</Text>
          </Animated.View>
          <Pressable onPress={clearFilters} style={styles.clearFiltersButton}>
            <Text style={styles.clearFiltersText}>Clear filters</Text>
          </Pressable>
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
            <Text style={styles.subtitle}>{uniqueBalancedRecipes.length} matches found</Text>
          </View>
          <Pressable
            onPress={() => setFiltersOpen(true)}
            style={styles.filterButton}
          >
            <Ionicons name="options-outline" size={18} color={colors.text} />
          </Pressable>
        </Animated.View>

        <FlatList
          data={uniqueBalancedRecipes}
          renderItem={renderRecipeCard}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>

      <Modal
        transparent
        visible={filtersOpen}
        animationType="fade"
        onRequestClose={() => setFiltersOpen(false)}
      >
        <Pressable style={styles.filterBackdrop} onPress={() => setFiltersOpen(false)}>
          <View style={styles.filterPopup}>
            <Text style={styles.filtersTitle}>Filters</Text>

            <View style={styles.filterRow}>
              {(['any', 'breakfast', 'main course', 'dessert', 'snack'] as const).map(option => (
                <Pressable
                  key={option}
                  onPress={() => setMealFilter(option)}
                  style={[
                    styles.filterChip,
                    mealFilter === option && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      mealFilter === option && styles.filterChipTextActive,
                    ]}
                  >
                    {option === 'any' ? 'Any' : option}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.filterRow}>
              {(['any', 15, 30, 45] as const).map(option => (
                <Pressable
                  key={option}
                  onPress={() => setTimeFilter(option)}
                  style={[
                    styles.filterChip,
                    timeFilter === option && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      timeFilter === option && styles.filterChipTextActive,
                    ]}
                  >
                    {option === 'any' ? 'Any time' : `<=${option} min`}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.filterRow}>
              {selectedCuisines.map(cuisine => (
                <Pressable
                  key={cuisine}
                  onPress={() => setCuisineFilter(cuisine)}
                  style={[
                    styles.filterChip,
                    cuisineFilter === cuisine && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      cuisineFilter === cuisine && styles.filterChipTextActive,
                    ]}
                  >
                    {cuisine}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable onPress={clearFilters} style={styles.clearFiltersButton}>
              <Text style={styles.clearFiltersText}>Clear filters</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
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
    paddingHorizontal: spacing.xl,
  },
  loadingHeader: {
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingIconWrap: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
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
    lineHeight: typography.lineHeight.relaxed * typography.base,
  },
  loadingSteps: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  loadingStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  loadingStepText: {
    fontSize: typography.base,
    color: colors.textSecondary,
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
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: spacing.md,
    paddingTop: 0,
  },
  filterBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: spacing.xl,
    paddingRight: spacing.lg,
  },
  filterPopup: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    width: 260,
    ...shadows.md,
  },
  filtersTitle: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    backgroundColor: colors.primary + '30',
  },
  filterChipText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.text,
    fontWeight: typography.semibold,
  },
  clearFiltersButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
  },
  clearFiltersText: {
    fontSize: typography.base,
    color: colors.text,
    fontWeight: typography.semibold,
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