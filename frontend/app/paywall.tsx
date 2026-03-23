import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { Ionicons } from '@expo/vector-icons';
import Button from '@/components/ui/Button';
import { colors, typography, spacing, borderRadius, shadows } from '@/constants/theme';
import { initPurchases, purchase, restore, getRevenueCatError } from '@/lib/revenuecat';
import { useSubscriptionStore } from '@/store/subscriptionStore';

const YEARLY_PRODUCT_ID = 'pro_yearly_39_99_trial_3d';
const MONTHLY_PRODUCT_ID = 'pro_monthly_9_99';

const TERMS_URL = 'https://phantom-seaplane-531.notion.site/Cook-AI-Terms-of-Use-32c901b0ed5e8094a5afea15a82e8dff';
const PRIVACY_URL = 'https://phantom-seaplane-531.notion.site/Cook-AI-Privacy-Policy-32c901b0ed5e8074a415d9882707b298';

export default function PaywallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string }>();
  const nextRoute = params.next && params.next.length > 0 ? params.next : '/scan/recipes';
  const { refresh, isLoading: isRefreshing, isPro } = useSubscriptionStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [yearlyPackage, setYearlyPackage] = useState<PurchasesPackage | null>(null);
  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState<'yearly' | 'monthly' | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);

  const paywallDisabled = useMemo(
    () => Boolean(initError) || isInitializing,
    [initError, isInitializing]
  );

  useEffect(() => {
    const loadOfferings = async () => {
      setIsInitializing(true);
      const initResult = await initPurchases();
      if (!initResult.configured) {
        setInitError(initResult.error ?? getRevenueCatError() ?? 'RevenueCat not configured.');
        setIsInitializing(false);
        return;
      }

      try {
        const offerings = await Purchases.getOfferings();
        const available = offerings.current?.availablePackages ?? [];
        const yearly = available.find((pkg) => pkg.product.identifier === YEARLY_PRODUCT_ID) ?? null;
        const monthly = available.find((pkg) => pkg.product.identifier === MONTHLY_PRODUCT_ID) ?? null;
        setYearlyPackage(yearly);
        setMonthlyPackage(monthly);
      } catch (error) {
        console.warn('Unable to load offerings.', error);
      } finally {
        setIsInitializing(false);
      }
    };

    loadOfferings();
  }, []);

  useEffect(() => {
    if (!isRefreshing && isPro) {
      router.replace(nextRoute);
    }
  }, [isRefreshing, isPro, router, nextRoute]);

  const handlePurchase = async (plan: 'yearly' | 'monthly') => {
    if (paywallDisabled) {
      Alert.alert('Purchases Unavailable', initError ?? 'Purchases are not available right now.');
      return;
    }

    try {
      setPurchaseLoading(plan);
      if (plan === 'yearly') {
        await purchase(yearlyPackage ?? YEARLY_PRODUCT_ID);
      } else {
        await purchase(monthlyPackage ?? MONTHLY_PRODUCT_ID);
      }

      const pro = await refresh();
      if (pro) {
        router.replace(nextRoute);
      } else {
        Alert.alert('Purchase Incomplete', 'We could not unlock Pro yet. Try Restore Purchases.');
      }
    } catch (error) {
      Alert.alert('Purchase Failed', 'Please try again or restore purchases.');
    } finally {
      setPurchaseLoading(null);
    }
  };

  const handleRestore = async () => {
    if (paywallDisabled) {
      Alert.alert('Purchases Unavailable', initError ?? 'Purchases are not available right now.');
      return;
    }

    try {
      setRestoreLoading(true);
      await restore();
      const pro = await refresh();
      if (!pro) {
        Alert.alert('No Active Subscription', 'We could not find an active subscription.');
      }
    } catch (error) {
      Alert.alert('Restore Failed', 'Please try again.');
    } finally {
      setRestoreLoading(false);
    }
  };

  const handleOpenLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.warn('Failed to open link', error);
    }
  };

  if (isInitializing) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.loadingContainer}>
          <Ionicons name="sparkles" size={64} color={colors.primary} />
          <Text style={styles.loadingTitle}>Preparing your access...</Text>
          <Text style={styles.loadingSubtitle}>Fetching subscription options</Text>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.content}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.header}>
            <View style={styles.iconWrap}>
              <Ionicons name="lock-closed" size={32} color={colors.primary} />
            </View>
            <Text style={styles.title}>Your 3-day free access has ended</Text>
            <Text style={styles.subtitle}>
              Keep cooking with full recipes, smart filters, and detailed steps anytime.
            </Text>
          </Animated.View>

          {initError && (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle" size={20} color={colors.warning} />
              <Text style={styles.errorText}>{initError}</Text>
            </View>
          )}

          <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.planCardPrimary}>
            <View style={styles.planHeader}>
              <Text style={styles.planTitle}>Yearly</Text>
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedText}>Best Value</Text>
              </View>
            </View>
            <Text style={styles.planPrice}>$39.99/year</Text>
            <Button
              title="Continue Yearly"
              onPress={() => handlePurchase('yearly')}
              size="lg"
              loading={purchaseLoading === 'yearly'}
              disabled={paywallDisabled || Boolean(purchaseLoading)}
              style={styles.planButton}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.planCard}>
            <Text style={styles.planTitle}>Monthly</Text>
            <Text style={styles.planPrice}>$9.99/month</Text>
            <Button
              title="Continue Monthly"
              onPress={() => handlePurchase('monthly')}
              variant="secondary"
              size="lg"
              loading={purchaseLoading === 'monthly'}
              disabled={paywallDisabled || Boolean(purchaseLoading)}
              style={styles.planButton}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400).duration(600)} style={styles.restoreSection}>
            <Pressable onPress={handleRestore} disabled={paywallDisabled || restoreLoading}>
              <Text style={styles.restoreText}>
                {restoreLoading ? 'Restoring...' : 'Restore Purchases'}
              </Text>
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(500).duration(600)} style={styles.finePrint}>
            <Text style={styles.finePrintText}>
              Payment will be charged to your Apple ID account at confirmation of purchase. Subscription
              automatically renews unless cancelled at least 24 hours before the end of the current
              period. Manage and cancel in App Store settings.
            </Text>
            <View style={styles.linkRow}>
              <Pressable onPress={() => handleOpenLink(TERMS_URL)}>
                <Text style={styles.linkText}>Terms</Text>
              </Pressable>
              <Text style={styles.linkDivider}>•</Text>
              <Pressable onPress={() => handleOpenLink(PRIVACY_URL)}>
                <Text style={styles.linkText}>Privacy</Text>
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
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
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography['3xl'],
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.base,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.relaxed * typography.base,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warning + '20',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: typography.sm,
    color: colors.text,
  },
  planCardPrimary: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  planTitle: {
    fontSize: typography.xl,
    fontWeight: typography.semibold,
    color: colors.text,
  },
  recommendedBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  recommendedText: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  planPrice: {
    fontSize: typography.lg,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  planButton: {
    marginTop: spacing.sm,
  },
  restoreSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  restoreText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  finePrint: {
    gap: spacing.sm,
  },
  finePrintText: {
    fontSize: typography.xs,
    color: colors.textMuted,
    lineHeight: typography.lineHeight.relaxed * typography.xs,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  linkText: {
    fontSize: typography.sm,
    color: colors.primary,
  },
  linkDivider: {
    color: colors.textMuted,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  loadingTitle: {
    fontSize: typography['2xl'],
    fontWeight: typography.semibold,
    color: colors.text,
  },
  loadingSubtitle: {
    fontSize: typography.base,
    color: colors.textSecondary,
  },
});
