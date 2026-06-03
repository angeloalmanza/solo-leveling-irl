import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../stores/authStore';
import { Colors } from '../constants/theme';

export default function RootLayout() {
  const { isAuthenticated, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate().then(() => {
      if (isAuthenticated) router.replace('/(tabs)/status');
      else router.replace('/(auth)/login');
    });
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="nutrition/search" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
