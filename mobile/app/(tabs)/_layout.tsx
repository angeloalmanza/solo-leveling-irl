import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ColorValue } from 'react-native';
import { Colors } from '../../constants/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(active: IoniconsName, inactive: IoniconsName) {
  return ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <Ionicons name={focused ? active : inactive} size={22} color={color as string} />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 9,
          letterSpacing: 1,
          fontFamily: 'Orbitron_400Regular',
          marginTop: -2,
        },
      }}
    >
      <Tabs.Screen
        name="status"
        options={{ title: 'STATUS', tabBarIcon: tabIcon('person-circle', 'person-circle-outline') }}
      />
      <Tabs.Screen
        name="quests"
        options={{ title: 'QUESTS', tabBarIcon: tabIcon('flash', 'flash-outline') }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{ title: 'FOOD', tabBarIcon: tabIcon('leaf', 'leaf-outline') }}
      />
      <Tabs.Screen
        name="army"
        options={{ title: 'ARMY', tabBarIcon: tabIcon('skull', 'skull-outline') }}
      />
      <Tabs.Screen
        name="achievements"
        options={{ title: 'TITLES', tabBarIcon: tabIcon('trophy', 'trophy-outline') }}
      />
    </Tabs>
  );
}
