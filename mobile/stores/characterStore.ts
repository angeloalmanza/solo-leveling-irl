import { create } from 'zustand';
import { api } from '../lib/api';

export interface Character {
  id: string;
  name: string;
  level: number;
  xp: number;
  rank: 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
  str: number;
  agi: number;
  int: number;
  vit: number;
  end: number;
  activeTitle: string | null;
  streak: number;
  bestStreak: number;
}

export interface PenaltyInfo {
  daysLost: number;
  xpLost: number;
  levelDown: boolean;
  rankDown: boolean;
  oldLevel: number;
  newLevel: number;
}

interface CharacterState {
  character: Character | null;
  loading: boolean;
  lastPenalty: PenaltyInfo | null;
  fetch: () => Promise<void>;
  setCharacter: (c: Character) => void;
  clearPenalty: () => void;
}

export const useCharacterStore = create<CharacterState>((set) => ({
  character: null,
  loading: false,
  lastPenalty: null,

  fetch: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get<Character & { penalty?: PenaltyInfo | null }>('/character/me');
      const { penalty, ...character } = data;
      set({ character, lastPenalty: penalty ?? null });
    } finally {
      set({ loading: false });
    }
  },

  setCharacter: (character) => set({ character }),
  clearPenalty: () => set({ lastPenalty: null }),
}));

export function xpForNextLevel(level: number) {
  return level * 100;
}

export function streakMultiplier(streak: number): number {
  if (streak >= 30) return 1.5;
  if (streak >= 14) return 1.25;
  if (streak >= 7) return 1.1;
  return 1.0;
}
