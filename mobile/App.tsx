import React, { useState } from 'react';
import { createThemedStyles } from './src/theme/themedStyles';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ThermalShell from './src/components/shell/ThermalShell';
import BottomTabBar from './src/components/shell/BottomTabBar';
import type { TabId } from './src/components/shell/BottomTabBar';
import HomeScreen from './src/screens/HomeScreen';
import AlumniProfileScreen from './src/screens/AlumniProfileScreen';
import MapScreen from './src/screens/MapScreen';
import GeoMapsScreen from './src/screens/GeoMapsScreen';
import BuzzScreen from './src/screens/BuzzScreen';
import FeedScreen from './src/screens/FeedScreen';
import { useWarmPathStore } from './src/store/warmPathStore';
import { getThemeMode, THEME } from './src/theme/tokens';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabId>('home');
  const [isAlumDemo, setIsAlumDemo] = useState(false);
  const [mapFocusId, setMapFocusId] = useState<number | null>(null);
  const [panX, setPanX] = useState(0);

  const { preferences } = useWarmPathStore();
  const isLightTheme = getThemeMode() === 'light';

  const handleOpenMap = (focusActivityId?: number) => {
    if (focusActivityId !== undefined) {
      setMapFocusId(focusActivityId);
    }
    setCurrentTab('map');
  };

  const handleToggleDemo = () => {
    setIsAlumDemo((current) => !current);
    setMapFocusId(null);
    setCurrentTab('home');
  };

  const handleSelectTab = (tab: TabId) => {
    if (isAlumDemo && tab === 'map') return;
    if (tab === 'home') setMapFocusId(null);
    setCurrentTab(tab);
  };

  const renderScreen = () => {
    switch (currentTab) {
      case 'map':
        return (
          <MapScreen
            initialFocusActivityId={mapFocusId}
            onPanChange={(x) => setPanX(x)}
          />
        );
      case 'geo':
        return <GeoMapsScreen />;
      case 'buzz':
        return <BuzzScreen />;
      case 'feed':
        return <FeedScreen isAlumDemo={isAlumDemo} />;
      case 'home':
      default:
        return isAlumDemo ? (
          <AlumniProfileScreen />
        ) : (
          <HomeScreen onOpenMap={handleOpenMap} />
        );
    }
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style={isLightTheme ? 'dark' : 'light'} />
      <ThermalShell
        currentTab={currentTab}
        onHomePress={() => {
          setMapFocusId(null);
          setCurrentTab('home');
        }}
        isAlumDemo={isAlumDemo}
        onToggleDemo={handleToggleDemo}
        panX={currentTab === 'map' ? panX : 0}
        lowBatteryMode={preferences.lowBatteryMode}
      >
        <View style={styles.screenWrapper}>{renderScreen()}</View>
      </ThermalShell>

      <BottomTabBar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        showMap={!isAlumDemo}
      />
    </GestureHandlerRootView>
  );
}

const styles = createThemedStyles(StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.void,
  },
  screenWrapper: {
    flex: 1,
  },
}));
