import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEME } from '../../theme/tokens';

export type TabId = 'home' | 'map' | 'buzz' | 'feed';

interface BottomTabBarProps {
  currentTab: TabId;
  onSelectTab: (tab: TabId) => void;
}

interface TabConfig {
  id: TabId;
  label: string;
  iconActive: keyof typeof Ionicons.glyphMap;
  iconInactive: keyof typeof Ionicons.glyphMap;
}

const TABS: TabConfig[] = [
  {
    id: 'home',
    label: 'Home',
    iconActive: 'home',
    iconInactive: 'home-outline',
  },
  {
    id: 'map',
    label: 'Map',
    iconActive: 'map',
    iconInactive: 'map-outline',
  },
  {
    id: 'buzz',
    label: 'Buzz',
    iconActive: 'newspaper',
    iconInactive: 'newspaper-outline',
  },
  {
    id: 'feed',
    label: 'Feed',
    iconActive: 'people',
    iconInactive: 'people-outline',
  },
];

export default function BottomTabBar({ currentTab, onSelectTab }: BottomTabBarProps) {
  const handlePress = (tab: TabId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectTab(tab);
  };

  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = currentTab === tab.id;

        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tab}
            onPress={() => handlePress(tab.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isActive ? tab.iconActive : tab.iconInactive}
              size={21}
              color={isActive ? THEME.colors.glow : THEME.colors.ash}
              style={styles.tabIcon}
            />
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tab.label}
            </Text>
            {isActive && <View style={styles.activeDot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(9, 6, 15, 0.94)',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.line,
    paddingBottom: Platform.OS === 'ios' ? 22 : 10,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabIcon: {
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.8,
    color: THEME.colors.ash,
    textTransform: 'uppercase',
  },
  tabLabelActive: {
    color: THEME.colors.glow,
    fontWeight: '700',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.colors.glow,
    marginTop: 3,
  },
});
