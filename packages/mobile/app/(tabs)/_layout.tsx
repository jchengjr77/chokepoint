import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { GraphStoreProvider } from '@chokepoint/shared';
import { colors } from '../../theme/tokens';
import { useMonoFont } from '../../theme/typography';

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  const font = useMonoFont();
  return (
    <Text
      style={[
        font('medium'),
        { fontSize: 10, textTransform: 'uppercase', color: focused ? colors.textPrimary : colors.textSecondary },
      ]}
    >
      {label}
    </Text>
  );
}

export default function TabsLayout() {
  return (
    <GraphStoreProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: colors.bgSurface, borderTopColor: colors.border },
          tabBarActiveTintColor: colors.textPrimary,
          tabBarInactiveTintColor: colors.textSecondary,
        }}
      >
        <Tabs.Screen
          name="log"
          options={{ title: 'Log', tabBarLabel: ({ focused }) => <TabLabel label="Log" focused={focused} /> }}
        />
        <Tabs.Screen
          name="graph"
          options={{ title: 'Graph', tabBarLabel: ({ focused }) => <TabLabel label="Graph" focused={focused} /> }}
        />
        <Tabs.Screen
          name="stats"
          options={{ title: 'Stats', tabBarLabel: ({ focused }) => <TabLabel label="Stats" focused={focused} /> }}
        />
      </Tabs>
    </GraphStoreProvider>
  );
}
