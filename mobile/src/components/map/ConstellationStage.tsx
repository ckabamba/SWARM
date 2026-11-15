import React, { useRef, useEffect, useMemo } from 'react';
import { createThemedStyles } from '../../theme/themedStyles';
import { StyleSheet, View, ScrollView, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Stop, Goal } from '../../types/warmpath';
import { placeSpot } from '../../math/hexMath';
import { generateStrandPaths } from '../../math/strandMath';
import HexNode from './HexNode';
import { THEME } from '../../theme/tokens';

const { width: SCREEN_W } = Dimensions.get('window');
const STAGE_W = Math.max(SCREEN_W * 2.4, 960);
const STAGE_H = 360;

interface ConstellationStageProps {
  stops: Stop[];
  goal: Goal;
  selectedStopId: number | null;
  onSelectStop: (stopId: number) => void;
  onPanChange?: (panX: number) => void;
}

export default function ConstellationStage({
  stops,
  goal,
  selectedStopId,
  onSelectStop,
  onPanChange,
}: ConstellationStageProps) {
  const scrollRef = useRef<any>(null);
  const hasUserScrolled = useRef(false);

  // Generate the 14 thermal SVG strands
  const strands = useMemo(() => {
    return generateStrandPaths(stops, STAGE_W, STAGE_H);
  }, [stops]);

  // Positions of nodes
  const youPos = useMemo(() => placeSpot('you', STAGE_W, STAGE_H), []);
  const goalPos = useMemo(() => placeSpot('goal', STAGE_W, STAGE_H), []);

  const stopPositions = useMemo(() => {
    return stops.map((s) => ({
      ...s,
      pos: placeSpot(String(s.activity_id), STAGE_W, STAGE_H),
    }));
  }, [stops]);

  const initialScrollTarget = useRef(0);
  const nextStop = stopPositions.find((s) => s.next);
  initialScrollTarget.current = Math.max(
    0,
    (nextStop ? nextStop.pos.x : youPos.x) - SCREEN_W / 2,
  );

  // Center the next stop once; later store updates and scroll renders must not reset the map.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasUserScrolled.current) {
        scrollRef.current?.scrollTo({
          x: initialScrollTarget.current,
          animated: true,
        });
      }
    }, 150);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        onScrollBeginDrag={() => {
          hasUserScrolled.current = true;
        }}
        onScroll={(e) => {
          if (onPanChange) onPanChange(e.nativeEvent.contentOffset.x);
        }}
        scrollEventThrottle={16}
        contentContainerStyle={{ width: STAGE_W, height: STAGE_H }}
      >
        {/* SVG Thermal Strands Layer (Layer 1 of stage) */}
        <Svg width={STAGE_W} height={STAGE_H} style={StyleSheet.absoluteFill}>
          {/* Additive background ember glow for each strand */}
          {strands.map((strand) => (
            <Path
              key={`glow-${strand.id}`}
              d={strand.d}
              stroke={THEME.colors.ember}
              strokeWidth={3.5}
              strokeOpacity={0.18}
              fill="none"
              strokeLinecap="round"
            />
          ))}

          {/* Crisp hot core for each strand */}
          {strands.map((strand) => (
            <Path
              key={`core-${strand.id}`}
              d={strand.d}
              stroke={THEME.colors.glow}
              strokeWidth={1.2}
              strokeOpacity={0.45}
              fill="none"
              strokeLinecap="round"
            />
          ))}
        </Svg>

        {/* Node: You */}
        <HexNode
          x={youPos.x}
          y={youPos.y}
          label="You"
          isYou
          side={youPos.side}
          onPress={() => onSelectStop(0)}
        />

        {/* Nodes: Checkpoints */}
        {stopPositions.map((stop) => (
          <HexNode
            key={stop.activity_id}
            x={stop.pos.x}
            y={stop.pos.y}
            label={stop.name}
            typeLabel={stop.type}
            achievers={stop.achievers}
            have={stop.have}
            next={stop.next}
            side={stop.pos.side}
            isSelected={selectedStopId === stop.activity_id}
            onPress={() => onSelectStop(stop.activity_id)}
          />
        ))}

        {/* Node: Goal */}
        <HexNode
          x={goalPos.x}
          y={goalPos.y}
          label={goal.label}
          isGoal
          side={goalPos.side}
          onPress={() => onSelectStop(-1)}
        />
      </ScrollView>
    </View>
  );
}

const styles = createThemedStyles(StyleSheet.create({
  container: {
    height: STAGE_H,
    backgroundColor: 'transparent',
  },
}));
