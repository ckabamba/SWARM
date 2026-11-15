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
import DiscoveryScreen from './src/screens/DiscoveryScreen';
import FeedScreen from './src/screens/FeedScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { useWarmPathStore } from './src/store/warmPathStore';
import { AccountProvider } from './src/store/AccountContext';
import { useAccount } from './src/store/AccountContext';
import AuthGateScreen from './src/screens/AuthGateScreen';
import { getThemeMode, THEME } from './src/theme/tokens';

function AppContent() {
  const { account } = useAccount();
  const [currentTab, setCurrentTab] = useState<TabId>('home');
  const [demoMode, setDemoMode] = useState(false);
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

  if (!account && !demoMode) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <StatusBar style={isLightTheme ? 'dark' : 'light'} />
        <ThermalShell currentTab="home">
          <AuthGateScreen onEnterDemo={() => { setDemoMode(true); setCurrentTab('home'); }} />
        </ThermalShell>
      </GestureHandlerRootView>
    );
  }

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
      case 'discovery':
        return <DiscoveryScreen demoMode={demoMode} />;
      case 'feed':
        return <FeedScreen demoMode={demoMode} />;
      case 'profile':
        return <ProfileScreen demoMode={demoMode} onExitDemo={() => setDemoMode(false)} />;
      case 'home':
      default:
        return isAlumDemo ? (
          <AlumniProfileScreen />
        ) : (
          <HomeScreen onOpenMap={handleOpenMap} onOpenProfile={() => setCurrentTab('profile')} />
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
        demoMode={demoMode}
        onToggleDemo={demoMode ? handleToggleDemo : undefined}
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

export default function App() {
  return <AccountProvider><AppContent /></AccountProvider>;
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
