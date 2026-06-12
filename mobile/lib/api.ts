import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { useUiStore } from '../stores/uiStore';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.2:3000';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Single-flight: una sola promise di refresh condivisa da tutte le richieste
// che ricevono 401 in contemporanea. Senza questo, con la rotazione del
// refresh token lato server il secondo refresh userebbe un token già revocato
// e sloggherebbe l'utente.
let refreshPromise: Promise<string> | null = null;

async function doRefresh(): Promise<string> {
  const refresh = await SecureStore.getItemAsync('refreshToken');
  if (!refresh) throw new Error('no refresh token');
  const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken: refresh });
  await SecureStore.setItemAsync('accessToken', data.accessToken);
  // Rotazione: il server restituisce un nuovo refresh token, va salvato.
  if (data.refreshToken) {
    await SecureStore.setItemAsync('refreshToken', data.refreshToken);
  }
  return data.accessToken as string;
}

async function forceLogout() {
  await SecureStore.deleteItemAsync('accessToken');
  await SecureStore.deleteItemAsync('refreshToken');
  try {
    router.replace('/(auth)/login');
  } catch {
    /* router non ancora montato */
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = doRefresh().finally(() => {
            refreshPromise = null;
          });
        }
        const newAccess = await refreshPromise;
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch {
        await forceLogout();
        return Promise.reject(error);
      }
    }

    // Feedback uniforme su errori globali (rete/server). I 4xx restano ai chiamanti.
    if (!error.response) {
      useUiStore.getState().showToast('Connessione al Sistema persa', 'error');
    } else if (error.response.status >= 500) {
      useUiStore.getState().showToast('Errore del Sistema, riprova più tardi', 'error');
    }

    return Promise.reject(error);
  }
);
