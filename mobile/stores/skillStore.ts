import { create } from 'zustand';
import { api } from '../lib/api';
import { useCharacterStore, Character } from './characterStore';

export interface Skill {
  id: string;
  name: string;
  description: string;
  type: 'passive' | 'active';
  unlockLevel: number;
  statBonus: Record<string, number>;
  parentSkillId: string | null;
  unlocked: boolean;
}

interface SkillState {
  skills: Skill[];
  loading: boolean;
  unlocking: string | null;
  fetch: () => Promise<void>;
  unlock: (skillId: string) => Promise<void>;
}

export const useSkillStore = create<SkillState>((set) => ({
  skills: [],
  loading: false,
  unlocking: null,

  fetch: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get<Skill[]>('/skills');
      set({ skills: data });
    } finally {
      set({ loading: false });
    }
  },

  unlock: async (skillId: string) => {
    set({ unlocking: skillId });
    try {
      const { data } = await api.post<{ skills: Skill[]; character: Character }>(`/skills/${skillId}/unlock`);
      set({ skills: data.skills });
      useCharacterStore.getState().setCharacter(data.character);
    } finally {
      set({ unlocking: null });
    }
  },
}));
