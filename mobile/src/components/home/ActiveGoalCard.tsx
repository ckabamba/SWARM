import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Goal, Stop } from '../../types/warmpath';
import { THEME } from '../../theme/tokens';

interface ActiveGoalCardProps {
  goal: Goal;
  stops: Stop[];
  litCount: number;
  onOpenMap: () => void;
  onNewGoalPress: () => void;
}

export default function ActiveGoalCard({
  goal,
  stops,
  litCount,
  onOpenMap,
  onNewGoalPress,
}: ActiveGoalCardProps) {
  const CardContainer = Platform.OS === 'ios' ? BlurView : View;
  const containerProps =
    Platform.OS === 'ios'
      ? { intensity: 25, tint: 'dark' as const, style: styles.card }
      : { style: [styles.card, styles.androidFallback] };

  return (
    <CardContainer {...containerProps}>
      {/* Header Label Row */}
      <View style={styles.headerRow}>
        <Text style={styles.capLabel}>ACTIVE TARGET GOAL</Text>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onNewGoalPress();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.newGoalLink}>
            <Text style={styles.emberArrow}>+ </Text>NEW GOAL
          </Text>
        </TouchableOpacity>
      </View>

      {/* Goal Label */}
      <Text style={styles.goalTitle}>{goal.label}</Text>

      {/* Meta Stats */}
      <Text style={styles.metaStat}>
        <Text style={styles.boldText}>{goal.achievers} alumni</Text> mapped ·{' '}
        <Text style={styles.boldText}>{litCount} of {stops.length}</Text> checkpoints lit
      </Text>

      {/* Mini Linear Progression Preview */}
      <View style={styles.progressionRow}>
        <View style={[styles.dot, styles.dotYou]} />
        <View style={styles.connectingLine} />
        {stops.map((stop) => (
          <React.Fragment key={stop.activity_id}>
            <View
              style={[
                styles.dot,
                stop.have && styles.dotHave,
                stop.next && styles.dotNext,
              ]}
            />
            <View style={styles.connectingLine} />
          </React.Fragment>
        ))}
        <View style={[styles.dot, styles.dotGoal]} />
      </View>

      {/* Primary Glow CTA Button */}
      <TouchableOpacity
        style={styles.openMapButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onOpenMap();
        }}
        activeOpacity={0.85}
      >
        <Text style={styles.openMapText}>Open Constellation Map</Text>
        <Text style={styles.openMapArrow}>→</Text>
      </TouchableOpacity>
    </CardContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.panel,
    borderRadius: THEME.rounded.card,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    padding: 18,
    marginBottom: 16,
    overflow: 'hidden',
  },
  androidFallback: {
    backgroundColor: 'rgba(12, 8, 20, 0.94)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  capLabel: {
    ...THEME.typography.cap,
    fontSize: 9.5,
    color: THEME.colors.ash,
  },
  newGoalLink: {
    ...THEME.typography.cap,
    fontSize: 9.5,
    color: THEME.colors.bone,
    letterSpacing: 1.2,
  },
  emberArrow: {
    color: THEME.colors.ember,
    fontWeight: '700',
  },
  goalTitle: {
    ...THEME.typography.display,
    fontSize: 22,
    color: THEME.colors.bone,
    marginBottom: 6,
  },
  metaStat: {
    ...THEME.typography.bodyAsh,
    fontSize: 13,
    marginBottom: 16,
  },
  boldText: {
    color: THEME.colors.bone,
    fontWeight: '600',
  },
  progressionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(244, 238, 230, 0.25)',
  },
  dotYou: {
    backgroundColor: THEME.colors.bone,
  },
  dotHave: {
    backgroundColor: THEME.colors.gold,
  },
  dotNext: {
    backgroundColor: THEME.colors.glow,
    borderWidth: 1.5,
    borderColor: THEME.colors.glow,
    transform: [{ scale: 1.2 }],
  },
  dotGoal: {
    backgroundColor: THEME.colors.ember,
  },
  connectingLine: {
    flex: 1,
    height: 1,
    backgroundColor: THEME.colors.line,
  },
  openMapButton: {
    backgroundColor: THEME.colors.glow,
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: THEME.rounded.pill,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  openMapText: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.void,
  },
  openMapArrow: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.void,
  },
});
