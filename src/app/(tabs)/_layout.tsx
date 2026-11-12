import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { colors } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function TabIcon({ on, off, color, focused, size }: { on: IconName; off: IconName; color: ColorValue; focused: boolean; size: number }) {
  return <Ionicons name={focused ? on : off} color={color as string} size={size} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#98A2B3',
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border },
        tabBarLabelStyle: { fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Rewards', tabBarIcon: (p) => <TabIcon on="gift" off="gift-outline" {...p} /> }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: (p) => <TabIcon on="time" off="time-outline" {...p} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: (p) => <TabIcon on="person-circle" off="person-circle-outline" {...p} /> }} />
    </Tabs>
  );
}
