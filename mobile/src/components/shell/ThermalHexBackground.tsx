import React, { useMemo } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Svg, { Path, Circle, Defs, RadialGradient, Stop as SvgStop } from 'react-native-svg';
import { generateHexLattice, getHexPath, HEX_R } from '../../math/hexMath';
import { mulberry } from '../../math/strandMath';
import { THEME } from '../../theme/tokens';

interface ThermalHexBackgroundProps {
  panX?: number; // Parallax offset on Map
  lowBatteryMode?: boolean;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CANVAS_W = Math.max(SCREEN_W * 2.4, 960);
const CANVAS_H = SCREEN_H;

export default function ThermalHexBackground({
  panX = 0,
  lowBatteryMode = false,
}: ThermalHexBackgroundProps) {
  // Generate fixed lattice cells
  const cells = useMemo(() => {
    return generateHexLattice(CANVAS_W, CANVAS_H);
  }, []);

  // Combined path for all background hex walls to keep SVG render calls ultra-fast at 60fps
  const latticePathData = useMemo(() => {
    return cells.map((cell) => getHexPath(cell.x, cell.y, HEX_R - 1)).join(' ');
  }, [cells]);

  // Generate ~40 thermal dust dots using mulberry PRNG
  const dustDots = useMemo(() => {
    if (lowBatteryMode) return [];
    const rand = mulberry(42);
    return Array.from({ length: 38 }, (_, i) => ({
      id: i,
      cx: rand() * CANVAS_W,
      cy: rand() * CANVAS_H,
      r: 1.2 + rand() * 2.2,
      opacity: 0.18 + rand() * 0.45,
    }));
  }, [lowBatteryMode]);

  return (
    <View
      style={[
        styles.container,
        {
          transform: [{ translateX: -panX * 0.4 }], // Subtle parallax shift
        },
      ]}
      pointerEvents="none"
    >
      <Svg width={CANVAS_W} height={CANVAS_H} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="thermalDust" cx="50%" cy="50%" rx="50%" ry="50%">
            <SvgStop offset="0%" stopColor={THEME.colors.glow} stopOpacity="0.8" />
            <SvgStop offset="100%" stopColor={THEME.colors.ember} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Honeycomb lattice walls in faint Buzz Gold */}
        <Path
          d={latticePathData}
          stroke="rgba(234, 170, 0, 0.13)"
          strokeWidth={0.8}
          fill="none"
        />

        {/* Floating thermal dust particles */}
        {!lowBatteryMode &&
          dustDots.map((dot) => (
            <Circle
              key={dot.id}
              cx={dot.cx}
              cy={dot.cy}
              r={dot.r}
              fill="url(#thermalDust)"
              opacity={dot.opacity}
            />
          ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: CANVAS_W,
    height: CANVAS_H,
  },
});
