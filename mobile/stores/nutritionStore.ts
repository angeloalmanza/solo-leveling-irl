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
}

interface TodayData {
  meals: MealLog[];
  totals: MacroTotals;
  goals: NutritionGoal | null;
  rewardGiven: boolean;
}

interface NutritionState {
  today: TodayData | null;
  searchResults: Food[];
  searching: boolean;
  loading: boolean;
  fetchToday: () => Promise<void>;
  searchFoods: (q: string) => Promise<void>;
  addMealItem: (mealType: MealLog['mealType'], foodId: string, quantity: number) => Promise<void>;
  removeMealItem: (mealId: string, itemId: string) => Promise<void>;
  clearSearch: () => void;
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
}));
