import React from 'react';
import { createThemedStyles } from '../../theme/themedStyles';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Stop } from '../../types/warmpath';
import { THEME } from '../../theme/tokens';

interface NextPreviewCardProps {
  nextStop: Stop | null;
  onViewOnMap: (activityId: number) => void;
}

export default function NextPreviewCard({ nextStop, onViewOnMap }: NextPreviewCardProps) {
  if (!nextStop) return null;

  const CardContainer = Platform.OS === 'ios' ? BlurView : View;
  const containerProps =
    Platform.OS === 'ios'
      ? { intensity: 20, tint: 'dark' as const, style: styles.card }
      : { style: [styles.card, styles.androidFallback] };

  return (
    <CardContainer {...containerProps}>
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onViewOnMap(nextStop.activity_id);
        }}
        activeOpacity={0.8}
      >
        <View style={styles.headerRow}>
          <Text style={styles.capLabel}>NEXT FOR YOU · HIGHEST LIFT</Text>
          <Text style={styles.liftBadge}>{nextStop.lift}× LIFT</Text>
        </View>

        <Text style={styles.stopName}>{nextStop.name}</Text>
        <Text style={styles.stopType}>
          <Text style={styles.achieverCount}>{nextStop.achievers} alumni</Text> who landed this goal completed this
        </Text>

        {nextStop.event ? (
          <View style={styles.eventBox}>
            <Text style={styles.eventCap}>UPCOMING EVENT THIS WEEK</Text>
            <Text style={styles.eventTitle}>{nextStop.event.title}</Text>
            <Text style={styles.eventMeta}>
              {nextStop.event.displayTime || 'Upcoming'} · {nextStop.event.location}
            </Text>
          </View>
        ) : null}

        <View style={styles.footerLink}>
          <Text style={styles.viewMapText}>Focus on Constellation Map →</Text>
        </View>
      </TouchableOpacity>
    </CardContainer>
  );
}

const styles = createThemedStyles(StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.panel,
    borderRadius: THEME.rounded.card,
    borderWidth: 1,
    borderColor: 'rgba(255, 233, 168, 0.35)', // Faint glow border
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
    color: THEME.colors.glow,
  },
  liftBadge: {
    ...THEME.typography.cap,
    fontSize: 9,
    color: THEME.colors.glow,
    backgroundColor: 'rgba(255, 233, 168, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: THEME.rounded.pill,
  },
  stopName: {
    ...THEME.typography.title,
    fontSize: 18,
    fontWeight: '600',
    color: THEME.colors.bone,
    marginBottom: 4,
  },
  stopType: {
    ...THEME.typography.bodyAsh,
    fontSize: 13,
    marginBottom: 12,
  },
  achieverCount: {
    color: THEME.colors.bone,
    fontWeight: '600',
  },
  eventBox: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.rounded.field,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    padding: 12,
    marginBottom: 12,
  },
  eventCap: {
    ...THEME.typography.cap,
    fontSize: 8.5,
    color: THEME.colors.ember,
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: THEME.colors.bone,
  },
  eventMeta: {
    fontSize: 12,
    color: THEME.colors.ash,
    marginTop: 2,
  },
  footerLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewMapText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: THEME.colors.glow,
  },
}));
