import React, { useState } from 'react';
import { createThemedStyles } from '../theme/themedStyles';
import { StyleSheet, View } from 'react-native';
import ConstellationStage from '../components/map/ConstellationStage';
import ConstellationSheet from '../components/map/ConstellationSheet';
import { useWarmPathStore } from '../store/warmPathStore';

interface MapScreenProps {
  initialFocusActivityId?: number | null;
  onPanChange?: (panX: number) => void;
}

export default function MapScreen({
  initialFocusActivityId = null,
  onPanChange,
}: MapScreenProps) {
  const { stops, goal, alumni, createAsk } = useWarmPathStore();
  const [selectedStopId, setSelectedStopId] = useState<number | null>(initialFocusActivityId);

  return (
    <View style={styles.container}>
      {/* Upper Area: Pannable SVG Constellation Canvas */}
      <ConstellationStage
        stops={stops}
        goal={goal}
        selectedStopId={selectedStopId}
        onSelectStop={(stopId) => setSelectedStopId(stopId)}
        onPanChange={onPanChange}
      />

      {/* Lower Area: Draggable 3-Detent Bottom Sheet */}
      <ConstellationSheet
        stops={stops}
        alumni={alumni}
        selectedStopId={selectedStopId}
        onSendAsk={(alumId, message) => {
          createAsk(alumId, message);
        }}
      />
    </View>
  );
}

const styles = createThemedStyles(StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
}));
