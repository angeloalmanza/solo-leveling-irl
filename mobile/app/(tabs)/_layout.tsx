import { Tabs } from 'expo-router';
import { Colors } from '../../constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: Colors.surface, borderTopColor: Colors.border },
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
      }}
    >
      <Tabs.Screen name="status" options={{ title: 'Status' }} />
      <Tabs.Screen name="quests" options={{ title: 'Quests' }} />
      <Tabs.Screen name="nutrition" options={{ title: 'Nutrition' }} />
      <Tabs.Screen name="army" options={{ title: 'Army' }} />
      <Tabs.Screen name="achievements" options={{ title: 'Titles' }} />
    </Tabs>
  );
}
