import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Orbitron_400Regular, Orbitron_700Bold, Orbitron_800ExtraBold } from '@expo-google-fonts/orbitron';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '../stores/authStore';
// import { setupDailyNotification } from '../lib/notifications';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isAuthenticated, hydrate } = useAuthStore();

  const [fontsLoaded, fontError] = useFonts({
    Orbitron_400Regular,
    Orbitron_700Bold,
    Orbitron_800ExtraBold,
  });

  useEffect(() => {
    if (!fontsLoaded && !fontError) return;
    SplashScreen.hideAsync();
    // setupDailyNotification();
    hydrate().then(() => {
      if (isAuthenticated) router.replace('/(tabs)/status');
    });
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="nutrition/search" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
