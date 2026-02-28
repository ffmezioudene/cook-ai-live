import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import SelectableCard from '@/components/ui/SelectableCard';
import Button from '@/components/ui/Button';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { colors, typography, spacing } from '@/constants/theme';

const CUISINES = [
  { id: 'italian', name: 'Italian', icon: 'pizza', color: colors.cuisine.italian },
  { id: 'chinese', name: 'Chinese', icon: 'restaurant', color: colors.cuisine.chinese },
  { id: 'indian', name: 'Indian', icon: 'flame', color: colors.cuisine.indian },
  { id: 'mexican', name: 'Mexican', icon: 'nutrition', color: colors.cuisine.mexican },
  { id: 'japanese', name: 'Japanese', icon: 'fish', color: colors.cuisine.japanese },
  { id: 'thai', name: 'Thai', icon: 'leaf', color: colors.cuisine.thai },
  { id: 'french', name: 'French', icon: 'wine', color: colors.cuisine.french },
  { id: 'mediterranean', name: 'Mediterranean', icon: 'sunny', color: colors.cuisine.mediterranean },
  { id: 'korean', name: 'Korean', icon: 'bonfire', color: colors.cuisine.korean },
  { id: 'american', name: 'American', icon: 'fast-food', color: colors.cuisine.american },
] as const;

export default function CuisinesScreen() {
  const router = useRouter();
  const { selectedCuisines, setSelectedCuisines } = useOnboardingStore();
  const [selected, setSelected] = useState<string[]>(selectedCuisines);

  const handleToggleCuisine = (cuisineId: string) => {
    if (selected.includes(cuisineId)) {
      setSelected(selected.filter(id => id !== cuisineId));
    } else {
      if (selected.length >= 5) {
        Alert.alert('Maximum Reached', 'You can select up to 5 cuisines');
        return;
      }
      setSelected([...selected, cuisineId]);
    }
  };

  const handleContinue = () => {
    if (selected.length !== 5) {
      Alert.alert('Select 5 Cuisines', 'Please select exactly 5 cuisines to continue');
      return;
    }
    setSelectedCuisines(selected);
    router.push('/(onboarding)/dietary');
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.content}>
        <Animated.View 
          entering={FadeInDown.delay(100).duration(600)}
          style={styles.header}
        >
          <Text style={styles.title}>Choose Your{'\n'}Favorite Cuisines</Text>
          <Text style={styles.subtitle}>
            Select exactly 5 cuisines you love{'\n'}
            <Text style={styles.count}>
              {selected.length}/5 selected
            </Text>
          </Text>
        </Animated.View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View 
            entering={FadeInDown.delay(300).duration(600)}
            style={styles.grid}
          >
            {CUISINES.map((cuisine) => (
              <View key={cuisine.id} style={styles.gridItem}>
                <SelectableCard
                  title={cuisine.name}
                  icon={cuisine.icon as any}
                  selected={selected.includes(cuisine.id)}
                  onPress={() => handleToggleCuisine(cuisine.id)}
                  color={cuisine.color}
                />
              </View>
            ))}
          </Animated.View>
        </ScrollView>

        <Animated.View 
          entering={FadeInDown.delay(500).duration(600)}
          style={styles.footer}
        >
          <Button
            title="Continue"
            onPress={handleContinue}
            size="lg"
            disabled={selected.length !== 5}
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
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: typography['4xl'],
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: spacing.md,
    lineHeight: typography.lineHeight.tight * typography['4xl'],
  },
  subtitle: {
    fontSize: typography.base,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.relaxed * typography.base,
  },
  count: {
    color: colors.primary,
    fontWeight: typography.semibold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingTop: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.sm,
  },
  gridItem: {
    width: '50%',
    padding: spacing.sm,
  },
  footer: {
    padding: spacing.xl,
    paddingTop: spacing.md,
  },
});
