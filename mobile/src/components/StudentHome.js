import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { THEME } from '../theme';

export default function StudentHome({
  student,
  pathData,
  onSendAsk,
  onSwitchStudent,
  currentStudentId,
}) {
  const [goalText, setGoalText] = useState('SWE internship at NVIDIA');
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftMessage, setDraftMessage] = useState(pathData.topAlum.draftMessage);
  const [hasSentAsk, setHasSentAsk] = useState(false);

  const handleSend = () => {
    onSendAsk({
      id: Date.now(),
      studentName: student.name,
      studentMajor: student.major,
      studentYear: `${student.title} · ${student.major}`,
      alumId: pathData.topAlum.id,
      alumName: pathData.topAlum.name,
      sharedTie: pathData.topAlum.sharedTie,
      message: draftMessage,
      status: 'pending',
      createdAt: 'Just now',
    });
    setHasSentAsk(true);
    setDraftOpen(false);
    Alert.alert(
      'Ask Dispatched',
      `Your request was sent to ${pathData.topAlum.name}. Switch to the ALUM REPLY view above to test the reply experience.`
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Student Switcher Bar */}
      <View style={styles.studentSwitcherRow}>
        <Text style={styles.sectionLabel}>ACTIVE STUDENT</Text>
        <View style={styles.miniPillGroup}>
          <TouchableOpacity
            style={[
              styles.miniPill,
              currentStudentId === 1 && styles.miniPillActive,
            ]}
            onPress={() => onSwitchStudent(1)}
          >
            <Text
              style={[
                styles.miniPillText,
                currentStudentId === 1 && styles.miniPillTextActive,
              ]}
            >
              George P. Burdell (CompE · 2nd)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.miniPill,
              currentStudentId === 2 && styles.miniPillActive,
            ]}
            onPress={() => onSwitchStudent(2)}
          >
            <Text
              style={[
                styles.miniPillText,
                currentStudentId === 2 && styles.miniPillTextActive,
              ]}
            >
              Devon Brooks (CS · 1st)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Goal Input Section */}
      <View style={styles.goalSection}>
        <Text style={styles.sectionLabel}>TARGET GOAL</Text>
        <View style={styles.goalInputRow}>
          <TextInput
            style={styles.goalInput}
            value={goalText}
            onChangeText={setGoalText}
            placeholder="Type your goal..."
            placeholderTextColor="rgba(244, 238, 230, 0.4)"
            selectionColor={THEME.colors.ember}
          />
        </View>
        <View style={styles.goalUnderline} />

        {/* Arrow links */}
        <View style={styles.arrowRow}>
          <TouchableOpacity
            style={styles.arrowLink}
            onPress={() => setGoalText('SWE internship at NVIDIA')}
          >
            <Text style={styles.arrowIcon}>→</Text>
            <Text style={styles.arrowText}>SWE AT NVIDIA</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.arrowLink}
            onPress={() => setGoalText('Robotics Research at IRIM')}
          >
            <Text style={styles.arrowIcon}>→</Text>
            <Text style={styles.arrowText}>ROBOTICS RESEARCH</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Path Checkpoints Section */}
      <View style={styles.pathSection}>
        <View style={styles.pathHeader}>
          <Text style={styles.sectionLabel}>PATH TO GOAL</Text>
          <Text style={styles.achieversMeta}>
            <Text style={styles.achieversBold}>{pathData.goal.achieversCount}</Text> achievers in dataset
          </Text>
        </View>

        {pathData.stops.map((stop, index) => {
          // If Devon is selected, Devon doesn't have stop 1
          const isHave = currentStudentId === 1 ? stop.have : (stop.activityId === 5);
          const isNext = currentStudentId === 1 ? stop.next : (stop.activityId === 3);

          return (
            <View key={stop.id} style={styles.stopRow}>
              {/* Geometric checkpoint marker */}
              <View style={styles.markerCol}>
                <View
                  style={[
                    styles.hexMarker,
                    isHave && styles.hexMarkerHave,
                    isNext && styles.hexMarkerNext,
                  ]}
                >
                  <Text
                    style={[
                      styles.hexNumber,
                      (isHave || isNext) && styles.hexNumberActive,
                    ]}
                  >
                    {index + 1}
                  </Text>
                </View>
                {index < pathData.stops.length - 1 && <View style={styles.pathLine} />}
              </View>

              {/* Stop info */}
              <View style={styles.stopBody}>
                <View style={styles.stopTitleRow}>
                  <Text style={styles.stopTitle}>{stop.name}</Text>
                  {isHave && (
                    <Text style={styles.tagHave}>YOU HAVE THIS</Text>
                  )}
                  {isNext && (
                    <Text style={styles.tagNext}>NEXT FOR YOU</Text>
                  )}
                </View>

                {/* Count in Bone, descriptor in Ash (The Heat is Data rule) */}
                <Text style={styles.stopStat}>
                  <Text style={styles.statCount}>{stop.achievers} of {pathData.goal.achieversCount}</Text>{' '}
                  did this · {stop.type} · Lift {stop.lift}×
                </Text>

                {stop.event && (
                  <View style={styles.eventRow}>
                    <Text style={styles.eventLabel}>NEXT EVENT</Text>
                    <Text style={styles.eventTitle}>{stop.event.title}</Text>
                    <Text style={styles.eventMeta}>
                      {stop.event.time} · {stop.event.location}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* People Panel / Closest Match */}
      <View style={styles.peopleSection}>
        <View style={styles.pathHeader}>
          <Text style={styles.sectionLabel}>CLOSEST ALUMNI START</Text>
          <Text style={styles.rankMeta}>RANK 1</Text>
        </View>

        <View style={styles.personRow}>
          <View style={styles.personHeaderRow}>
            <Text style={styles.personName}>{pathData.topAlum.name}</Text>
            <Text style={styles.personGrad}>
              {pathData.topAlum.major} '{pathData.topAlum.gradYear}
            </Text>
          </View>
          <Text style={styles.personRole}>{pathData.topAlum.role}</Text>

          {/* Shared tie sentence in colors.tie */}
          <Text style={styles.sharedTieText}>{pathData.topAlum.sharedTie}</Text>

          {/* Ask Flow */}
          {hasSentAsk ? (
            <View style={styles.statusLine}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Ask sent · Awaiting 15-minute response</Text>
            </View>
          ) : !draftOpen ? (
            <TouchableOpacity
              style={styles.ghostButton}
              onPress={() => setDraftOpen(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.ghostButtonText}>Ask 15-min call</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.draftContainer}>
              <Text style={styles.draftLabel}>DRAFTED ASK (LLM GENERATED)</Text>
              <TextInput
                style={styles.draftInput}
                value={draftMessage}
                onChangeText={setDraftMessage}
                multiline
                numberOfLines={4}
                selectionColor={THEME.colors.ember}
              />
              <View style={styles.draftActionsRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setDraftOpen(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleSend}
                >
                  <Text style={styles.primaryButtonText}>Send the ask</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.void,
  },
  content: {
    paddingHorizontal: THEME.spacing.gutter,
    paddingTop: 16,
    paddingBottom: 48,
  },
  studentSwitcherRow: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.line,
  },
  sectionLabel: {
    ...THEME.typography.label,
    marginBottom: 8,
  },
  miniPillGroup: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  miniPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.rounded.pill,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    backgroundColor: THEME.colors.surface,
  },
  miniPillActive: {
    borderColor: THEME.colors.glow,
    backgroundColor: 'rgba(255, 233, 168, 0.1)',
  },
  miniPillText: {
    fontSize: 12,
    color: THEME.colors.ash,
  },
  miniPillTextActive: {
    color: THEME.colors.glow,
    fontWeight: '600',
  },
  goalSection: {
    marginBottom: 28,
  },
  goalInputRow: {
    marginTop: 4,
  },
  goalInput: {
    ...THEME.typography.display,
    fontSize: 22,
    paddingVertical: 4,
    color: THEME.colors.bone,
  },
  goalUnderline: {
    height: 1,
    backgroundColor: THEME.colors.line,
    marginTop: 8,
    marginBottom: 12,
  },
  arrowRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  arrowLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  arrowIcon: {
    color: THEME.colors.ember,
    fontSize: 12,
    fontWeight: 'bold',
  },
  arrowText: {
    ...THEME.typography.label,
    fontSize: 10,
    color: THEME.colors.ash,
  },
  pathSection: {
    marginBottom: 28,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.line,
  },
  pathHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  achieversMeta: {
    ...THEME.typography.bodyAsh,
    fontSize: 12,
  },
  achieversBold: {
    color: THEME.colors.bone,
    fontWeight: '600',
  },
  stopRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  markerCol: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  hexMarker: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(244, 238, 230, 0.55)',
    backgroundColor: 'rgba(6, 4, 11, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hexMarkerHave: {
    borderColor: THEME.colors.glow,
    backgroundColor: THEME.colors.gold,
  },
  hexMarkerNext: {
    borderColor: THEME.colors.glow,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    backgroundColor: 'rgba(234, 170, 0, 0.15)',
  },
  hexNumber: {
    fontSize: 11,
    color: THEME.colors.ash,
    fontWeight: '600',
  },
  hexNumberActive: {
    color: THEME.colors.void,
    fontWeight: '700',
  },
  pathLine: {
    width: 1,
    flex: 1,
    backgroundColor: THEME.colors.line,
    marginTop: 6,
  },
  stopBody: {
    flex: 1,
  },
  stopTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stopTitle: {
    ...THEME.typography.title,
    flex: 1,
  },
  tagHave: {
    ...THEME.typography.label,
    fontSize: 9,
    color: THEME.colors.glow,
    letterSpacing: 1.0,
  },
  tagNext: {
    ...THEME.typography.label,
    fontSize: 9,
    color: THEME.colors.glow,
    letterSpacing: 1.0,
  },
  stopStat: {
    ...THEME.typography.bodyAsh,
    fontSize: 13,
    marginTop: 3,
  },
  statCount: {
    color: THEME.colors.bone,
    fontWeight: '600',
  },
  eventRow: {
    marginTop: 8,
    padding: 10,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.rounded.field,
    borderWidth: 1,
    borderColor: THEME.colors.line,
  },
  eventLabel: {
    ...THEME.typography.label,
    fontSize: 8.5,
    color: THEME.colors.ember,
    marginBottom: 2,
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: THEME.colors.bone,
  },
  eventMeta: {
    fontSize: 12,
    color: THEME.colors.ash,
    marginTop: 2,
  },
  peopleSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.line,
  },
  rankMeta: {
    ...THEME.typography.label,
    fontSize: 9,
    color: THEME.colors.ash,
  },
  personRow: {
    paddingTop: 8,
  },
  personHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  personName: {
    ...THEME.typography.title,
    fontWeight: '600',
  },
  personGrad: {
    ...THEME.typography.bodyAsh,
    fontSize: 13,
  },
  personRole: {
    ...THEME.typography.bodyAsh,
    fontSize: 13,
    marginTop: 2,
    marginBottom: 8,
  },
  sharedTieText: {
    fontFamily: 'System',
    fontSize: 13.5,
    lineHeight: 19,
    color: THEME.colors.tie,
    marginBottom: 14,
  },
  ghostButton: {
    alignSelf: 'flex-start',
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: THEME.rounded.pill,
    borderWidth: 1,
    borderColor: THEME.colors.line,
  },
  ghostButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: THEME.colors.bone,
  },
  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: THEME.colors.glow,
  },
  statusText: {
    fontSize: 13,
    color: THEME.colors.ash,
  },
  draftContainer: {
    backgroundColor: THEME.colors.surface,
    padding: 14,
    borderRadius: THEME.rounded.field,
    borderWidth: 1,
    borderColor: THEME.colors.line,
  },
  draftLabel: {
    ...THEME.typography.label,
    fontSize: 8.5,
    color: THEME.colors.ash,
    marginBottom: 6,
  },
  draftInput: {
    fontSize: 13.5,
    lineHeight: 20,
    color: THEME.colors.bone,
    backgroundColor: 'rgba(244, 238, 230, 0.04)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  draftActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: THEME.rounded.pill,
  },
  cancelButtonText: {
    color: THEME.colors.ash,
    fontSize: 13,
  },
  primaryButton: {
    backgroundColor: THEME.colors.glow,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: THEME.rounded.pill,
  },
  primaryButtonText: {
    color: THEME.colors.void,
    fontSize: 13,
    fontWeight: '600',
  },
});
