import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getSavedRecipes as getSavedRecipesStorage,
  saveRecipe as saveRecipeStorage,
  unsaveRecipe as unsaveRecipeStorage,
  type SavedRecipeItem,
} from '@/lib/savedRecipes';

export interface Recipe {
  id: string;
  title: string;
  image: string;
  cuisine: string;
  cuisines?: string[];
  cookingTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  ingredients: string[];
  steps: string[];
  servings: number;
  missingIngredients?: string[];
  calories?: number | null;
  usedIngredientsCount?: number;
  missingIngredientsCount?: number;
  matchScore?: number;
  dishTypes?: string[];
  mealType?: 'breakfast' | 'main course' | 'snack' | 'dessert' | null;
  summary?: string | null;
}

export interface ScannedIngredient {
  name: string;
  confidence: number;
  confirmed: boolean;
}

interface RecipeStore {
  scannedIngredients: ScannedIngredient[];
  recipes: Recipe[];
  savedRecipes: SavedRecipeItem[];
  recipeFilters: {
    prepTime: 'any' | 15 | 30 | 45;
    cuisines: string[];
    mealType: 'any' | 'breakfast' | 'main course' | 'snack' | 'dessert';
  };
  
  setScannedIngredients: (ingredients: ScannedIngredient[]) => void;
  confirmIngredient: (name: string) => void;
  removeIngredient: (name: string) => void;
  addIngredient: (name: string) => void;
  
  setRecipes: (recipes: Recipe[]) => void;
  loadSavedRecipes: () => Promise<void>;
  saveRecipe: (recipe: Recipe) => Promise<void>;
  unsaveRecipe: (recipeId: string) => Promise<void>;
  isRecipeSaved: (recipeId: string) => boolean;
  setRecipeFilters: (filters: RecipeStore['recipeFilters']) => void;
  resetRecipeFilters: () => void;
  
  clearScannedIngredients: () => void;
}

export const useRecipeStore = create<RecipeStore>()(
  persist(
    (set, get) => ({
      scannedIngredients: [],
      recipes: [],
      savedRecipes: [],
      recipeFilters: {
        prepTime: 'any',
        cuisines: [],
        mealType: 'any',
      },
      
      setScannedIngredients: (ingredients) => set({ scannedIngredients: ingredients }),
      
      confirmIngredient: (name) => set((state) => ({
        scannedIngredients: state.scannedIngredients.map(ing =>
          ing.name === name ? { ...ing, confirmed: true } : ing
        ),
      })),
      
      removeIngredient: (name) => set((state) => ({
        scannedIngredients: state.scannedIngredients.filter(ing => ing.name !== name),
      })),
      
      addIngredient: (name) => set((state) => ({
        scannedIngredients: [
          ...state.scannedIngredients,
          { name, confidence: 1, confirmed: true }
        ],
      })),
      
      setRecipes: (recipes) => set({ recipes }),
      
      loadSavedRecipes: async () => {
        const cleaned = await getSavedRecipesStorage();
        set({ savedRecipes: cleaned });
      },

      saveRecipe: async (recipe) => {
        const updated = await saveRecipeStorage(recipe);
        set({ savedRecipes: updated });
      },
      
      unsaveRecipe: async (recipeId) => {
        const updated = await unsaveRecipeStorage(recipeId);
        set({ savedRecipes: updated });
      },
      
      isRecipeSaved: (recipeId) => {
        return get().savedRecipes.some(r => r.id === recipeId);
      },

      setRecipeFilters: (filters) => set({ recipeFilters: filters }),
      resetRecipeFilters: () => set({
        recipeFilters: {
          prepTime: 'any',
          cuisines: [],
          mealType: 'any',
        },
      }),
      
      clearScannedIngredients: () => set({ scannedIngredients: [], recipes: [] }),
    }),
    {
      name: 'recipe-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        scannedIngredients: state.scannedIngredients,
        recipes: state.recipes,
      }),
    }
  )
);
