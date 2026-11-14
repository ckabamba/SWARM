import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ThermalHexBackground from './ThermalHexBackground';
import TopBar from './TopBar';
import { THEME } from '../../theme/tokens';

interface ThermalShellProps {
  currentTab: 'home' | 'map';
  onSelectTab: (tab: 'home' | 'map') => void;
  panX?: number;
  lowBatteryMode?: boolean;
  children: React.ReactNode;
}

export default function ThermalShell({
  currentTab,
  onSelectTab,
  panX = 0,
  lowBatteryMode = false,
  children,
}: ThermalShellProps) {
  return (
    <View style={styles.container}>
      {/* Layer 0 — Thermal Backdrop Gradient */}
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={[
            THEME.colors.fogNavy,
            'rgba(238, 155, 0, 0.18)', // Faint amber
            'rgba(255, 138, 42, 0.14)', // Faint orange
            THEME.colors.void,
          ]}
          locations={[0, 0.25, 0.6, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Layer 1 — Persistent Hex Lattice & Thermal Dust */}
      <ThermalHexBackground panX={panX} lowBatteryMode={lowBatteryMode} />

      {/* Layer 2 — Adaptive Veil */}
      <View
        style={[
          styles.adaptiveVeil,
          currentTab === 'home' ? styles.veilHome : styles.veilMap,
        ]}
        pointerEvents="none"
      />

      {/* Layer 3 — Top Navigation Bar */}
      <TopBar currentTab={currentTab} onSelectTab={onSelectTab} />

      {/* Layer 4 — Active Screen Content */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  veilHome: {
    backgroundColor: 'rgba(6, 4, 11, 0.84)', // Darker scrim for clean readability of frosted cards
  },
  veilMap: {
    backgroundColor: 'rgba(6, 4, 11, 0.45)', // Lighter scrim so thermal strands glow through
  },
  content: {
    flex: 1,
  },
});
