import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRecipeStore } from '@/store/useRecipeStore';
import { colors, typography, spacing, borderRadius, shadows } from '@/constants/theme';

export default function SavedScreen() {
  const router = useRouter();
  const savedRecipes = useRecipeStore(state => state.savedRecipes);
  const loadSavedRecipes = useRecipeStore(state => state.loadSavedRecipes);
  const unsaveRecipe = useRecipeStore(state => state.unsaveRecipe);
  const [query, setQuery] = useState('');

  React.useEffect(() => {
    loadSavedRecipes();
  }, [loadSavedRecipes]);

  const filteredRecipes = useMemo(() => {
    if (!query.trim()) return savedRecipes;
    const q = query.trim().toLowerCase();
    return savedRecipes.filter((item) => item.title.toLowerCase().includes(q));
  }, [query, savedRecipes]);

  const handleRecipePress = (recipeId: string) => {
    router.push(`/recipe/${recipeId}`);
  };

  const handleUnsave = (recipeId: string, title: string) => {
    Alert.alert(
      'Remove Recipe',
      `Remove "${title}" from saved recipes?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => unsaveRecipe(recipeId),
        },
      ]
    );
  };

  const renderRecipeCard = ({ item, index }: any) => (
    <Animated.View
      entering={FadeInDown.delay(index * 100).duration(600)}
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
              <Text style={styles.infoText}>{item.payload?.cookingTime ?? '—'} min</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="flame-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>{item.payload?.difficulty ?? '—'}</Text>
            </View>
          </View>
          
          <View style={styles.cuisineTag}>
            <Text style={styles.cuisineText}>{item.payload?.cuisine ?? 'Saved'}</Text>
          </View>
        </View>

        <Pressable
          onPress={() => handleUnsave(item.id, item.title)}
          style={styles.bookmarkButton}
          hitSlop={8}
        >
          <Ionicons name="heart" size={24} color={colors.primary} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="heart-outline" size={80} color={colors.textMuted} />
      <Text style={styles.emptyTitle}>No Saved Recipes</Text>
      <Text style={styles.emptyText}>
        Start scanning your fridge to discover{' \n'}and save delicious recipes
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Saved Recipes</Text>
          <Text style={styles.count}>{filteredRecipes.length} recipes</Text>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search saved recipes"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
        </View>

        <FlatList
          data={filteredRecipes}
          renderItem={renderRecipeCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
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
  content: {
    flex: 1,
  },
  header: {
    padding: spacing.xl,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: typography['4xl'],
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  count: {
    fontSize: typography.base,
    color: colors.textSecondary,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: typography.base,
  },
  list: {
    padding: spacing.xl,
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
    height: 200,
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
    backgroundColor: colors.background + 'CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
    marginTop: spacing.xxxl * 2,
  },
  emptyTitle: {
    fontSize: typography['3xl'],
    fontWeight: typography.bold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.lineHeight.relaxed * typography.base,
  },
});