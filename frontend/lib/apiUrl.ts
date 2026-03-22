import Constants from 'expo-constants';

/**
 * Returns the API base URL (no trailing slash).
 * In dev, prefers the bundler host so the phone can reach the backend on the same network.
 */
export function getApiBaseUrl(): string {
  const devHost =
    __DEV__ &&
    (Constants.expoConfig?.hostUri ??
      (Constants.manifest2 as any)?.hostUri ??
      (Constants.manifest as any)?.debuggerHost);
  const devApiUrl = devHost
    ? `http://${String(devHost).split(':')[0]}:8001/api`
    : null;
  const url =
    (__DEV__ ? devApiUrl : null) ??
    process.env.EXPO_PUBLIC_API_URL ??
    (Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL as string | undefined) ??
    (Constants.manifest2 as any)?.extra?.expoClient?.extra?.EXPO_PUBLIC_API_URL ??
    (Constants.manifest as any)?.extra?.EXPO_PUBLIC_API_URL;
  if (!url) {
    throw new Error(
      'Missing EXPO_PUBLIC_API_URL. Put it in frontend/.env and restart Expo with -c.'
    );
  }
  return String(url).replace(/\/+$/, '');
}
