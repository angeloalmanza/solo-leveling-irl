import * as SecureStore from 'expo-secure-store';

const NOTIF_HOUR_KEY = 'notif_hour';
const NOTIF_MIN_KEY = 'notif_min';
const NOTIF_ENABLED_KEY = 'notif_enabled';

// expo-notifications non è supportato in Expo Go da SDK 53 su Android.
// Tutte le funzioni falliscono silenziosamente in quel contesto.
let Notifications: typeof import('expo-notifications') | null = null;
try {
  Notifications = require('expo-notifications');
  Notifications!.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
  // Expo Go: notifiche non disponibili
}

export async function requestPermissions(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleDailyReminder(hour: number, minute: number): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '[ SISTEMA ]',
        body: 'Le tue quest giornaliere ti aspettano. Non spezzare la streak.',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  } catch { /* silenzioso */ }
}

export async function cancelAllReminders(): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch { /* silenzioso */ }
}

export async function getSavedSettings(): Promise<{ hour: number; minute: number; enabled: boolean }> {
  const [h, m, e] = await Promise.all([
    SecureStore.getItemAsync(NOTIF_HOUR_KEY),
    SecureStore.getItemAsync(NOTIF_MIN_KEY),
    SecureStore.getItemAsync(NOTIF_ENABLED_KEY),
  ]);
  return {
    hour: h !== null ? parseInt(h) : 9,
    minute: m !== null ? parseInt(m) : 0,
    enabled: e !== 'false',
  };
}

export async function saveSettings(hour: number, minute: number, enabled: boolean): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(NOTIF_HOUR_KEY, String(hour)),
    SecureStore.setItemAsync(NOTIF_MIN_KEY, String(minute)),
    SecureStore.setItemAsync(NOTIF_ENABLED_KEY, String(enabled)),
  ]);
}

export const notificationsAvailable = Notifications !== null;
