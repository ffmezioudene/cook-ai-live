import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '@/components/ui/Button';
import { useRecipeStore, ScannedIngredient } from '@/store/useRecipeStore';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { setFirstScanTimestampIfMissing } from '@/lib/freeAccess';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';

export default function IngredientsScreen() {
  const router = useRouter();
  const { setScannedIngredients, confirmIngredient, removeIngredient, addIngredient, scannedIngredients: storeIngredients } = useRecipeStore();
  const selectedCuisines = useOnboardingStore(state => state.selectedCuisines);
  const [ingredients, setIngredients] = useState<ScannedIngredient[]>([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if we have ingredients from the scan
    if (storeIngredients && storeIngredients.length > 0) {
      setIngredients(storeIngredients);
      setLoading(false);
    } else {
      // No scanned ingredients available
      setIngredients([]);
      setLoading(false);
    }
  }, [storeIngredients]);

  const handleConfirm = (name: string) => {
    setIngredients(prev => prev.map(ing => 
      ing.name === name ? { ...ing, confirmed: true } : ing
    ));
  };

  const handleRemove = (name: string) => {
    Alert.alert(
      'Remove Ingredient',
      `Remove "${name}" from the list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => setIngredients(prev => prev.filter(ing => ing.name !== name)),
        },
      ]
    );
  };

  const handleAddNew = () => {
    if (newIngredient.trim()) {
      setIngredients(prev => [
        ...prev,
        { name: newIngredient.trim(), confidence: 1, confirmed: true }
      ]);
      setNewIngredient('');
    }
  };

  const handleFindRecipes = async () => {
    const confirmedIngredients = ingredients.filter(ing => ing.confirmed);
    
    if (confirmedIngredients.length === 0) {
      Alert.alert('No Ingredients', 'Please confirm at least one ingredient');
      return;
    }

    setScannedIngredients(confirmedIngredients);
    await setFirstScanTimestampIfMissing();
    router.push('/scan/recipes');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.loadingContainer}>
          <Animated.View entering={FadeInDown.duration(600)}>
            <Ionicons name="sparkles" size={80} color={colors.primary} />
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(200).duration(600)}>
            <Text style={styles.loadingTitle}>Analyzing your fridge...</Text>
            <Text style={styles.loadingText}>AI is detecting ingredients</Text>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  const confirmedCount = ingredients.filter(ing => ing.confirmed).length;

  if (!loading && ingredients.length === 0) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.loadingContainer}>
          <Animated.View entering={FadeInDown.duration(600)}>
            <Ionicons name="alert-circle-outline" size={80} color={colors.textMuted} />
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(200).duration(600)}>
            <Text style={styles.loadingTitle}>No ingredients detected</Text>
            <Text style={styles.loadingText}>Please scan again for accurate results.</Text>
          </Animated.View>
          <Button
            title="Scan Again"
            onPress={() => router.replace('/scan/camera')}
            size="lg"
            style={{ marginTop: spacing.lg }}
          />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.content}>
        {/* Header */}
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
            <Text style={styles.title}>Confirm Ingredients</Text>
            <Text style={styles.subtitle}>{confirmedCount} confirmed</Text>
          </View>
        </Animated.View>

        {/* Ingredients List */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.delay(300).duration(600)}>
            {ingredients.map((ingredient, index) => (
              <Animated.View
                key={ingredient.name}
                entering={FadeInDown.delay(400 + index * 50).duration(600)}
                style={styles.ingredientCard}
              >
                <View style={styles.ingredientLeft}>
                  <Pressable
                    onPress={() => handleConfirm(ingredient.name)}
                    style={[
                      styles.checkbox,
                      ingredient.confirmed && styles.checkboxChecked,
                    ]}
                  >
                    {ingredient.confirmed && (
                      <Ionicons name="checkmark" size={18} color={colors.text} />
                    )}
                  </Pressable>
                  <View style={styles.ingredientInfo}>
                    <Text style={[
                      styles.ingredientName,
                      ingredient.confirmed && styles.ingredientNameConfirmed,
                    ]}>
                      {ingredient.name}
                    </Text>
                    <Text style={styles.confidence}>
                      {Math.round(ingredient.confidence * 100)}% confidence
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => handleRemove(ingredient.name)}
                  style={styles.removeButton}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={24} color={colors.error} />
                </Pressable>
              </Animated.View>
            ))}
          </Animated.View>

          {/* Add New Ingredient */}
          <Animated.View 
            entering={FadeInDown.delay(600).duration(600)}
            style={styles.addSection}
          >
            <Text style={styles.addTitle}>Add Missing Ingredient</Text>
            <View style={styles.addInputContainer}>
              <TextInput
                style={styles.input}
                placeholder="e.g., Basil, Salt, Butter"
                placeholderTextColor={colors.textMuted}
                value={newIngredient}
                onChangeText={setNewIngredient}
                onSubmitEditing={handleAddNew}
              />
              <Pressable
                onPress={handleAddNew}
                style={[
                  styles.addButton,
                  !newIngredient.trim() && styles.addButtonDisabled,
                ]}
                disabled={!newIngredient.trim()}
              >
                <Ionicons name="add" size={24} color={colors.text} />
              </Pressable>
            </View>
          </Animated.View>

        </ScrollView>

        {/* Footer */}
        <Animated.View 
          entering={FadeInDown.delay(800).duration(600)}
          style={styles.footer}
        >
          <Button
            title={`Find Recipes (${confirmedCount})`}
            onPress={handleFindRecipes}
            size="lg"
            disabled={confirmedCount === 0}
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
    paddingTop: spacing.sm,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  ingredientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  ingredientLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: typography.base,
    fontWeight: typography.medium,
    color: colors.textSecondary,
  },
  ingredientNameConfirmed: {
    color: colors.text,
  },
  confidence: {
    fontSize: typography.xs,
    color: colors.textMuted,
  },
  removeButton: {
    padding: spacing.xs,
  },
  addSection: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  addTitle: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  addInputContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.base,
    color: colors.text,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  footer: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
});