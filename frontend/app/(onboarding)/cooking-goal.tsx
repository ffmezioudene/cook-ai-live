import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import SelectableCard from '@/components/ui/SelectableCard';
import Button from '@/components/ui/Button';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { colors, typography, spacing } from '@/constants/theme';

const GOAL_OPTIONS = [
  { id: 'healthy', name: 'Healthy', icon: 'heart', color: colors.success },
  { id: 'protein', name: 'High Protein', icon: 'barbell', color: colors.primary },
  { id: 'comfort', name: 'Comfort Food', icon: 'home', color: colors.accent },
  { id: 'budget', name: 'Budget Friendly', icon: 'cash', color: colors.info },
] as const;

export default function CookingGoalScreen() {
  const router = useRouter();
  const { cookingGoal, setCookingGoal } = useOnboardingStore();
  const [selected, setSelected] = useState<'healthy' | 'protein' | 'comfort' | 'budget' | null>(cookingGoal);

  const handleContinue = () => {
    if (!selected) return;
    setCookingGoal(selected);
    router.push('/(onboarding)/ai-info');
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.content}>
        <Animated.View 
          entering={FadeInDown.delay(100).duration(600)}
          style={styles.header}
        >
          <Text style={styles.title}>What's your{' \n'}cooking goal?</Text>
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(300).duration(600)}
          style={styles.grid}
        >
          {GOAL_OPTIONS.map((option) => (
            <View key={option.id} style={styles.gridItem}>
              <SelectableCard
                title={option.name}
                icon={option.icon as any}
                selected={selected === option.id}
                onPress={() => setSelected(option.id)}
                color={option.color}
              />
            </View>
          ))}
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(500).duration(600)}
          style={styles.footer}
        >
          <Button
            title="Continue"
            onPress={handleContinue}
            size="lg"
            disabled={!selected}
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
    padding: spacing.xl,
    justifyContent: 'space-between',
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography['4xl'],
    fontWeight: typography.bold,
    color: colors.text,
    lineHeight: typography.lineHeight.tight * typography['4xl'],
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.sm,
    alignContent: 'center',
  },
  gridItem: {
    width: '50%',
    padding: spacing.sm,
  },
  footer: {
    marginBottom: spacing.xl,
  },
});