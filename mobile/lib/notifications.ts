import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const NOTIF_HOUR_KEY = 'notif_hour';
const NOTIF_MIN_KEY = 'notif_min';
const NOTIF_ENABLED_KEY = 'notif_enabled';

// expo-notifications è rimosso da Expo Go SDK 53+ su Android.
// Su development build funziona normalmente.
const isExpoGo = Constants.executionEnvironment === 'storeClient';
export const notificationsAvailable = !isExpoGo;

export async function requestPermissions(): Promise<boolean> {
  if (isExpoGo) return false;
  const { requestPermissionsAsync } = await import('expo-notifications');
  const { status } = await requestPermissionsAsync();
  return status === 'granted';
}

/** Controlla i permessi SENZA mostrare il prompt di sistema. */
export async function hasPermission(): Promise<boolean> {
  if (isExpoGo) return false;
  const { getPermissionsAsync } = await import('expo-notifications');
  const { status } = await getPermissionsAsync();
  return status === 'granted';
}

export async function scheduleDailyReminder(hour: number, minute: number): Promise<void> {
  if (isExpoGo) return;
  const Notifications = await import('expo-notifications');
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
}

export async function cancelAllReminders(): Promise<void> {
  if (isExpoGo) return;
  const { cancelAllScheduledNotificationsAsync } = await import('expo-notifications');
  await cancelAllScheduledNotificationsAsync();
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
