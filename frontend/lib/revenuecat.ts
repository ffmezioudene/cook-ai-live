import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import Constants from 'expo-constants';

type InitResult = { configured: boolean; error?: string };

let configured = false;
let configError: string | null = null;
let isProCache = false;
let initInFlight: Promise<InitResult> | null = null;

const getRevenueCatApiKey = () => {
  return (
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ??
    (Constants.expoConfig?.extra?.EXPO_PUBLIC_REVENUECAT_API_KEY as string | undefined) ??
    (Constants.manifest2 as any)?.extra?.expoClient?.extra?.EXPO_PUBLIC_REVENUECAT_API_KEY ??
    (Constants.manifest as any)?.extra?.EXPO_PUBLIC_REVENUECAT_API_KEY
  );
};

const updateCache = (info?: CustomerInfo | null) => {
  const active = info?.entitlements?.active ?? {};
  isProCache = Boolean(active.pro);
};

export const initPurchases = async (): Promise<InitResult> => {
  if (configured) {
    return { configured: true };
  }

  if (initInFlight) {
    return initInFlight;
  }

  initInFlight = (async () => {
    const apiKey = getRevenueCatApiKey();
    if (!apiKey) {
      configError =
        'Missing EXPO_PUBLIC_REVENUECAT_API_KEY. Add it to frontend/.env and restart Expo with -c.';
      console.warn(configError);
      return { configured: false, error: configError };
    }

    try {
      Purchases.configure({ apiKey });
      Purchases.addCustomerInfoUpdateListener((info) => updateCache(info));
      const info = await Purchases.getCustomerInfo();
      updateCache(info);
      configured = true;
      return { configured: true };
    } catch (error) {
      configError = 'Failed to initialize RevenueCat.';
      console.warn(configError, error);
      return { configured: false, error: configError };
    }
  })();

  const result = await initInFlight;
  initInFlight = null;
  return result;
};

export const getIsPro = async (): Promise<boolean> => {
  if (!configured) {
    await initPurchases();
  }
  if (!configured) {
    return false;
  }

  try {
    const info = await Purchases.getCustomerInfo();
    updateCache(info);
  } catch (error) {
    console.warn('Failed to refresh RevenueCat customer info.', error);
  }

  return isProCache;
};

export const purchase = async (
  packageOrProduct: PurchasesPackage | string
): Promise<CustomerInfo | null> => {
  if (!configured) {
    const result = await initPurchases();
    if (!result.configured) {
      throw new Error(result.error ?? 'RevenueCat not configured');
    }
  }

  const result =
    typeof packageOrProduct === 'string'
      ? await Purchases.purchaseProduct(packageOrProduct)
      : await Purchases.purchasePackage(packageOrProduct);

  updateCache(result.customerInfo);
  return result.customerInfo ?? null;
};

export const restore = async (): Promise<CustomerInfo | null> => {
  if (!configured) {
    const result = await initPurchases();
    if (!result.configured) {
      throw new Error(result.error ?? 'RevenueCat not configured');
    }
  }

  const info = await Purchases.restorePurchases();
  updateCache(info);
  return info ?? null;
};

export const getRevenueCatError = () => configError;
