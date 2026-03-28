import Purchases, { 
  CustomerInfo, 
  PurchasesPackage,
  PurchasesError,
  PURCHASES_ERROR_CODE 
} from 'react-native-purchases';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

type InitResult = { configured: boolean; error?: string };

let configured = false;
let configError: string | null = null;
let isProCache = false;
let initInFlight: Promise<InitResult> | null = null;

const LOG_PREFIX = '[RevenueCat]';

const getRevenueCatApiKey = (): string | undefined => {
  const key = 
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ??
    (Constants.expoConfig?.extra?.EXPO_PUBLIC_REVENUECAT_API_KEY as string | undefined) ??
    (Constants.manifest2 as any)?.extra?.expoClient?.extra?.EXPO_PUBLIC_REVENUECAT_API_KEY ??
    (Constants.manifest as any)?.extra?.EXPO_PUBLIC_REVENUECAT_API_KEY;
  
  console.log(`${LOG_PREFIX} API Key found:`, key ? `${key.substring(0, 10)}...` : 'MISSING');
  return key;
};

const updateCache = (info?: CustomerInfo | null) => {
  const active = info?.entitlements?.active ?? {};
  isProCache = Boolean(active.pro);
  console.log(`${LOG_PREFIX} Pro status updated:`, isProCache);
  console.log(`${LOG_PREFIX} Active entitlements:`, Object.keys(active));
};

export const initPurchases = async (): Promise<InitResult> => {
  console.log(`${LOG_PREFIX} initPurchases called, configured:`, configured);
  
  if (configured) {
    console.log(`${LOG_PREFIX} Already configured, returning early`);
    return { configured: true };
  }

  if (initInFlight) {
    console.log(`${LOG_PREFIX} Init already in flight, waiting...`);
    return initInFlight;
  }

  initInFlight = (async () => {
    const apiKey = getRevenueCatApiKey();
    
    if (!apiKey) {
      configError = 'Missing EXPO_PUBLIC_REVENUECAT_API_KEY. Add it to frontend/.env and restart Expo with -c.';
      console.error(`${LOG_PREFIX} ERROR:`, configError);
      return { configured: false, error: configError };
    }

    // Check if we're on web (RevenueCat doesn't work on web)
    if (Platform.OS === 'web') {
      console.log(`${LOG_PREFIX} Running on web, RevenueCat in browser mode (limited)`);
      configError = 'RevenueCat not available on web. Test on a real device.';
      return { configured: false, error: configError };
    }

    try {
      console.log(`${LOG_PREFIX} Configuring Purchases with API key...`);
      Purchases.configure({ apiKey });
      
      console.log(`${LOG_PREFIX} Adding customer info listener...`);
      Purchases.addCustomerInfoUpdateListener((info) => {
        console.log(`${LOG_PREFIX} Customer info updated via listener`);
        updateCache(info);
      });
      
      console.log(`${LOG_PREFIX} Getting initial customer info...`);
      const info = await Purchases.getCustomerInfo();
      console.log(`${LOG_PREFIX} Customer info received:`, info?.originalAppUserId);
      updateCache(info);
      
      configured = true;
      console.log(`${LOG_PREFIX} ✅ Initialization successful`);
      return { configured: true };
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      configError = `Failed to initialize RevenueCat: ${errorMessage}`;
      console.error(`${LOG_PREFIX} ❌ Init error:`, errorMessage, error);
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
    console.warn(`${LOG_PREFIX} Failed to refresh customer info:`, getErrorMessage(error));
  }

  return isProCache;
};

/**
 * Purchase a package from RevenueCat offerings.
 * IMPORTANT: Always pass the actual PurchasesPackage object, not a string!
 */
export const purchase = async (
  pkg: PurchasesPackage
): Promise<CustomerInfo | null> => {
  console.log(`${LOG_PREFIX} ========== PURCHASE START ==========`);
  console.log(`${LOG_PREFIX} Package identifier:`, pkg?.product?.identifier);
  console.log(`${LOG_PREFIX} Package type:`, pkg?.packageType);
  console.log(`${LOG_PREFIX} Product price:`, pkg?.product?.priceString);
  
  if (!configured) {
    console.log(`${LOG_PREFIX} Not configured, initializing first...`);
    const result = await initPurchases();
    if (!result.configured) {
      console.error(`${LOG_PREFIX} ❌ Cannot purchase - not configured:`, result.error);
      throw new Error(result.error ?? 'RevenueCat not configured');
    }
  }

  if (!pkg || !pkg.product) {
    console.error(`${LOG_PREFIX} ❌ Invalid package provided:`, pkg);
    throw new Error('Invalid package: Package or product is null');
  }

  try {
    console.log(`${LOG_PREFIX} Calling Purchases.purchasePackage()...`);
    const result = await Purchases.purchasePackage(pkg);
    
    console.log(`${LOG_PREFIX} ✅ Purchase successful!`);
    console.log(`${LOG_PREFIX} Transaction ID:`, result.customerInfo?.originalAppUserId);
    
    updateCache(result.customerInfo);
    return result.customerInfo ?? null;
  } catch (error) {
    const errorDetails = getPurchaseErrorDetails(error);
    console.error(`${LOG_PREFIX} ❌ Purchase failed:`, errorDetails);
    throw error;
  } finally {
    console.log(`${LOG_PREFIX} ========== PURCHASE END ==========`);
  }
};

export const restore = async (): Promise<CustomerInfo | null> => {
  console.log(`${LOG_PREFIX} ========== RESTORE START ==========`);
  
  if (!configured) {
    const result = await initPurchases();
    if (!result.configured) {
      console.error(`${LOG_PREFIX} ❌ Cannot restore - not configured:`, result.error);
      throw new Error(result.error ?? 'RevenueCat not configured');
    }
  }

  try {
    console.log(`${LOG_PREFIX} Calling Purchases.restorePurchases()...`);
    const info = await Purchases.restorePurchases();
    console.log(`${LOG_PREFIX} ✅ Restore successful`);
    updateCache(info);
    return info ?? null;
  } catch (error) {
    console.error(`${LOG_PREFIX} ❌ Restore failed:`, getErrorMessage(error));
    throw error;
  } finally {
    console.log(`${LOG_PREFIX} ========== RESTORE END ==========`);
  }
};

export const getRevenueCatError = () => configError;

export const isConfigured = () => configured;

// Helper to extract meaningful error messages
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null) {
    const e = error as any;
    return e.message || e.userInfo?.message || e.underlyingErrorMessage || JSON.stringify(error);
  }
  return String(error);
}

