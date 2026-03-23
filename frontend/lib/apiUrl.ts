import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Production backend URL - used when env var is not set
const PRODUCTION_API_URL = 'https://cook-ai-live-production.up.railway.app/api';

/**
 * Returns the API base URL (no trailing slash).
 * Priority:
 * 1. EXPO_PUBLIC_API_URL from environment (for EAS builds)
 * 2. Production URL fallback
 */
export function getApiBaseUrl(): string {
  // Check environment variable first (set by EAS build)
  const envUrl = 
    process.env.EXPO_PUBLIC_API_URL ??
    (Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL as string | undefined) ??
    (Constants.manifest2 as any)?.extra?.expoClient?.extra?.EXPO_PUBLIC_API_URL ??
    (Constants.manifest as any)?.extra?.EXPO_PUBLIC_API_URL;

  if (envUrl) {
    console.log('[API] Using env URL:', envUrl);
    return String(envUrl).replace(/\/+$/, '');
  }

  // For web preview, use relative path
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return '/api';
  }

  // Production fallback - use Railway backend
  console.log('[API] Using production URL:', PRODUCTION_API_URL);
  return PRODUCTION_API_URL;
}
