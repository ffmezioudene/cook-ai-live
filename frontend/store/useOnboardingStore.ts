import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserPreferences {
  selectedCuisines: string[];
  dietaryRestrictions: string[];
  cookingTime: '15' | '30' | '60' | null;
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | null;
  cookingGoal: 'healthy' | 'protein' | 'comfort' | 'budget' | null;
  hasCompletedOnboarding: boolean;
}

interface OnboardingStore extends UserPreferences {
  setSelectedCuisines: (cuisines: string[]) => void;
  setDietaryRestrictions: (restrictions: string[]) => void;
  setCookingTime: (time: '15' | '30' | '60') => void;
  setSkillLevel: (level: 'beginner' | 'intermediate' | 'advanced') => void;
  setCookingGoal: (goal: 'healthy' | 'protein' | 'comfort' | 'budget') => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      selectedCuisines: [],
      dietaryRestrictions: [],
      cookingTime: null,
      skillLevel: null,
      cookingGoal: null,
      hasCompletedOnboarding: false,
      
      setSelectedCuisines: (cuisines) => set({ selectedCuisines: cuisines }),
      setDietaryRestrictions: (restrictions) => set({ dietaryRestrictions: restrictions }),
      setCookingTime: (time) => set({ cookingTime: time }),
      setSkillLevel: (level) => set({ skillLevel: level }),
      setCookingGoal: (goal) => set({ cookingGoal: goal }),
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      resetOnboarding: () => set({
        selectedCuisines: [],
        dietaryRestrictions: [],
        cookingTime: null,
        skillLevel: null,
        cookingGoal: null,
        hasCompletedOnboarding: false,
      }),
    }),
    {
      name: 'onboarding-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
