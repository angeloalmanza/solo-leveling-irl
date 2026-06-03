import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Colors } from '../constants/theme';

export default function Index() {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync('hasOnboarded').then((v) => {
      setTarget(v ? '/(auth)/login' : '/(auth)/onboarding');
    });
  }, []);

  if (!target) return <View style={{ flex: 1, backgroundColor: Colors.background }} />;
  return <Redirect href={target as any} />;
}
