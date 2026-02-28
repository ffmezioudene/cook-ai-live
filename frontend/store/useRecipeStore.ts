import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Recipe {
  id: string;
  title: string;
  image: string;
  cuisine: string;
  cookingTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  ingredients: string[];
  steps: string[];
  servings: number;
  missingIngredients?: string[];
}

export interface ScannedIngredient {
  name: string;
  confidence: number;
  confirmed: boolean;
}

interface RecipeStore {
  scannedIngredients: ScannedIngredient[];
  recipes: Recipe[];
  savedRecipes: Recipe[];
  
  setScannedIngredients: (ingredients: ScannedIngredient[]) => void;
  confirmIngredient: (name: string) => void;
  removeIngredient: (name: string) => void;
  addIngredient: (name: string) => void;
  
  setRecipes: (recipes: Recipe[]) => void;
  saveRecipe: (recipe: Recipe) => void;
  unsaveRecipe: (recipeId: string) => void;
  isRecipeSaved: (recipeId: string) => boolean;
  
  clearScannedIngredients: () => void;
}

export const useRecipeStore = create<RecipeStore>()(
  persist(
    (set, get) => ({
      scannedIngredients: [],
      recipes: [],
      savedRecipes: [],
      
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
      
      saveRecipe: (recipe) => set((state) => ({
        savedRecipes: [...state.savedRecipes.filter(r => r.id !== recipe.id), recipe],
      })),
      
      unsaveRecipe: (recipeId) => set((state) => ({
        savedRecipes: state.savedRecipes.filter(r => r.id !== recipeId),
      })),
      
      isRecipeSaved: (recipeId) => {
        return get().savedRecipes.some(r => r.id === recipeId);
      },
      
      clearScannedIngredients: () => set({ scannedIngredients: [], recipes: [] }),
    }),
    {
      name: 'recipe-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
