import React from 'react';
import { createThemedStyles } from '../../theme/themedStyles';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Stop } from '../../types/warmpath';
import { THEME } from '../../theme/tokens';

interface LitHexChipsProps {
  stops: Stop[];
  onToggleHave: (activityId: number) => void;
}

export default function LitHexChips({ stops, onToggleHave }: LitHexChipsProps) {
  const handleChipPress = (activityId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggleHave(activityId);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.capLabel}>YOUR LIT CHECKPOINTS</Text>
        <Text style={styles.hintText}>TAP TO TOGGLE STATUS</Text>
      </View>

      <View style={styles.chipsWrap}>
        {stops.map((stop) => (
          <TouchableOpacity
            key={stop.activity_id}
            style={[
              styles.chip,
              stop.have && styles.chipHave,
              stop.next && styles.chipNext,
            ]}
            onPress={() => handleChipPress(stop.activity_id)}
            activeOpacity={0.75}
          >
            {/* Indicator Mini Icon */}
            <View
              style={[
                styles.chipDot,
                stop.have && styles.chipDotHave,
                stop.next && styles.chipDotNext,
              ]}
            />

            <Text
              style={[
                styles.chipText,
                stop.have && styles.chipTextHave,
                stop.next && styles.chipTextNext,
              ]}
            >
              {stop.name}
            </Text>

            {stop.have && <Text style={styles.checkIcon}>✓</Text>}
            {stop.next && <Text style={styles.nextTag}>NEXT</Text>}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = createThemedStyles(StyleSheet.create({
  container: {
    marginBottom: 24,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.line,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  capLabel: {
    ...THEME.typography.cap,
    fontSize: 9.5,
    color: THEME.colors.ash,
  },
  hintText: {
    ...THEME.typography.cap,
    fontSize: 8.5,
    color: 'rgba(143, 135, 152, 0.7)',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: THEME.rounded.pill,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    backgroundColor: THEME.colors.surface,
    gap: 6,
  },
  chipHave: {
    borderColor: THEME.colors.gold,
    backgroundColor: 'rgba(234, 170, 0, 0.15)',
  },
  chipNext: {
    borderColor: THEME.colors.glow,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255, 233, 168, 0.08)',
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.ash,
  },
  chipDotHave: {
    backgroundColor: THEME.colors.gold,
  },
  chipDotNext: {
    backgroundColor: THEME.colors.glow,
  },
  chipText: {
    fontSize: 12.5,
    color: THEME.colors.ash,
  },
  chipTextHave: {
    color: THEME.colors.bone,
    fontWeight: '600',
  },
  chipTextNext: {
    color: THEME.colors.glow,
    fontWeight: '600',
  },
  checkIcon: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.gold,
  },
  nextTag: {
    ...THEME.typography.cap,
    fontSize: 8,
    color: THEME.colors.glow,
    backgroundColor: 'rgba(255, 233, 168, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
}));
