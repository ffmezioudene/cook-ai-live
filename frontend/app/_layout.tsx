import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { colors } from '@/constants/theme';
import { useRecipeStore } from '@/store/useRecipeStore';
import { useSubscriptionStore } from '@/store/subscriptionStore';

export default function RootLayout() {
  const loadSavedRecipes = useRecipeStore(state => state.loadSavedRecipes);
  const refreshSubscription = useSubscriptionStore(state => state.refresh);

  useEffect(() => {
    loadSavedRecipes();
    // Initialize RevenueCat and check entitlements on app launch
    refreshSubscription();
  }, [loadSavedRecipes, refreshSubscription]);

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
