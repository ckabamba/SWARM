import React from 'react';
import { createThemedStyles } from '../../theme/themedStyles';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ThermalHexBackground from './ThermalHexBackground';
import TopBar from './TopBar';
import { THEME } from '../../theme/tokens';
import { getThemeMode } from '../../theme/tokens';
import type { TabId } from './BottomTabBar';

interface ThermalShellProps {
  currentTab: TabId;
  onHomePress?: () => void;
  isAlumDemo?: boolean;
  onToggleDemo?: () => void;
  panX?: number;
  lowBatteryMode?: boolean;
  children: React.ReactNode;
}

function getVeilStyle(tab: TabId) {
  if (getThemeMode() === 'light') {
    return { backgroundColor: 'rgba(245, 247, 251, 0.24)' };
  }
  switch (tab) {
    case 'map':
      return { backgroundColor: 'rgba(6, 4, 11, 0.45)' }; // Lightest — strands glow
    case 'home':
      return { backgroundColor: 'rgba(6, 4, 11, 0.55)' }; // Lighter — hex lattice visible
    default:
      return { backgroundColor: 'rgba(6, 4, 11, 0.68)' }; // Medium — buzz, feed
  }
}

export default function ThermalShell({
  currentTab,
  onHomePress,
  isAlumDemo = false,
  onToggleDemo,
  panX = 0,
  lowBatteryMode = false,
  children,
}: ThermalShellProps) {
  const isLightTheme = getThemeMode() === 'light';
  return (
    <View style={styles.container}>
      {/* Layer 0 — Thermal Backdrop Gradient */}
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={isLightTheme
            ? [THEME.colors.fogNavy, '#ffffff', '#f7d889', THEME.colors.void]
            : [
              THEME.colors.fogNavy,
              'rgba(238, 155, 0, 0.18)',
              'rgba(255, 138, 42, 0.14)',
              THEME.colors.void,
            ]}
          locations={[0, 0.25, 0.6, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Layer 1 — Persistent Hex Lattice & Thermal Dust */}
      <ThermalHexBackground panX={panX} lowBatteryMode={lowBatteryMode} />

      {/* Layer 2 — Adaptive Veil (honeycomb lattice visible) */}
      <View
        style={[styles.adaptiveVeil, getVeilStyle(currentTab)]}
        pointerEvents="none"
      />

      {/* Layer 3 — Top Navigation Bar */}
      <TopBar
        onHomePress={onHomePress}
        isAlumDemo={isAlumDemo}
        onToggleDemo={onToggleDemo}
      />

      {/* Layer 4 — Active Screen Content */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = createThemedStyles(StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.void,
  },
  adaptiveVeil: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
  },
}));
