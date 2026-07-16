import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../src/constants/theme';
import Icon from '../../src/components/Icon';

const TABS = [
  { name: 'index', label: 'Hoy', icon: 'home' },
  { name: 'train', label: 'Entrenar', icon: 'dumbbell' },
  { name: 'cardio', label: 'Cardio', icon: 'bike' },
  { name: 'progress', label: 'Progreso', icon: 'chart' },
  { name: 'routine', label: 'Rutina', icon: 'settings' },
] as const;

interface RouteObj {
  key: string;
  name: string;
}
interface TabBarProps {
  state: {
    index: number;
    routes: RouteObj[];
  };
  descriptors: Record<string, { options: { tabBarLabel?: string } }>;
  navigation: {
    emit: (event: { type: string; target: string; canPreventDefault: boolean }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
}

function CustomTabBar({ state, descriptors, navigation }: TabBarProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.tabBar, { backgroundColor: theme.bg2, borderTopColor: theme.border }]}>
      {state.routes.map((route, index) => {
        const tabDef = TABS.find((t) => t.name === route.name);
        if (!tabDef) return null;
        const isFocused = state.index === index;
        const { options } = descriptors[route.key];
        const label = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : tabDef.label;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={String(label)}
            accessibilityState={isFocused ? { selected: true } : {}}
            style={styles.tabItem}
          >
            <View style={[styles.iconWrap, { backgroundColor: isFocused ? theme.accentB : 'transparent' }]}>
              <Icon name={tabDef.icon} size={22} color={isFocused ? theme.accent : theme.text4} strokeW={1.8} />
            </View>
            <Text style={[styles.tabLabel, { color: isFocused ? theme.accent : theme.text4 }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs tabBar={(props) => <CustomTabBar {...(props as unknown as TabBarProps)} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Hoy' }} />
      <Tabs.Screen name="train" options={{ title: 'Entrenar' }} />
      <Tabs.Screen name="cardio" options={{ title: 'Cardio' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progreso' }} />
      <Tabs.Screen name="routine" options={{ title: 'Rutina' }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 82,
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingBottom: 22,
    paddingTop: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconWrap: {
    width: 44,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
