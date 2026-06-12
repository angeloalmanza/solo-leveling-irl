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

export type Feedback = 'easy' | 'ok' | 'hard';

export interface DailyQuest {
  id: string;
  completed: boolean;
  completedAt: string | null;
  feedback: Feedback | null;
  isRecovery: boolean;
  recoveryBonusXp: number;
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
  reroll: (questId: string) => Promise<void>;
  complete: (questId: string) => Promise<CompleteResult>;
  sendFeedback: (questId: string, feedback: Feedback) => Promise<void>;
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

  reroll: async (questId: string) => {
    const { data } = await api.post<DailyQuest>(`/quests/daily/${questId}/reroll`);
    set((s) => ({
      quests: s.quests.map((q) => (q.id === questId ? data : q)),
    }));
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

  sendFeedback: async (questId, feedback) => {
    // Update ottimistico, rollback su errore
    const prev = get().quests;
    set((s) => ({ quests: s.quests.map((q) => (q.id === questId ? { ...q, feedback } : q)) }));
    try {
      await api.post(`/quests/daily/${questId}/feedback`, { feedback });
    } catch {
      set({ quests: prev });
    }
  },
}));
