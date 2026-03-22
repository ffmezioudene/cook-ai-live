import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { colors } from '@/constants/theme';
import { useRecipeStore } from '@/store/useRecipeStore';

export default function RootLayout() {
  const loadSavedRecipes = useRecipeStore(state => state.loadSavedRecipes);

  useEffect(() => {
    loadSavedRecipes();
  }, [loadSavedRecipes]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
