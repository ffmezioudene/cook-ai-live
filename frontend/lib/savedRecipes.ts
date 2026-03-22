import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Recipe } from '@/store/useRecipeStore';

export const SAVED_RECIPES_KEY = 'SAVED_RECIPES_V1';
const MAX_SAVED = 200;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export type SavedRecipeItem = {
  id: string;
  title: string;
  image?: string;
  savedAt: number;
  expiresAt: number;
  payload?: Recipe;
};

const sortBySavedAtDesc = (a: SavedRecipeItem, b: SavedRecipeItem) => b.savedAt - a.savedAt;

const normalizeList = (items: SavedRecipeItem[]) => {
  const unique = new Map<string, SavedRecipeItem>();
  items.forEach((item) => {
    if (!item?.id) return;
    unique.set(item.id, item);
  });
  const now = Date.now();
  const cleaned = Array.from(unique.values())
    .filter((item) => item.expiresAt > now)
    .sort(sortBySavedAtDesc)
    .slice(0, MAX_SAVED);
  return cleaned;
};

export const cleanupExpired = async (): Promise<SavedRecipeItem[]> => {
  const items = await getSavedRecipes();
  return items;
};

export const getSavedRecipes = async (): Promise<SavedRecipeItem[]> => {
  try {
    const stored = await AsyncStorage.getItem(SAVED_RECIPES_KEY);
    const parsed: SavedRecipeItem[] = stored ? JSON.parse(stored) : [];
    const cleaned = normalizeList(parsed);
    await AsyncStorage.setItem(SAVED_RECIPES_KEY, JSON.stringify(cleaned));
    return cleaned;
  } catch (error) {
    console.warn('Failed to load saved recipes', error);
    return [];
  }
};

export const isRecipeSaved = async (id: string): Promise<boolean> => {
  const items = await getSavedRecipes();
  return items.some((item) => item.id === id);
};

export const saveRecipe = async (recipe: Recipe): Promise<SavedRecipeItem[]> => {
  const now = Date.now();
  const newItem: SavedRecipeItem = {
    id: recipe.id,
    title: recipe.title,
    image: recipe.image,
    savedAt: now,
    expiresAt: now + THIRTY_DAYS_MS,
    payload: recipe,
  };

  const items = await getSavedRecipes();
  const updated = normalizeList([newItem, ...items]);
  try {
    await AsyncStorage.setItem(SAVED_RECIPES_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn('Failed to save recipe', error);
  }
  return updated;
};

export const unsaveRecipe = async (id: string): Promise<SavedRecipeItem[]> => {
  const items = await getSavedRecipes();
  const updated = items.filter((item) => item.id !== id);
  try {
    await AsyncStorage.setItem(SAVED_RECIPES_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn('Failed to remove saved recipe', error);
  }
  return updated;
};
