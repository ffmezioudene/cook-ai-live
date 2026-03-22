import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Returns the API base URL (no trailing slash).
 * Always uses EXPO_PUBLIC_API_URL to ensure the phone can reach the backend.
 */
export function getApiBaseUrl(): string {
  // Always prefer the explicit EXPO_PUBLIC_API_URL for reliability
  const envUrl = 
    process.env.EXPO_PUBLIC_API_URL ??
    (Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL as string | undefined) ??
    (Constants.manifest2 as any)?.extra?.expoClient?.extra?.EXPO_PUBLIC_API_URL ??
    (Constants.manifest as any)?.extra?.EXPO_PUBLIC_API_URL;

  if (envUrl) {
    return String(envUrl).replace(/\/+$/, '');
  }

  // Fallback for web preview or local development
  if (Platform.OS === 'web') {
    return '/api';
  }

  // Last resort: try to construct from bundler host (may not work on real devices)
  const devHost =
    __DEV__ &&
    (Constants.expoConfig?.hostUri ??
      (Constants.manifest2 as any)?.hostUri ??
      (Constants.manifest as any)?.debuggerHost);
  
  if (devHost) {
    return `http://${String(devHost).split(':')[0]}:8001/api`;
  }

  throw new Error(
    'Missing EXPO_PUBLIC_API_URL. Put it in frontend/.env and restart Expo with -c.'
  );
}
