import React from 'react';
import { createThemedStyles } from '../../theme/themedStyles';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ask } from '../../types/warmpath';
import { THEME } from '../../theme/tokens';

interface AsksOutboxProps {
  asks: Ask[];
  onOpenReplyDemo: (askId: number) => void;
}

export default function AsksOutbox({ asks, onOpenReplyDemo }: AsksOutboxProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.capLabel}>YOUR ASKS · OUTBOX</Text>
        <Text style={styles.countText}>{asks.length} TOTAL</Text>
      </View>

      {asks.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No asks sent yet</Text>
          <Text style={styles.emptySub}>
            Open the Constellation Map, select any checkpoint, and tap Ask to dispatch a 15-minute call request.
          </Text>
        </View>
      ) : (
        asks.map((ask) => {
          const isAccepted = ask.status === 'accepted';

          return (
            <TouchableOpacity
              key={ask.id}
              style={[styles.askCard, isAccepted && styles.askCardAccepted]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onOpenReplyDemo(ask.id);
              }}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.alumName}>{ask.alum_name}</Text>
                  <Text style={styles.timeMeta}>{ask.created_at}</Text>
                </View>

                <View style={[styles.statusBadge, isAccepted && styles.statusBadgeAccepted]}>
                  <Text style={[styles.statusText, isAccepted && styles.statusTextAccepted]}>
                    {isAccepted ? '✓ CALL ACCEPTED' : 'WAITING FOR REPLY'}
                  </Text>
                </View>
              </View>

              {/* Shared Tie Highlight in Theme Tie Color */}
              <Text style={styles.sharedTie}>{ask.shared_tie}</Text>

              {/* Test link hint */}
              <View style={styles.testLinkRow}>
                <Text style={styles.testLinkText}>
                  {isAccepted ? 'Tap to open conversation →' : 'Tap to open conversation →'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}

const styles = createThemedStyles(StyleSheet.create({
  container: {
    marginBottom: 24,
    paddingTop: 16,
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
  countText: {
    ...THEME.typography.cap,
    fontSize: 9,
    color: THEME.colors.ash,
  },
  emptyCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.rounded.field,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    padding: 16,
  },
  emptyTitle: {
    ...THEME.typography.title,
    fontSize: 14,
    color: THEME.colors.bone,
    marginBottom: 4,
  },
  emptySub: {
    ...THEME.typography.bodyAsh,
    fontSize: 12.5,
  },
  askCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.rounded.card,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    padding: 14,
    marginBottom: 10,
  },
  askCardAccepted: {
    borderColor: 'rgba(255, 233, 168, 0.4)',
    backgroundColor: 'rgba(255, 233, 168, 0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  alumName: {
    ...THEME.typography.title,
    fontSize: 15,
    fontWeight: '600',
    color: THEME.colors.bone,
  },
  timeMeta: {
    ...THEME.typography.bodyAsh,
    fontSize: 11,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.rounded.pill,
    backgroundColor: 'rgba(143, 135, 152, 0.15)',
  },
  statusBadgeAccepted: {
    backgroundColor: 'rgba(255, 233, 168, 0.15)',
  },
  statusText: {
    ...THEME.typography.cap,
    fontSize: 8.5,
    color: THEME.colors.ash,
    letterSpacing: 1.2,
  },
  statusTextAccepted: {
    color: THEME.colors.glow,
    fontWeight: '700',
  },
  sharedTie: {
    fontFamily: 'System',
    fontSize: 12.5,
    lineHeight: 18,
    color: THEME.colors.tie,
    marginTop: 4,
  },
  testLinkRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(244, 238, 230, 0.08)',
  },
  testLinkText: {
    fontSize: 11,
    fontWeight: '500',
    color: THEME.colors.ash,
  },
}));
