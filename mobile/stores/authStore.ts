import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { api } from '../lib/api';

interface AuthState {
  isAuthenticated: boolean;
  characterName: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export interface RegisterData {
  email: string;
  password: string;
  characterName: string;
  weight: number;
  height: number;
  age: number;
  sex: 'male' | 'female';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  characterName: null,

  hydrate: async () => {
    const token = await SecureStore.getItemAsync('accessToken');
    if (token) set({ isAuthenticated: true });
  },

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    await SecureStore.setItemAsync('accessToken', data.accessToken);
    await SecureStore.setItemAsync('refreshToken', data.refreshToken);
    set({ isAuthenticated: true });
  },

  register: async (registerData) => {
    const { data } = await api.post('/auth/register', registerData);
    await SecureStore.setItemAsync('accessToken', data.accessToken);
    await SecureStore.setItemAsync('refreshToken', data.refreshToken);
    set({ isAuthenticated: true, characterName: data.characterName });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    set({ isAuthenticated: false, characterName: null });
  },
}));
