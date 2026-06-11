import { create } from 'zustand';
import { api } from '../lib/api';
import { useCharacterStore, Character } from './characterStore';

export interface BossTask {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  completedAt: string | null;
}

export interface WeeklyBoss {
  id: string;
  name: string;
  description: string;
  lore: string;
  xpReward: number;
  statRewards: Record<string, number>;
  difficulty: number;
  tasks: BossTask[];
  defeatedAt: string | null;
  weekStart: string;
}

export interface DefeatResult {
  leveledUp: boolean;
  rankedUp: boolean;
  oldLevel: number;
  newLevel: number;
  oldRank: string;
  newRank: string;
  newlyUnlocked: { shadows: { id: string; name: string; rank: string; description: string }[]; achievements: { id: string; name: string; titleReward: string; description: string }[] };
}

interface BossState {
  boss: WeeklyBoss | null;
  loading: boolean;
  defeating: boolean;
  fetch: () => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
  defeat: () => Promise<DefeatResult>;
}

export const useBossStore = create<BossState>((set, get) => ({
  boss: null,
  loading: false,
  defeating: false,

  fetch: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get<WeeklyBoss>('/boss/weekly');
      set({ boss: data });
    } finally {
      set({ loading: false });
    }
  },

  completeTask: async (taskId: string) => {
    const { data } = await api.post<{ task: BossTask; boss: WeeklyBoss }>(`/boss/weekly/tasks/${taskId}/complete`);
    set({ boss: data.boss });
  },

  defeat: async () => {
    set({ defeating: true });
    try {
      const { data } = await api.post<DefeatResult & { character: Character }>('/boss/weekly/defeat');
      useCharacterStore.getState().setCharacter(data.character);
      set((s) => ({
        boss: s.boss ? { ...s.boss, defeatedAt: new Date().toISOString() } : null,
      }));
      return data as DefeatResult;
    } finally {
      set({ defeating: false });
    }
  },
}));
