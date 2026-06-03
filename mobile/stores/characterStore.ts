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
}

interface CharacterState {
  character: Character | null;
  loading: boolean;
  fetch: () => Promise<void>;
  setCharacter: (c: Character) => void;
}

export const useCharacterStore = create<CharacterState>((set) => ({
  character: null,
  loading: false,

  fetch: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get<Character>('/character/me');
      set({ character: data });
    } finally {
      set({ loading: false });
    }
  },

  setCharacter: (character) => set({ character }),
}));

export function xpForNextLevel(level: number) {
  return level * 100;
}
