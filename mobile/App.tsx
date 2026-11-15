import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ThermalShell from './src/components/shell/ThermalShell';
import BottomTabBar from './src/components/shell/BottomTabBar';
import type { TabId } from './src/components/shell/BottomTabBar';
import HomeScreen from './src/screens/HomeScreen';
import MapScreen from './src/screens/MapScreen';
import BuzzScreen from './src/screens/BuzzScreen';
import FeedScreen from './src/screens/FeedScreen';
import ReplyScreenModal from './src/components/modals/ReplyScreenModal';
import { useWarmPathStore } from './src/store/warmPathStore';
import { THEME } from './src/theme/tokens';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabId>('home');
  const [mapFocusId, setMapFocusId] = useState<number | null>(null);
  const [panX, setPanX] = useState(0);
  const [replyModalVisible, setReplyModalVisible] = useState(false);

  const { preferences, asks, acceptAsk } = useWarmPathStore();

  const handleOpenMap = (focusActivityId?: number) => {
    if (focusActivityId !== undefined) {
      setMapFocusId(focusActivityId);
    }
    setCurrentTab('map');
  };

  const handleSelectTab = (tab: TabId) => {
    if (tab === 'home') setMapFocusId(null);
    setCurrentTab(tab);
  };

  // Pick the most recent pending ask for the reply demo, or the latest ask
  const replyAsk = asks.find((a) => a.status === 'sent') || asks[0] || null;

  const renderScreen = () => {
    switch (currentTab) {
      case 'map':
        return (
          <MapScreen
            initialFocusActivityId={mapFocusId}
            onPanChange={(x) => setPanX(x)}
          />
        );
      case 'buzz':
        return <BuzzScreen />;
      case 'feed':
        return <FeedScreen />;
      case 'home':
      default:
        return <HomeScreen onOpenMap={handleOpenMap} />;
    }
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="light" />
      <ThermalShell
        currentTab={currentTab}
        onHomePress={() => {
          setMapFocusId(null);
          setCurrentTab('home');
        }}
        onOpenAlumDemo={() => setReplyModalVisible(true)}
        panX={currentTab === 'map' ? panX : 0}
        lowBatteryMode={preferences.lowBatteryMode}
      >
        <View style={styles.screenWrapper}>{renderScreen()}</View>
      </ThermalShell>

      {/* Persistent Bottom Tab Bar with @expo/vector-icons */}
      <BottomTabBar currentTab={currentTab} onSelectTab={handleSelectTab} />

      {/* Alum Reply Demo Modal */}
      <ReplyScreenModal
        visible={replyModalVisible}
        ask={replyAsk}
        onAccept={acceptAsk}
        onClose={() => setReplyModalVisible(false)}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.void,
  },
  screenWrapper: {
    flex: 1,
  },
});
