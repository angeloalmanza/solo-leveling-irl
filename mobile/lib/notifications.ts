import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';

const NOTIF_HOUR_KEY = 'notif_hour';
const NOTIF_MIN_KEY = 'notif_min';
const NOTIF_ENABLED_KEY = 'notif_enabled';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleDailyReminder(hour: number, minute: number): Promise<void> {
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
  await Notifications.cancelAllScheduledNotificationsAsync();
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
