import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Orbitron_400Regular, Orbitron_700Bold, Orbitron_800ExtraBold } from '@expo-google-fonts/orbitron';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '../stores/authStore';
import { hasPermission, scheduleDailyReminder, getSavedSettings } from '../lib/notifications';
import { Toast } from '../components/Toast';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { hydrate } = useAuthStore();

  const [fontsLoaded, fontError] = useFonts({
    Orbitron_400Regular,
    Orbitron_700Bold,
    Orbitron_800ExtraBold,
  });

  useEffect(() => {
    if (!fontsLoaded && !fontError) return;
    SplashScreen.hideAsync();

    hydrate().then(async (authed) => {
      // Usa il valore restituito, non lo stato catturato alla prima render
      if (authed) router.replace('/(tabs)/status');
      // Non chiediamo i permessi all'avvio: schedula solo se già concessi.
      if (await hasPermission()) {
        const { hour, minute, enabled } = await getSavedSettings();
        if (enabled) await scheduleDailyReminder(hour, minute);
      }
    });
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <>
      <StatusBar style="light" />
      <Toast />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="nutrition/search" options={{ presentation: 'modal' }} />
        <Stack.Screen name="progress" options={{ presentation: 'modal' }} />
        <Stack.Screen name="body" options={{ presentation: 'modal' }} />
        <Stack.Screen name="weekly-summary" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