// Get detailed purchase error information
function getPurchaseErrorDetails(error: unknown): object {
  const details: Record<string, any> = {
    message: getErrorMessage(error),
  };
  
  if (error && typeof error === 'object') {
    const e = error as PurchasesError;
    
    // RevenueCat specific error codes
    if ('code' in e) {
      details.code = e.code;
      details.codeName = getErrorCodeName(e.code as PURCHASES_ERROR_CODE);
    }
    if ('userCancelled' in e) {
      details.userCancelled = e.userCancelled;
    }
    if ('underlyingErrorMessage' in e) {
      details.underlyingError = e.underlyingErrorMessage;
    }
    if ('userInfo' in e && e.userInfo) {
      details.userInfo = e.userInfo;
    }
  }
  
  return details;
}

// Map error codes to readable names
function getErrorCodeName(code: PURCHASES_ERROR_CODE): string {
  const codeMap: Record<number, string> = {
    [PURCHASES_ERROR_CODE.UNKNOWN_ERROR]: 'UNKNOWN_ERROR',
    [PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR]: 'PURCHASE_CANCELLED',
    [PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR]: 'STORE_PROBLEM',
    [PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR]: 'PURCHASE_NOT_ALLOWED',
    [PURCHASES_ERROR_CODE.PURCHASE_INVALID_ERROR]: 'PURCHASE_INVALID',
    [PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR]: 'PRODUCT_NOT_AVAILABLE',
    [PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR]: 'ALREADY_PURCHASED',
    [PURCHASES_ERROR_CODE.RECEIPT_ALREADY_IN_USE_ERROR]: 'RECEIPT_IN_USE',
    [PURCHASES_ERROR_CODE.INVALID_RECEIPT_ERROR]: 'INVALID_RECEIPT',
    [PURCHASES_ERROR_CODE.MISSING_RECEIPT_FILE_ERROR]: 'MISSING_RECEIPT',
    [PURCHASES_ERROR_CODE.NETWORK_ERROR]: 'NETWORK_ERROR',
    [PURCHASES_ERROR_CODE.INVALID_CREDENTIALS_ERROR]: 'INVALID_CREDENTIALS',
    [PURCHASES_ERROR_CODE.UNEXPECTED_BACKEND_RESPONSE_ERROR]: 'BACKEND_ERROR',
    [PURCHASES_ERROR_CODE.OPERATION_ALREADY_IN_PROGRESS_ERROR]: 'OPERATION_IN_PROGRESS',
    [PURCHASES_ERROR_CODE.UNKNOWN_BACKEND_ERROR]: 'UNKNOWN_BACKEND_ERROR',
    [PURCHASES_ERROR_CODE.INVALID_APP_USER_ID_ERROR]: 'INVALID_APP_USER_ID',
    [PURCHASES_ERROR_CODE.INELIGIBLE_ERROR]: 'INELIGIBLE',
    [PURCHASES_ERROR_CODE.INSUFFICIENT_PERMISSIONS_ERROR]: 'INSUFFICIENT_PERMISSIONS',
    [PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR]: 'PAYMENT_PENDING',
    [PURCHASES_ERROR_CODE.INVALID_SUBSCRIBER_ATTRIBUTES_ERROR]: 'INVALID_SUBSCRIBER_ATTRIBUTES',
    [PURCHASES_ERROR_CODE.LOG_OUT_ANONYMOUS_USER_ERROR]: 'LOG_OUT_ANONYMOUS_USER',
    [PURCHASES_ERROR_CODE.CONFIGURATION_ERROR]: 'CONFIGURATION_ERROR',
    [PURCHASES_ERROR_CODE.UNSUPPORTED_ERROR]: 'UNSUPPORTED',
    [PURCHASES_ERROR_CODE.EMPTY_SUBSCRIBER_ATTRIBUTES_ERROR]: 'EMPTY_SUBSCRIBER_ATTRIBUTES',
    [PURCHASES_ERROR_CODE.CUSTOMER_INFO_ERROR]: 'CUSTOMER_INFO_ERROR',
    [PURCHASES_ERROR_CODE.SIGNATURE_VERIFICATION_ERROR]: 'SIGNATURE_VERIFICATION_ERROR',
  };
  
  return codeMap[code] || `UNKNOWN_CODE_${code}`;
}
