import { create } from 'zustand';
import { api } from '../lib/api';
import { useCharacterStore } from './characterStore';

export interface QuestTemplate {
  id: string;
  title: string;
  description: string;
  category: 'fitness' | 'mente';
  xpReward: number;
  statRewards: Record<string, number>;
  difficulty: number;
}

export interface DailyQuest {
  id: string;
  completed: boolean;
  completedAt: string | null;
  questTemplate: QuestTemplate;
}

export interface UnlockItem {
  id: string;
  name: string;
  rank?: string;
  titleReward?: string;
  description: string;
}

export interface CompleteResult {
  leveledUp: boolean;
  rankedUp: boolean;
  oldLevel: number;
  newLevel: number;
  oldRank: string;
  newRank: string;
  newlyUnlocked: { shadows: UnlockItem[]; achievements: UnlockItem[] };
  undone?: boolean;
}

interface QuestState {
  quests: DailyQuest[];
  loading: boolean;
  refreshing: boolean;
  completing: string | null;
  lastResult: CompleteResult | null;
  fetch: () => Promise<void>;
  refresh: () => Promise<void>;
  complete: (questId: string) => Promise<CompleteResult>;
}

export const useQuestStore = create<QuestState>((set, get) => ({
  quests: [],
  loading: false,
  refreshing: false,
  completing: null,
  lastResult: null,

  fetch: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get<DailyQuest[]>('/quests/daily');
      set({ quests: data });
    } finally {
      set({ loading: false });
    }
  },

  refresh: async () => {
    set({ refreshing: true });
    try {
      const { data } = await api.post<DailyQuest[]>('/quests/daily/refresh');
      set({ quests: data });
    } finally {
      set({ refreshing: false });
    }
  },

  complete: async (questId) => {
    set({ completing: questId });
    try {
      const { data } = await api.post(`/quests/daily/${questId}/complete`);
      const completed = !data.undone;
      set((s) => ({
        quests: s.quests.map((q) =>
          q.id === questId
            ? { ...q, completed, completedAt: completed ? new Date().toISOString() : null }
            : q
        ),
        lastResult: data,
      }));
      useCharacterStore.getState().setCharacter(data.character);
      return data as CompleteResult;
    } finally {
      set({ completing: null });
    }
  },
}));
