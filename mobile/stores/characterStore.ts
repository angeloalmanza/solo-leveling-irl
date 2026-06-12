import { create } from 'zustand';
import { api, forceLogout } from '../lib/api';
// Formule di gioco dalla fonte condivisa (allineate al backend)
export { xpForNextLevel, streakMultiplier } from '@solo/shared';

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
    } catch (err: any) {
      // Account inesistente (es. cancellato lato server) → sessione non valida
      if (err?.response?.status === 404) {
        await forceLogout();
      }
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  setCharacter: (character) => set({ character }),
  clearPenalty: () => set({ lastPenalty: null }),
}));

