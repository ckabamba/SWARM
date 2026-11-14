import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ThermalShell from './src/components/shell/ThermalShell';
import HomeScreen from './src/screens/HomeScreen';
import MapScreen from './src/screens/MapScreen';
import { useWarmPathStore } from './src/store/warmPathStore';
import { THEME } from './src/theme/tokens';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'home' | 'map'>('home');
  const [mapFocusId, setMapFocusId] = useState<number | null>(null);
  const [panX, setPanX] = useState(0);

  const { preferences } = useWarmPathStore();

  const handleOpenMap = (focusActivityId?: number) => {
    if (focusActivityId !== undefined) {
      setMapFocusId(focusActivityId);
    }
    setCurrentTab('map');
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="light" />
      <ThermalShell
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'home') setMapFocusId(null);
          setCurrentTab(tab);
        }}
        panX={currentTab === 'map' ? panX : 0}
        lowBatteryMode={preferences.lowBatteryMode}
      >
        {currentTab === 'home' ? (
          <HomeScreen onOpenMap={handleOpenMap} />
        ) : (
          <MapScreen
            initialFocusActivityId={mapFocusId}
            onPanChange={(x) => setPanX(x)}
          />
        )}
      </ThermalShell>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.void,
  },
});
