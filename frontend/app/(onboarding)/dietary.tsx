import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import SelectableCard from '@/components/ui/SelectableCard';
import Button from '@/components/ui/Button';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { colors, typography, spacing } from '@/constants/theme';

const DIETARY_OPTIONS = [
  { id: 'vegan', name: 'Vegan', icon: 'leaf' },
  { id: 'vegetarian', name: 'Vegetarian', icon: 'nutrition' },
  { id: 'halal', name: 'Halal', icon: 'moon' },
  { id: 'kosher', name: 'Kosher', icon: 'star' },
  { id: 'keto', name: 'Keto', icon: 'fitness' },
  { id: 'gluten-free', name: 'Gluten Free', icon: 'bandage' },
  { id: 'dairy-free', name: 'Dairy Free', icon: 'water' },
  { id: 'nut-allergy', name: 'Nut Allergy', icon: 'warning' },
] as const;

export default function DietaryScreen() {
  const router = useRouter();
  const { dietaryRestrictions, setDietaryRestrictions } = useOnboardingStore();
  const [selected, setSelected] = useState<string[]>(dietaryRestrictions);

  const handleToggle = (id: string) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(item => item !== id));
    } else {
      setSelected([...selected, id]);
    }
  };

  const handleContinue = () => {
    setDietaryRestrictions(selected);
    router.push('/(onboarding)/cooking-time');
  };

  const handleSkip = () => {
    setDietaryRestrictions([]);
    router.push('/(onboarding)/cooking-time');
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.content}>
        <Animated.View 
          entering={FadeInDown.delay(100).duration(600)}
          style={styles.header}
        >
          <Text style={styles.title}>Dietary Preferences</Text>
          <Text style={styles.subtitle}>
            Select any that apply (optional)
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
            {DIETARY_OPTIONS.map((option) => (
              <View key={option.id} style={styles.gridItem}>
                <SelectableCard
                  title={option.name}
                  icon={option.icon as any}
                  selected={selected.includes(option.id)}
                  onPress={() => handleToggle(option.id)}
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
            title={selected.length > 0 ? 'Continue' : 'Skip'}
            onPress={handleContinue}
            size="lg"
          />
          {selected.length > 0 && (
            <Button
              title="Skip"
              onPress={handleSkip}
              variant="ghost"
              size="md"
              style={{ marginTop: spacing.md }}
            />
          )}
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