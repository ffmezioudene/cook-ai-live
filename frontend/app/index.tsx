import { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';
import { useOnboardingStore } from '@/store/useOnboardingStore';

export default function Index() {
  const router = useRouter();
  const hasCompletedOnboarding = useOnboardingStore(state => state.hasCompletedOnboarding);

  useEffect(() => {
    // Simulate a brief loading screen
    const timer = setTimeout(() => {
      if (hasCompletedOnboarding) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/(onboarding)/hero');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [hasCompletedOnboarding]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
