import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Stop, Alum, Ask } from '../../types/warmpath';
import { THEME } from '../../theme/tokens';

const { height: SCREEN_H } = Dimensions.get('window');

// 3 Snap points: Peek (32%), Half (55%), Expanded (84%)
const SNAP_PEEK = SCREEN_H * 0.32;
const SNAP_HALF = SCREEN_H * 0.55;
const SNAP_EXPANDED = SCREEN_H * 0.84;

interface ConstellationSheetProps {
  stops: Stop[];
  alumni: Alum[];
  selectedStopId: number | null;
  onSendAsk: (alumId: number, message: string) => void;
}

export default function ConstellationSheet({
  stops,
  alumni,
  selectedStopId,
  onSendAsk,
}: ConstellationSheetProps) {
  const [sheetMode, setSheetMode] = useState<'stop' | 'week' | 'closest'>('stop');
  const [expandedAlumId, setExpandedAlumId] = useState<number | null>(null);
  const [draftMessage, setDraftMessage] = useState('');
  const [sentAlumIds, setSentAlumIds] = useState<number[]>([]);

  // Current sheet height animated value
  const sheetHeight = useRef(new Animated.Value(SNAP_PEEK)).current;
  const currentHeightRef = useRef(SNAP_PEEK);

  const snapTo = (height: number) => {
    Animated.spring(sheetHeight, {
      toValue: height,
      useNativeDriver: false,
      friction: 8,
      tension: 65,
    }).start();
    currentHeightRef.current = height;
  };

  // Pan Responder for drag handle
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4,
      onPanResponderMove: (_, gesture) => {
        const newH = currentHeightRef.current - gesture.dy;
        if (newH >= SNAP_PEEK * 0.8 && newH <= SNAP_EXPANDED * 1.05) {
          sheetHeight.setValue(newH);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        const finalH = currentHeightRef.current - gesture.dy;
        // Snap to nearest detent
        const distPeek = Math.abs(finalH - SNAP_PEEK);
        const distHalf = Math.abs(finalH - SNAP_HALF);
        const distExpanded = Math.abs(finalH - SNAP_EXPANDED);

        if (distPeek <= distHalf && distPeek <= distExpanded) {
          snapTo(SNAP_PEEK);
        } else if (distHalf <= distExpanded) {
          snapTo(SNAP_HALF);
        } else {
          snapTo(SNAP_EXPANDED);
        }
      },
    })
  ).current;

  // Selected stop data
  const selectedStop =
    stops.find((s) => s.activity_id === selectedStopId) ||
    stops.find((s) => s.next) ||
    stops[0];

  // Relevant alumni for this stop
  const relevantAlumni = alumni.filter(
    (a) => !selectedStopId || a.activities.includes(selectedStop.activity_id)
  );

  const handleOpenDraft = (alum: Alum) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedAlumId(alum.id);
    setDraftMessage(alum.draft);
    snapTo(SNAP_EXPANDED); // Auto-expand when drafting
  };

  const handleSendDraft = (alumId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSendAsk(alumId, draftMessage);
    setSentAlumIds((prev) => [...prev, alumId]);
    setExpandedAlumId(null);
  };

  return (
    <Animated.View style={[styles.sheetContainer, { height: sheetHeight }]}>
      {/* Drag Handle Bar */}
      <View {...panResponder.panHandlers} style={styles.handleZone}>
        <View style={styles.dragBar} />
      </View>

      {/* Mode Switcher Tabs */}
      <View style={styles.modeTabsRow}>
        <TouchableOpacity
          style={[styles.modeTab, sheetMode === 'stop' && styles.modeTabActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSheetMode('stop');
          }}
        >
          <Text style={[styles.modeTabText, sheetMode === 'stop' && styles.modeTabTextActive]}>
            STOP ALUMNI
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeTab, sheetMode === 'week' && styles.modeTabActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSheetMode('week');
          }}
        >
          <Text style={[styles.modeTabText, sheetMode === 'week' && styles.modeTabTextActive]}>
            THIS WEEK
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeTab, sheetMode === 'closest' && styles.modeTabActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSheetMode('closest');
          }}
        >
          <Text style={[styles.modeTabText, sheetMode === 'closest' && styles.modeTabTextActive]}>
            CLOSEST STARTS
          </Text>
        </TouchableOpacity>
      </View>

      {/* Scrollable Sheet Content */}
      <ScrollView
        style={styles.sheetScroll}
        contentContainerStyle={styles.sheetContent}
        showsVerticalScrollIndicator={false}
      >
        {/* MODE 1: STOP ALUMNI */}
        {sheetMode === 'stop' && (
          <View>
            {/* Selected Stop Header */}
            <View style={styles.stopSummary}>
              <View style={styles.stopNameRow}>
                <Text style={styles.stopTitle}>{selectedStop.name}</Text>
                {selectedStop.next && <Text style={styles.nextBadge}>NEXT STEP</Text>}
                {selectedStop.have && <Text style={styles.haveBadge}>COMPLETED</Text>}
              </View>
              <Text style={styles.stopSub}>
                <Text style={styles.boldWhite}>{selectedStop.achievers} of 14</Text> alumni completed this · Lift {selectedStop.lift}×
              </Text>
              {selectedStop.event && (
                <View style={styles.stopEventBadge}>
                  <Text style={styles.eventBadgeText}>
                    📅 {selectedStop.event.title} · {selectedStop.event.displayTime || 'This week'} ({selectedStop.event.location})
                  </Text>
                </View>
              )}
            </View>

            {/* Alumni List */}
            <Text style={styles.sectionCap}>ALUMNI BEHIND THIS CHECKPOINT</Text>
            {relevantAlumni.map((alum) => {
              const isSent = sentAlumIds.includes(alum.id);
              const isDrafting = expandedAlumId === alum.id;

              return (
                <View key={alum.id} style={styles.alumRow}>
                  <View style={styles.alumHeader}>
                    <View>
                      <Text style={styles.alumName}>{alum.name}</Text>
                      <Text style={styles.alumGrad}>
                        {alum.major} '{alum.grad_year} · {alum.city}
                      </Text>
                    </View>

                    {isSent ? (
                      <View style={styles.sentBadge}>
                        <Text style={styles.sentText}>✓ Ask Sent</Text>
                      </View>
                    ) : !isDrafting ? (
                      <TouchableOpacity
                        style={styles.askButton}
                        onPress={() => handleOpenDraft(alum)}
                      >
                        <Text style={styles.askButtonText}>Ask {alum.firstName}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {/* Shared Tie Highlight */}
                  <Text style={styles.sharedTieText}>{alum.shared_tie}</Text>

                  {/* Inline Ask Composer */}
                  {isDrafting && (
                    <View style={styles.composerBox}>
                      <Text style={styles.composerCap}>DRAFTED ASK (LLM)</Text>
                      <TextInput
                        style={styles.composerInput}
                        value={draftMessage}
                        onChangeText={setDraftMessage}
                        multiline
                        numberOfLines={4}
                        selectionColor={THEME.colors.ember}
                      />
                      <View style={styles.composerActions}>
                        <TouchableOpacity
                          style={styles.cancelBtn}
                          onPress={() => setExpandedAlumId(null)}
                        >
                          <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.sendBtn}
                          onPress={() => handleSendDraft(alum.id)}
                        >
                          <Text style={styles.sendBtnText}>Send the ask</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* MODE 2: THIS WEEK */}
        {sheetMode === 'week' && (
          <View>
            <Text style={styles.sectionCap}>THIS WEEK ON YOUR PATH</Text>
            {stops
              .filter((s) => s.event)
              .map((s) => (
                <View key={s.activity_id} style={styles.eventRowItem}>
                  <Text style={styles.eventTimeCol}>{s.event?.displayTime || 'Upcoming'}</Text>
                  <View style={styles.eventBodyCol}>
                    <Text style={styles.eventItemTitle}>{s.event?.title}</Text>
                    <Text style={styles.eventItemMeta}>
                      {s.name} · {s.event?.location}
                    </Text>
                  </View>
                </View>
              ))}
          </View>
        )}

        {/* MODE 3: CLOSEST STARTS */}
        {sheetMode === 'closest' && (
          <View>
            <Text style={styles.sectionCap}>ALUMNI RANKED BY STARTING SIMILARITY</Text>
            {alumni.map((alum) => (
              <View key={alum.id} style={styles.closestItem}>
                <View style={styles.closestHeader}>
                  <Text style={styles.closestName}>{alum.name}</Text>
                  <Text style={styles.closestScore}>{(alum.score * 100).toFixed(0)}% MATCH</Text>
                </View>
                <Text style={styles.closestTie}>{alum.shared_tie}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: THEME.colors.panel,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.line,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 20,
  },
  handleZone: {
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(244, 238, 230, 0.3)',
  },
  modeTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: THEME.spacing.gutter,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.line,
    paddingBottom: 10,
  },
  modeTab: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: THEME.rounded.pill,
  },
  modeTabActive: {
    backgroundColor: 'rgba(255, 233, 168, 0.15)',
  },
  modeTabText: {
    ...THEME.typography.cap,
    fontSize: 9.5,
    color: THEME.colors.ash,
  },
  modeTabTextActive: {
    color: THEME.colors.glow,
    fontWeight: '700',
  },
  sheetScroll: {
    flex: 1,
  },
  sheetContent: {
    paddingHorizontal: THEME.spacing.gutter,
    paddingTop: 12,
    paddingBottom: 40,
  },
  stopSummary: {
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.line,
    marginBottom: 14,
  },
  stopNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stopTitle: {
    ...THEME.typography.title,
    fontSize: 17,
    fontWeight: '600',
    color: THEME.colors.bone,
    flex: 1,
  },
  nextBadge: {
    ...THEME.typography.cap,
    fontSize: 8,
    color: THEME.colors.glow,
    backgroundColor: 'rgba(255, 233, 168, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  haveBadge: {
    ...THEME.typography.cap,
    fontSize: 8,
    color: THEME.colors.gold,
    backgroundColor: 'rgba(234, 170, 0, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stopSub: {
    ...THEME.typography.bodyAsh,
    fontSize: 12.5,
    marginTop: 4,
  },
  boldWhite: {
    color: THEME.colors.bone,
    fontWeight: '600',
  },
  stopEventBadge: {
    marginTop: 8,
    padding: 8,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.rounded.field,
    borderWidth: 1,
    borderColor: THEME.colors.line,
  },
  eventBadgeText: {
    fontSize: 11.5,
    color: THEME.colors.bone,
  },
  sectionCap: {
    ...THEME.typography.cap,
    fontSize: 9,
    color: THEME.colors.ash,
    marginBottom: 10,
  },
  alumRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(244, 238, 230, 0.08)',
  },
  alumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  alumName: {
    ...THEME.typography.title,
    fontSize: 15,
    fontWeight: '600',
  },
  alumGrad: {
    ...THEME.typography.bodyAsh,
    fontSize: 12,
    marginTop: 1,
  },
  askButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: THEME.rounded.pill,
    borderWidth: 1,
    borderColor: THEME.colors.glow,
    backgroundColor: 'rgba(255, 233, 168, 0.08)',
  },
  askButtonText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: THEME.colors.glow,
  },
  sentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.rounded.pill,
    backgroundColor: 'rgba(255, 233, 168, 0.15)',
  },
  sentText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.glow,
  },
  sharedTieText: {
    fontFamily: 'System',
    fontSize: 12.5,
    lineHeight: 18,
    color: THEME.colors.tie,
    marginTop: 6,
  },
  composerBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: THEME.rounded.field,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.line,
  },
  composerCap: {
    ...THEME.typography.cap,
    fontSize: 8,
    color: THEME.colors.ash,
    marginBottom: 6,
  },
  composerInput: {
    fontSize: 13,
    color: THEME.colors.bone,
    backgroundColor: 'rgba(244, 238, 230, 0.04)',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  composerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  cancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  cancelBtnText: {
    fontSize: 12,
    color: THEME.colors.ash,
  },
  sendBtn: {
    backgroundColor: THEME.colors.glow,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: THEME.rounded.pill,
  },
  sendBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.void,
  },
  eventRowItem: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(244, 238, 230, 0.08)',
    gap: 14,
  },
  eventTimeCol: {
    width: 65,
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.ember,
  },
  eventBodyCol: {
    flex: 1,
  },
  eventItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.bone,
  },
  eventItemMeta: {
    fontSize: 12,
    color: THEME.colors.ash,
    marginTop: 2,
  },
  closestItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(244, 238, 230, 0.08)',
  },
  closestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closestName: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.bone,
  },
  closestScore: {
    ...THEME.typography.cap,
    fontSize: 8.5,
    color: THEME.colors.glow,
  },
  closestTie: {
    fontSize: 12,
    color: THEME.colors.tie,
    marginTop: 4,
    lineHeight: 16,
  },
});
