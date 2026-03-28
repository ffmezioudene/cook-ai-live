import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Purchases, { PurchasesPackage, PurchasesError, PURCHASES_ERROR_CODE } from 'react-native-purchases';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Button from '@/components/ui/Button';
import { colors, typography, spacing, borderRadius, shadows } from '@/constants/theme';
import { initPurchases, purchase, restore, getRevenueCatError, isConfigured } from '@/lib/revenuecat';
import { useSubscriptionStore } from '@/store/subscriptionStore';

const YEARLY_PRODUCT_ID = 'pro_yearly_39_99_trial_3d';
const MONTHLY_PRODUCT_ID = 'pro_monthly_9_99';

const TERMS_URL = 'https://phantom-seaplane-531.notion.site/Cook-AI-Terms-of-Use-32c901b0ed5e8094a5afea15a82e8dff';
const PRIVACY_URL = 'https://phantom-seaplane-531.notion.site/Cook-AI-Privacy-Policy-32c901b0ed5e8074a415d9882707b298';

const LOG_PREFIX = '[Paywall]';

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
  const [debugInfo, setDebugInfo] = useState<string>('');

  const paywallDisabled = useMemo(
    () => Boolean(initError) || isInitializing,
    [initError, isInitializing]
  );

  // Check if the selected package is available
  const selectedPackage = selectedPlan === 'yearly' ? yearlyPackage : monthlyPackage;
  const canPurchase = !paywallDisabled && selectedPackage !== null;

  useEffect(() => {
    const loadOfferings = async () => {
      console.log(`${LOG_PREFIX} ========== LOADING OFFERINGS ==========`);
      setIsInitializing(true);
      setDebugInfo('Initializing RevenueCat...');
      
      // Step 1: Initialize RevenueCat
      const initResult = await initPurchases();
      console.log(`${LOG_PREFIX} Init result:`, initResult);
      
      if (!initResult.configured) {
        const error = initResult.error ?? getRevenueCatError() ?? 'RevenueCat not configured.';
        console.error(`${LOG_PREFIX} ❌ Init failed:`, error);
        setInitError(error);
        setDebugInfo(`Init failed: ${error}`);
        setIsInitializing(false);
        return;
      }

      setDebugInfo('Fetching offerings...');

      // Step 2: Load offerings
      try {
        console.log(`${LOG_PREFIX} Calling Purchases.getOfferings()...`);
        const offerings = await Purchases.getOfferings();
        
        console.log(`${LOG_PREFIX} Offerings received:`, {
          currentOfferingId: offerings.current?.identifier,
          allOfferingsCount: Object.keys(offerings.all).length,
        });

        // Check if current offering exists
        if (!offerings.current) {
          console.error(`${LOG_PREFIX} ❌ No current offering!`);
          console.log(`${LOG_PREFIX} All offerings:`, Object.keys(offerings.all));
          setInitError('No offerings available. Check RevenueCat dashboard configuration.');
          setDebugInfo('Error: No current offering found');
          setIsInitializing(false);
          return;
        }

        const available = offerings.current.availablePackages ?? [];
        console.log(`${LOG_PREFIX} Available packages (${available.length}):`);
        available.forEach((pkg, i) => {
          console.log(`${LOG_PREFIX}   [${i}] ${pkg.identifier} - ${pkg.product.identifier} - ${pkg.product.priceString}`);
        });

        // Check if packages are empty
        if (available.length === 0) {
          console.error(`${LOG_PREFIX} ❌ No packages in current offering!`);
          setInitError('No subscription packages available. Check App Store Connect and RevenueCat.');
          setDebugInfo('Error: availablePackages is empty');
          setIsInitializing(false);
          return;
        }

        // Find our packages
        const yearly = available.find((pkg) => pkg.product.identifier === YEARLY_PRODUCT_ID) ?? null;
        const monthly = available.find((pkg) => pkg.product.identifier === MONTHLY_PRODUCT_ID) ?? null;

        console.log(`${LOG_PREFIX} Yearly package found:`, yearly ? yearly.product.identifier : 'NOT FOUND');
        console.log(`${LOG_PREFIX} Monthly package found:`, monthly ? monthly.product.identifier : 'NOT FOUND');

        if (!yearly && !monthly) {
          console.error(`${LOG_PREFIX} ❌ Neither yearly nor monthly package found!`);
          console.log(`${LOG_PREFIX} Looking for: ${YEARLY_PRODUCT_ID}, ${MONTHLY_PRODUCT_ID}`);
          console.log(`${LOG_PREFIX} Available identifiers:`, available.map(p => p.product.identifier));
          setInitError(`Products not found. Expected: ${YEARLY_PRODUCT_ID} or ${MONTHLY_PRODUCT_ID}`);
          setDebugInfo(`Products not found in offerings`);
        }

        setYearlyPackage(yearly);
        setMonthlyPackage(monthly);
        setDebugInfo(
          `Loaded: Yearly=${yearly ? 'YES' : 'NO'}, Monthly=${monthly ? 'YES' : 'NO'}`
        );
        
        console.log(`${LOG_PREFIX} ✅ Offerings loaded successfully`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`${LOG_PREFIX} ❌ Failed to load offerings:`, errorMsg, error);
        setInitError(`Failed to load offerings: ${errorMsg}`);
        setDebugInfo(`Offerings error: ${errorMsg}`);
      } finally {
        setIsInitializing(false);
        console.log(`${LOG_PREFIX} ========== LOADING COMPLETE ==========`);
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
    console.log(`${LOG_PREFIX} ========== PURCHASE TAPPED ==========`);
    console.log(`${LOG_PREFIX} Selected plan:`, selectedPlan);
    console.log(`${LOG_PREFIX} Selected package:`, selectedPackage?.product?.identifier);
    console.log(`${LOG_PREFIX} Paywall disabled:`, paywallDisabled);
    console.log(`${LOG_PREFIX} Can purchase:`, canPurchase);
    
    if (paywallDisabled) {
      Alert.alert('Purchases Unavailable', initError ?? 'Purchases are not available right now.');
      return;
    }

    // CRITICAL: Ensure we have a valid package object
    if (!selectedPackage) {
      const errorMsg = `${selectedPlan} package not loaded. Try closing and reopening the app.`;
      console.error(`${LOG_PREFIX} ❌ No package available for:`, selectedPlan);
      Alert.alert('Package Not Available', errorMsg);
      return;
    }

    try {
      setPurchaseLoading(selectedPlan);
      console.log(`${LOG_PREFIX} Starting purchase for package:`, selectedPackage.product.identifier);
      
      // Call purchase with the actual package object (NOT a string!)
      await purchase(selectedPackage);

      console.log(`${LOG_PREFIX} ✅ Purchase call completed, refreshing subscription status...`);
      const pro = await refresh();
      
      if (pro) {
        console.log(`${LOG_PREFIX} ✅ Pro status confirmed, navigating away`);
        router.replace(nextRoute);
      } else {
        console.log(`${LOG_PREFIX} ⚠️ Purchase completed but pro not active yet`);
        Alert.alert('Purchase Incomplete', 'We could not unlock Pro yet. Try Restore Purchases.');
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} ❌ Purchase error:`, error);
      
      // Handle specific error types
      const alertInfo = getPurchaseAlertInfo(error);
      Alert.alert(alertInfo.title, alertInfo.message);
    } finally {
      setPurchaseLoading(null);
      console.log(`${LOG_PREFIX} ========== PURCHASE END ==========`);
    }
  };

  const handleRestore = async () => {
    console.log(`${LOG_PREFIX} ========== RESTORE TAPPED ==========`);
    
    if (paywallDisabled) {
      Alert.alert('Purchases Unavailable', initError ?? 'Purchases are not available right now.');
      return;
    }

    try {
      setRestoreLoading(true);
      await restore();
      const pro = await refresh();
      if (!pro) {
        Alert.alert('No Active Subscription', 'We could not find an active subscription for this Apple ID.');
      } else {
        console.log(`${LOG_PREFIX} ✅ Restore successful, pro status:`, pro);
        router.replace(nextRoute);
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} ❌ Restore error:`, error);
      Alert.alert('Restore Failed', 'Please try again. Make sure you are signed in with the correct Apple ID.');
    } finally {
      setRestoreLoading(false);
      console.log(`${LOG_PREFIX} ========== RESTORE END ==========`);
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
          {__DEV__ && <Text style={styles.debugText}>{debugInfo}</Text>}
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

          {/* Error Display */}
          {initError && (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle" size={20} color={colors.warning} />
              <Text style={styles.errorText}>{initError}</Text>
            </View>
          )}

          {/* Debug Info (dev only) */}
          {__DEV__ && debugInfo && (
            <View style={styles.debugCard}>
              <Text style={styles.debugText}>{debugInfo}</Text>
            </View>
          )}

          {/* Plan Cards */}
          <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.plansContainer}>
            {/* Yearly Plan */}
            <Pressable
              style={[
                styles.planCard,
                selectedPlan === 'yearly' && styles.planCardSelected,
                !yearlyPackage && styles.planCardDisabled,
              ]}
              onPress={() => yearlyPackage && setSelectedPlan('yearly')}
              disabled={!yearlyPackage}
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
                  <Text style={styles.planPrice}>
                    {yearlyPackage?.product?.priceString ?? '$39.99'}
                  </Text>
                  <Text style={styles.planPeriod}>/year</Text>
                  <Text style={styles.planSavings}>Save 67%</Text>
                </View>
              </View>
              {!yearlyPackage && (
                <Text style={styles.unavailableText}>Not available</Text>
              )}
            </Pressable>

            {/* Monthly Plan */}
            <Pressable
              style={[
                styles.planCard,
                selectedPlan === 'monthly' && styles.planCardSelected,
                !monthlyPackage && styles.planCardDisabled,
              ]}
              onPress={() => monthlyPackage && setSelectedPlan('monthly')}
              disabled={!monthlyPackage}
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
                  <Text style={styles.planPrice}>
                    {monthlyPackage?.product?.priceString ?? '$9.99'}
                  </Text>
                  <Text style={styles.planPeriod}>/month</Text>
                </View>
              </View>
              {!monthlyPackage && (
                <Text style={styles.unavailableText}>Not available</Text>
              )}
            </Pressable>
          </Animated.View>

          {/* CTA Button */}
          <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.ctaContainer}>
            <Button
              title={ctaButtonText}
              onPress={handlePurchase}
              size="lg"
              loading={Boolean(purchaseLoading)}
              disabled={!canPurchase || Boolean(purchaseLoading)}
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

// Helper to get user-friendly alert info based on error type
function getPurchaseAlertInfo(error: unknown): { title: string; message: string } {
  if (!error || typeof error !== 'object') {
    return { title: 'Purchase Failed', message: 'An unexpected error occurred. Please try again.' };
  }

  const e = error as PurchasesError;
  
  // Check for user cancellation
  if ('userCancelled' in e && e.userCancelled) {
    return { title: 'Purchase Cancelled', message: 'You cancelled the purchase.' };
  }

  // Check for specific error codes
  if ('code' in e) {
    switch (e.code) {
      case PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR:
        return { title: 'Purchase Cancelled', message: 'You cancelled the purchase.' };
      case PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR:
        return { title: 'App Store Error', message: 'There was a problem with the App Store. Please try again later.' };
      case PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR:
        return { title: 'Purchase Not Allowed', message: 'Purchases are not allowed on this device. Check your device settings.' };
      case PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR:
        return { title: 'Product Not Available', message: 'This product is not available for purchase right now.' };
      case PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR:
        return { title: 'Already Purchased', message: 'You already own this subscription. Try Restore Purchases.' };
      case PURCHASES_ERROR_CODE.NETWORK_ERROR:
        return { title: 'Network Error', message: 'Please check your internet connection and try again.' };
      case PURCHASES_ERROR_CODE.INVALID_CREDENTIALS_ERROR:
        return { title: 'Configuration Error', message: 'There is a problem with the app configuration. Please contact support.' };
      case PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR:
        return { title: 'Payment Pending', message: 'Your payment is being processed. It may take a few minutes.' };
      default:
        break;
    }
  }

  // Fallback with error message if available
  const message = 'message' in e && typeof e.message === 'string' 
    ? e.message 
    : 'Please try again or contact support.';
  
  return { title: 'Purchase Failed', message };
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
  debugCard: {
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  debugText: {
    fontSize: typography.xs,
    color: colors.textMuted,
    fontFamily: 'monospace',
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
  planCardDisabled: {
    opacity: 0.5,
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
  unavailableText: {
    fontSize: typography.xs,
    color: colors.warning,
    marginTop: spacing.sm,
    textAlign: 'center',
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
