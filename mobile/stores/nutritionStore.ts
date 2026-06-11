import { create } from 'zustand';
import { api } from '../lib/api';

export interface Food {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface MealItem {
  id: string;
  quantity: number;
  food: Food;
  itemCalories: number;
}

export interface MealLog {
  id: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  items: MealItem[];
  totals: MacroTotals;
}

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutritionGoal extends MacroTotals {
  id: string;
  isCustom: boolean;
}

interface TodayData {
  meals: MealLog[];
  totals: MacroTotals;
  goals: NutritionGoal | null;
  rewardGiven: boolean;
}

export interface SavedMeal {
  id: string;
  name: string;
  mealType: MealLog['mealType'];
  items: { foodId: string; foodName: string; quantity: number }[];
}

interface NutritionState {
  today: TodayData | null;
  searchResults: Food[];
  searching: boolean;
  loading: boolean;
  savedMeals: SavedMeal[];
  fetchToday: () => Promise<void>;
  searchFoods: (q: string) => Promise<void>;
  aiParseFood: (description: string) => Promise<{ food: Food; grams: number }>;
  photoParseFood: (base64: string) => Promise<{ food: Food; grams: number }[]>;
  addMealItem: (mealType: MealLog['mealType'], foodId: string, quantity: number) => Promise<void>;
  removeMealItem: (mealId: string, itemId: string) => Promise<void>;
  clearSearch: () => void;
  fetchSavedMeals: () => Promise<void>;
  saveMeal: (mealLogId: string, name: string) => Promise<void>;
  useSavedMeal: (savedMealId: string, mealType: MealLog['mealType']) => Promise<void>;
  deleteSavedMeal: (id: string) => Promise<void>;
  updateGoals: (goals: { calories: number; protein: number; carbs: number; fat: number }) => Promise<void>;
  resetGoals: () => Promise<void>;
}

export const MEAL_LABELS: Record<MealLog['mealType'], string> = {
  breakfast: 'Colazione',
  lunch: 'Pranzo',
  dinner: 'Cena',
  snack: 'Spuntini',
};

export const MEAL_ORDER: MealLog['mealType'][] = ['breakfast', 'lunch', 'dinner', 'snack'];

export const useNutritionStore = create<NutritionState>((set, get) => ({
  today: null,
  searchResults: [],
  searching: false,
  loading: false,
  savedMeals: [],

  fetchToday: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get<TodayData>('/nutrition/today');
      set({ today: data });
    } finally {
      set({ loading: false });
    }
  },

  searchFoods: async (q: string) => {
    if (q.trim().length < 2) { set({ searchResults: [] }); return; }
    set({ searching: true });
    try {
      const { data } = await api.get<Food[]>(`/nutrition/foods/search?q=${encodeURIComponent(q)}`);
      set({ searchResults: data });
    } finally {
      set({ searching: false });
    }
  },

  aiParseFood: async (description: string) => {
    const { data } = await api.post<{ food: Food; grams: number }>('/nutrition/ai-parse', { description });
    return data;
  },

  addMealItem: async (mealType, foodId, quantity) => {
    const { data: meal } = await api.post('/nutrition/meals', { mealType });
    await api.post(`/nutrition/meals/${meal.id}/items`, { foodId, quantity });
    await get().fetchToday();
  },

  removeMealItem: async (mealId, itemId) => {
    await api.delete(`/nutrition/meals/${mealId}/items/${itemId}`);
    await get().fetchToday();
  },

  clearSearch: () => set({ searchResults: [] }),

  photoParseFood: async (base64: string) => {
    const { data } = await api.post<{ food: Food; grams: number }[]>('/nutrition/photo-parse', { image: base64 });
    return data;
  },

  fetchSavedMeals: async () => {
    const { data } = await api.get<SavedMeal[]>('/nutrition/saved-meals');
    set({ savedMeals: data });
  },

  saveMeal: async (mealLogId: string, name: string) => {
    await api.post('/nutrition/saved-meals', { mealLogId, name });
    await get().fetchSavedMeals();
  },

  useSavedMeal: async (savedMealId: string, mealType: MealLog['mealType']) => {
    await api.post(`/nutrition/saved-meals/${savedMealId}/use`, { mealType });
    await get().fetchToday();
  },

  deleteSavedMeal: async (id: string) => {
    await api.delete(`/nutrition/saved-meals/${id}`);
    set((s) => ({ savedMeals: s.savedMeals.filter((m) => m.id !== id) }));
  },

  updateGoals: async (goals) => {
    await api.patch('/nutrition/goals', goals);
    await get().fetchToday();
  },

  resetGoals: async () => {
    await api.post('/nutrition/goals/reset');
    await get().fetchToday();
  },
}));
