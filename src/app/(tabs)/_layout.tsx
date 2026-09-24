import { Tabs } from 'expo-router';

import { TabBarIcon, type TabBarIconName } from '@/components/TabBarIcon';
import { colors } from '@/theme';

const tabs: readonly { name: TabBarIconName; title: string }[] = [
  { name: 'home', title: 'Home' },
  { name: 'workouts', title: 'Workouts' },
  { name: 'progress', title: 'Progress' },
  { name: 'coach', title: 'Coach' },
  { name: 'profile', title: 'Profile' },
];

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent.primary,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarHideOnKeyboard: true,
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarStyle: {
          backgroundColor: colors.surface.primary,
          borderTopColor: colors.border.default,
          borderTopWidth: 1,
          paddingTop: 5,
        },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            tabBarIcon: ({ color }) => <TabBarIcon color={color} name={tab.name} />,
            title: tab.title,
          }}
        />
      ))}
    </Tabs>
  );
}
