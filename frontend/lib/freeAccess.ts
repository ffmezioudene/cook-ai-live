import AsyncStorage from '@react-native-async-storage/async-storage';

const FIRST_SCAN_KEY = 'first_scan_time';
const FREE_ACCESS_MS = 72 * 60 * 60 * 1000;

export const setFirstScanTimestampIfMissing = async () => {
  try {
    const existing = await AsyncStorage.getItem(FIRST_SCAN_KEY);
    if (!existing) {
      await AsyncStorage.setItem(FIRST_SCAN_KEY, Date.now().toString());
    }
  } catch (error) {
    console.warn('Failed to persist first scan timestamp', error);
  }
};

export const getFirstScanTimestamp = async (): Promise<number | null> => {
  try {
    const stored = await AsyncStorage.getItem(FIRST_SCAN_KEY);
    if (!stored) return null;
    const parsed = Number(stored);
    return Number.isFinite(parsed) ? parsed : null;
  } catch (error) {
    console.warn('Failed to read first scan timestamp', error);
    return null;
  }
};

export const isFreeAccessActive = async (): Promise<boolean> => {
  const firstScan = await getFirstScanTimestamp();
  if (!firstScan) return false;
  return Date.now() < firstScan + FREE_ACCESS_MS;
};
