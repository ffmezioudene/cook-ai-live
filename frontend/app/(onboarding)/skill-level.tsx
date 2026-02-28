import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import SelectableCard from '@/components/ui/SelectableCard';
import Button from '@/components/ui/Button';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { colors, typography, spacing } from '@/constants/theme';

const SKILL_OPTIONS = [
  { id: 'beginner', name: 'Beginner', icon: 'school', subtitle: 'Just starting out' },
  { id: 'intermediate', name: 'Intermediate', icon: 'star-half', subtitle: 'Some experience' },
  { id: 'advanced', name: 'Advanced', icon: 'trophy', subtitle: 'Experienced cook' },
] as const;

export default function SkillLevelScreen() {
  const router = useRouter();
  const { skillLevel, setSkillLevel } = useOnboardingStore();
  const [selected, setSelected] = useState<'beginner' | 'intermediate' | 'advanced' | null>(skillLevel);

  const handleContinue = () => {
    if (!selected) return;
    setSkillLevel(selected);
    router.push('/(onboarding)/cooking-goal');
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.content}>
        <Animated.View 
          entering={FadeInDown.delay(100).duration(600)}
          style={styles.header}
        >
          <Text style={styles.title}>What's your{' \n'}cooking skill level?</Text>
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(300).duration(600)}
          style={styles.optionsContainer}
        >
          {SKILL_OPTIONS.map((option) => (
            <View key={option.id} style={styles.option}>
              <SelectableCard
                title={option.name}
                icon={option.icon as any}
                selected={selected === option.id}
                onPress={() => setSelected(option.id)}
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
  optionsContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
  },
  option: {
    marginBottom: spacing.md,
  },
  footer: {
    marginBottom: spacing.xl,
  },
});