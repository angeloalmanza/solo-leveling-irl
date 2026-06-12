import { create } from 'zustand';

export type ToastType = 'error' | 'info' | 'success';

interface UiState {
  toastMessage: string | null;
  toastType: ToastType;
  showToast: (message: string, type?: ToastType) => void;
  hideToast: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  toastMessage: null,
  toastType: 'error',
  showToast: (message, type = 'error') => set({ toastMessage: message, toastType: type }),
  hideToast: () => set({ toastMessage: null }),
}));
