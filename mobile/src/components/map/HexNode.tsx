import React from 'react';
import { createThemedStyles } from '../../theme/themedStyles';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { getHexPath } from '../../math/hexMath';
import { THEME } from '../../theme/tokens';
import { getThemeMode } from '../../theme/tokens';

interface HexNodeProps {
  x: number;
  y: number;
  label: string;
  typeLabel?: string;
  achievers?: number;
  have?: boolean;
  next?: boolean;
  isYou?: boolean;
  isGoal?: boolean;
  isSelected?: boolean;
  side?: 'left' | 'right' | 'above' | 'below';
  onPress: () => void;
}

export default function HexNode({
  x,
  y,
  label,
  typeLabel,
  achievers = 0,
  have = false,
  next = false,
  isYou = false,
  isGoal = false,
  isSelected = false,
  side = 'below',
  onPress,
}: HexNodeProps) {
  // Sizing by achievers count: base radius 18, scaled by achievers
  const radius = isGoal ? 32 : isYou ? 20 : 18 + Math.min(achievers, 12) * 1.2;
  const diameter = radius * 2;
  const touchSize = Math.max(diameter + 16, 48); // Guaranteed 48px touch target

  const hexPath = getHexPath(diameter / 2, diameter / 2, radius - 2);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <View
      style={[
        styles.nodeContainer,
        {
          left: x - touchSize / 2,
          top: y - touchSize / 2,
          width: touchSize,
          height: touchSize,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.touchArea}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        {/* Pulsing ring for NEXT stop */}
        {next && <View style={[styles.pulseRing, { width: diameter + 14, height: diameter + 14 }]} />}

        {/* Selection indicator */}
        {isSelected && (
          <View style={[styles.selectedRing, { width: diameter + 8, height: diameter + 8 }]} />
        )}

        {/* SVG Hexagon Node */}
        <Svg width={diameter} height={diameter}>
          {have && (
            <Path
              d={hexPath}
              fill="none"
              stroke={THEME.colors.gold}
              strokeWidth={10}
              strokeOpacity={0.45}
            />
          )}
          <Path
            d={hexPath}
            fill={
              have
                ? THEME.colors.gold
                : isYou
                ? THEME.colors.bone
                : isGoal
                ? THEME.colors.ember
                : getThemeMode() === 'light'
                  ? 'rgba(255, 255, 255, 0.72)'
                  : 'rgba(6, 4, 11, 0.7)'
            }
            stroke={
              isSelected || next || have
                ? THEME.colors.glow
                : getThemeMode() === 'light'
                  ? 'rgba(11, 31, 69, 0.5)'
                  : 'rgba(244, 238, 230, 0.55)'
            }
            strokeWidth={isSelected ? 2 : next ? 1.5 : 1}
            strokeDasharray={next ? '4,3' : undefined}
          />
        </Svg>
      </TouchableOpacity>

      {/* Node Tag / Label according to side */}
      <View
        style={[
          styles.tag,
          side === 'above' && styles.tagAbove,
          side === 'below' && styles.tagBelow,
          side === 'left' && styles.tagLeft,
          side === 'right' && styles.tagRight,
        ]}
        pointerEvents="none"
      >
        <Text style={[styles.nodeTitle, isGoal && styles.goalTitle]}>
          {label}
        </Text>
        {achievers > 0 && !isGoal && (
          <Text style={styles.nodeCount}>
            <Text style={styles.countBold}>{achievers} of 14</Text> did this
          </Text>
        )}
        {next && <Text style={styles.nextText}>NEXT FOR YOU</Text>}
        {have && <Text style={styles.haveText}>YOU HAVE THIS</Text>}
      </View>
    </View>
  );
}

const styles = createThemedStyles(StyleSheet.create({
  nodeContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  touchArea: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: THEME.colors.glow,
    opacity: 0.5,
  },
  selectedRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: THEME.colors.glow,
  },
  tag: {
    position: 'absolute',
    width: 140,
    alignItems: 'center',
  },
  tagBelow: {
    top: '100%',
    marginTop: 6,
  },
  tagAbove: {
    bottom: '100%',
    marginBottom: 6,
  },
  tagLeft: {
    right: '100%',
    marginRight: 8,
    alignItems: 'flex-end',
  },
  tagRight: {
    left: '100%',
    marginLeft: 8,
    alignItems: 'flex-start',
  },
  nodeTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.bone,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  goalTitle: {
    fontSize: 13,
    color: THEME.colors.glow,
    fontWeight: '700',
  },
  nodeCount: {
    fontSize: 10,
    color: THEME.colors.ash,
    marginTop: 1,
    textAlign: 'center',
  },
  countBold: {
    color: THEME.colors.bone,
    fontWeight: '600',
  },
  nextText: {
    ...THEME.typography.cap,
    fontSize: 7.5,
    color: THEME.colors.glow,
    marginTop: 2,
  },
  haveText: {
    ...THEME.typography.cap,
    fontSize: 7.5,
    color: THEME.colors.gold,
    marginTop: 2,
  },
}));
