import { create } from 'zustand';
import { api } from '../lib/api';

export interface Shadow {
  id: string;
  name: string;
  description: string;
  rank: string;
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  titleReward: string;
  unlocked: boolean;
  unlockedAt: string | null;
}

interface UnlockState {
  shadows: Shadow[];
  achievements: Achievement[];
  loadingShadows: boolean;
  loadingAchievements: boolean;
  fetchShadows: () => Promise<void>;
  fetchAchievements: () => Promise<void>;
}

export const useUnlockStore = create<UnlockState>((set) => ({
  shadows: [],
  achievements: [],
  loadingShadows: false,
  loadingAchievements: false,

  fetchShadows: async () => {
    set({ loadingShadows: true });
    try {
      const { data } = await api.get<Shadow[]>('/unlocks/shadows');
      set({ shadows: data });
    } finally {
      set({ loadingShadows: false });
    }
  },

  fetchAchievements: async () => {
    set({ loadingAchievements: true });
    try {
      const { data } = await api.get<Achievement[]>('/unlocks/achievements');
      set({ achievements: data });
    } finally {
      set({ loadingAchievements: false });
    }
  },
}));
