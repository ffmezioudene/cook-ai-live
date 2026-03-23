import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
  const nextRoute = params.next && params.next.length > 0 ? params.next : '/(tabs)/home';
  const { refresh, isLoading: isRefreshing, isPro } = useSubscriptionStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [yearlyPackage, setYearlyPackage] = useState<PurchasesPackage | null>(null);
  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState<'yearly' | 'monthly' | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'yearly' | 'monthly'>('yearly');

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

  const handleSkip = () => {
    router.replace('/(tabs)/home');
  };

  const handlePurchase = async () => {
    if (paywallDisabled) {
      Alert.alert('Purchases Unavailable', initError ?? 'Purchases are not available right now.');
      return;
    }

    try {
      setPurchaseLoading(selectedPlan);
      if (selectedPlan === 'yearly') {
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

  const ctaButtonText = selectedPlan === 'yearly' ? 'Start 3 Days Free Trial' : 'Continue Monthly';

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
        {/* Close/Skip Button */}
        <Pressable style={styles.closeButton} onPress={handleSkip}>
          <View style={styles.closeButtonInner}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </View>
        </Pressable>
        
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.header}>
            <View style={styles.iconWrap}>
              <Ionicons name="diamond" size={36} color={colors.primary} />
            </View>
            <Text style={styles.title}>Unlock Cook AI Pro</Text>
            <Text style={styles.subtitle}>
              Unlimited recipes, smart filters, and step-by-step cooking instructions.
            </Text>
          </Animated.View>

          {/* Features List */}
          <Animated.View entering={FadeInDown.delay(150).duration(600)} style={styles.featuresContainer}>
            {[
              { icon: 'infinite', text: 'Unlimited recipe scans' },
              { icon: 'restaurant', text: 'Full recipe instructions' },
              { icon: 'filter', text: 'Advanced cuisine filters' },
              { icon: 'bookmark', text: 'Save unlimited recipes' },
            ].map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Ionicons name={feature.icon as any} size={18} color={colors.primary} />
                </View>
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </Animated.View>

          {initError && (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle" size={20} color={colors.warning} />
              <Text style={styles.errorText}>{initError}</Text>
            </View>
          )}

          {/* Plan Cards */}
          <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.plansContainer}>
            {/* Yearly Plan */}
            <Pressable
              style={[
                styles.planCard,
                selectedPlan === 'yearly' && styles.planCardSelected,
              ]}
              onPress={() => setSelectedPlan('yearly')}
            >
              {/* Best Value Badge */}
              <View style={styles.bestValueBadge}>
                <LinearGradient
                  colors={[colors.primary, colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.bestValueGradient}
                >
                  <Text style={styles.bestValueText}>BEST VALUE</Text>
                </LinearGradient>
              </View>

              <View style={styles.planContent}>
                <View style={styles.planLeft}>
                  <View style={[
                    styles.radioOuter,
                    selectedPlan === 'yearly' && styles.radioOuterSelected,
                  ]}>
                    {selectedPlan === 'yearly' && <View style={styles.radioInner} />}
                  </View>
                  <View style={styles.planInfo}>
                    <Text style={styles.planTitle}>Yearly</Text>
                    <View style={styles.trialBadge}>
                      <Ionicons name="gift" size={12} color={colors.success} />
                      <Text style={styles.trialBadgeText}>3 Days Free Trial</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.planRight}>
                  <Text style={styles.planPrice}>$39.99</Text>
                  <Text style={styles.planPeriod}>/year</Text>
                  <Text style={styles.planSavings}>Save 67%</Text>
                </View>
              </View>
            </Pressable>

            {/* Monthly Plan */}
            <Pressable
              style={[
                styles.planCard,
                selectedPlan === 'monthly' && styles.planCardSelected,
              ]}
              onPress={() => setSelectedPlan('monthly')}
            >
              <View style={styles.planContent}>
                <View style={styles.planLeft}>
                  <View style={[
                    styles.radioOuter,
                    selectedPlan === 'monthly' && styles.radioOuterSelected,
                  ]}>
                    {selectedPlan === 'monthly' && <View style={styles.radioInner} />}
                  </View>
                  <View style={styles.planInfo}>
                    <Text style={styles.planTitle}>Monthly</Text>
                    <Text style={styles.planSubtitle}>Billed monthly</Text>
                  </View>
                </View>
                <View style={styles.planRight}>
                  <Text style={styles.planPrice}>$9.99</Text>
                  <Text style={styles.planPeriod}>/month</Text>
                </View>
              </View>
            </Pressable>
          </Animated.View>

          {/* CTA Button */}
          <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.ctaContainer}>
            <Button
              title={ctaButtonText}
              onPress={handlePurchase}
              size="lg"
              loading={Boolean(purchaseLoading)}
              disabled={paywallDisabled || Boolean(purchaseLoading)}
              style={styles.ctaButton}
            />
            {selectedPlan === 'yearly' && (
              <Text style={styles.trialNote}>
                Free for 3 days, then $39.99/year. Cancel anytime.
              </Text>
            )}
          </Animated.View>

          {/* Restore */}
          <Animated.View entering={FadeInDown.delay(400).duration(600)} style={styles.restoreSection}>
            <Pressable onPress={handleRestore} disabled={paywallDisabled || restoreLoading}>
              <Text style={styles.restoreText}>
                {restoreLoading ? 'Restoring...' : 'Restore Purchases'}
              </Text>
            </Pressable>
          </Animated.View>

          {/* Fine Print */}
          <Animated.View entering={FadeInDown.delay(500).duration(600)} style={styles.finePrint}>
            <Text style={styles.finePrintText}>
              Payment will be charged to your Apple ID account at confirmation of purchase. 
              Subscription automatically renews unless cancelled at least 24 hours before 
              the end of the current period. Manage and cancel in App Store settings.
            </Text>
            <View style={styles.linkRow}>
              <Pressable onPress={() => handleOpenLink(TERMS_URL)}>
                <Text style={styles.linkText}>Terms of Use</Text>
              </Pressable>
              <Text style={styles.linkDivider}>•</Text>
              <Pressable onPress={() => handleOpenLink(PRIVACY_URL)}>
                <Text style={styles.linkText}>Privacy Policy</Text>
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
  closeButton: {
    position: 'absolute',
    top: spacing.lg + 44,
    right: spacing.lg,
    zIndex: 10,
  },
  closeButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingTop: spacing.xxxl + spacing.md,
    paddingBottom: spacing.xxxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography['3xl'],
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.base,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.relaxed * typography.base,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  featuresContainer: {
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: typography.base,
    color: colors.text,
    fontWeight: typography.medium,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warning + '20',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    flex: 1,
    fontSize: typography.sm,
    color: colors.text,
  },
  plansContainer: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
    position: 'relative',
    overflow: 'visible',
  },
  planCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '08',
  },
  bestValueBadge: {
    position: 'absolute',
    top: -12,
    left: spacing.lg,
    zIndex: 1,
  },
  bestValueGradient: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  bestValueText: {
    fontSize: typography.xs,
    fontWeight: typography.bold,
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  planContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  planInfo: {
    gap: spacing.xs,
  },
  planTitle: {
    fontSize: typography.lg,
    fontWeight: typography.semibold,
    color: colors.text,
  },
  planSubtitle: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.success + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  trialBadgeText: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    color: colors.success,
  },
  planRight: {
    alignItems: 'flex-end',
  },
  planPrice: {
    fontSize: typography['2xl'],
    fontWeight: typography.bold,
    color: colors.text,
  },
  planPeriod: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginTop: -2,
  },
  planSavings: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    color: colors.success,
    marginTop: spacing.xs,
  },
  ctaContainer: {
    marginBottom: spacing.lg,
  },
  ctaButton: {
    marginBottom: spacing.sm,
  },
  trialNote: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    textAlign: 'center',
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
    gap: spacing.md,
  },
  finePrintText: {
    fontSize: typography.xs,
    color: colors.textMuted,
    lineHeight: typography.lineHeight.relaxed * typography.xs,
    textAlign: 'center',
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
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
