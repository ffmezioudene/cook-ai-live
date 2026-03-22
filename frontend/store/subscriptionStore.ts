import { create } from 'zustand';
import { getIsPro, initPurchases } from '@/lib/revenuecat';

interface SubscriptionState {
  isPro: boolean;
  isLoading: boolean;
  refresh: () => Promise<boolean>;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  isPro: false,
  isLoading: false,
  refresh: async () => {
    set({ isLoading: true });
    await initPurchases();
    const isPro = await getIsPro();
    set({ isPro, isLoading: false });
    return isPro;
  },
}));
