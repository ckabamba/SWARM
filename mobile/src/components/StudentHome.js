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

export default function StudentHome({ student, pathData, activeAsks, onSendAsk }) {
  const [goalText, setGoalText] = useState('SWE internship at NVIDIA');
  const [hasSentAsk, setHasSentAsk] = useState(false);

  const handleSendAsk = () => {
    onSendAsk({
      id: Date.now(),
      studentName: student.name,
      studentMajor: student.major,
      studentYear: student.title,
      alumId: pathData.topAlum.id,
      alumName: pathData.topAlum.name,
      sharedTie: pathData.topAlum.sharedTie,
      message: pathData.topAlum.draftMessage,
      status: 'pending',
      createdAt: 'Just now',
    });
    setHasSentAsk(true);
    Alert.alert(
      'Ask Sent!',
      `Your 15-minute call request has been dispatched to ${pathData.topAlum.name}. Check the Alumni device to see it appear!`
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{student.avatar}</Text>
        </View>
        <View style={styles.profileTextContainer}>
          <Text style={styles.profileName}>{student.name}</Text>
          <Text style={styles.profileSubtitle}>
            {student.title} • {student.major}
          </Text>
          <Text style={styles.profileSchool}>{student.school}</Text>
        </View>
      </View>

      {/* Goal Box */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeader}>Target Goal</Text>
        <Text style={styles.sectionSubtext}>
          WarmPath finds the exact campus steps alumni took to reach this:
        </Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={goalText}
            onChangeText={setGoalText}
            placeholder="e.g. SWE internship at NVIDIA"
            placeholderTextColor="#888"
          />
          <TouchableOpacity style={styles.goButton}>
            <Text style={styles.goButtonText}>Map</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.quickChips}>
          <TouchableOpacity
            style={styles.chip}
            onPress={() => setGoalText('SWE internship at NVIDIA')}
          >
            <Text style={styles.chipText}>SWE @ NVIDIA</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.chip}
            onPress={() => setGoalText('Robotics Research at IRIM')}
          >
            <Text style={styles.chipText}>Robotics Research</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Path Stops */}
      <View style={styles.sectionCard}>
        <View style={styles.pathHeaderRow}>
          <Text style={styles.sectionHeader}>Your Path to {pathData.goal.label}</Text>
          <Text style={styles.badgeCount}>
            {pathData.goal.achieversCount} Achievers
          </Text>
        </View>

        {pathData.stops.map((stop, index) => (
          <View
            key={stop.id}
            style={[
              styles.stopCard,
              stop.have && styles.stopCardHave,
              stop.next && styles.stopCardNext,
            ]}
          >
            <View style={styles.stopIndicator}>
              <View
                style={[
                  styles.stopDot,
                  stop.have && styles.stopDotHave,
                  stop.next && styles.stopDotNext,
                ]}
              >
                <Text style={styles.stopNumber}>{index + 1}</Text>
              </View>
              {index < pathData.stops.length - 1 && <View style={styles.stopLine} />}
            </View>

            <View style={styles.stopDetails}>
              <View style={styles.stopTitleRow}>
                <Text style={styles.stopName}>{stop.name}</Text>
                {stop.next && (
                  <View style={styles.flagNext}>
                    <Text style={styles.flagNextText}>NEXT BEST STEP</Text>
                  </View>
                )}
                {stop.have && (
                  <View style={styles.flagHave}>
                    <Text style={styles.flagHaveText}>COMPLETED</Text>
                  </View>
                )}
              </View>
              <Text style={styles.stopLift}>
                {stop.description} (Lift: {stop.lift}x)
              </Text>
              {stop.event && (
                <View style={styles.eventBox}>
                  <Text style={styles.eventTitle}>📅 {stop.event.title}</Text>
                  <Text style={styles.eventMeta}>
                    {stop.event.time} • {stop.event.location}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* Top Alum Card */}
      <View style={[styles.sectionCard, styles.alumCard]}>
        <View style={styles.alumHeader}>
          <Text style={styles.sectionHeader}>Closest Alumni Match</Text>
          <Text style={styles.matchBadge}>94% Match</Text>
        </View>
        <Text style={styles.alumName}>{pathData.topAlum.name}</Text>
        <Text style={styles.alumRole}>
          {pathData.topAlum.role} • GT '{pathData.topAlum.gradYear} ({pathData.topAlum.major})
        </Text>

        <View style={styles.sharedTieBox}>
          <Text style={styles.sharedTieTitle}>Shared Tie:</Text>
          <Text style={styles.sharedTieText}>{pathData.topAlum.sharedTie}</Text>
        </View>

        <View style={styles.draftBox}>
          <Text style={styles.draftTitle}>Drafted Ask (LLM Generated):</Text>
          <Text style={styles.draftText}>"{pathData.topAlum.draftMessage}"</Text>
        </View>

        <TouchableOpacity
          style={[styles.askButton, hasSentAsk && styles.askButtonDisabled]}
          onPress={handleSendAsk}
          disabled={hasSentAsk}
        >
          <Text style={styles.askButtonText}>
            {hasSentAsk ? '✓ Request Sent' : 'Send 15-Minute Ask'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#003057', // Tech Navy
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  avatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#B3A369', // Tech Gold
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 26,
  },
  profileTextContainer: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileSubtitle: {
    fontSize: 13,
    color: '#E5E7EB',
    marginTop: 2,
  },
  profileSchool: {
    fontSize: 12,
    color: '#B3A369',
    fontWeight: '600',
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  sectionSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  goButton: {
    marginLeft: 8,
    backgroundColor: '#B3A369',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  goButtonText: {
    fontWeight: '700',
    color: '#003057',
  },
  quickChips: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  chip: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  chipText: {
    fontSize: 12,
    color: '#1D4ED8',
    fontWeight: '600',
  },
  pathHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeCount: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  stopCard: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  stopCardHave: {
    opacity: 0.85,
  },
  stopCardNext: {
    backgroundColor: '#FEFCE8',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE047',
  },
  stopIndicator: {
    alignItems: 'center',
    width: 32,
    marginRight: 10,
  },
  stopDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#9CA3AF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopDotHave: {
    backgroundColor: '#10B981',
  },
  stopDotNext: {
    backgroundColor: '#B3A369',
  },
  stopNumber: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: 'bold',
  },
  stopLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 4,
    minHeight: 30,
  },
  stopDetails: {
    flex: 1,
  },
  stopTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stopName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  flagNext: {
    backgroundColor: '#B3A369',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  flagNextText: {
    fontSize: 9,
    color: '#003057',
    fontWeight: 'bold',
  },
  flagHave: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  flagHaveText: {
    fontSize: 9,
    color: '#065F46',
    fontWeight: 'bold',
  },
  stopLift: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 3,
  },
  eventBox: {
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 6,
    marginTop: 6,
  },
  eventTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  eventMeta: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  alumCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#003057',
  },
  alumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchBadge: {
    backgroundColor: '#DCFCE7',
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  alumName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 8,
  },
  alumRole: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 2,
  },
  sharedTieBox: {
    backgroundColor: '#F8FAFC',
    borderLeftWidth: 3,
    borderLeftColor: '#B3A369',
    padding: 10,
    borderRadius: 4,
    marginTop: 10,
  },
  sharedTieTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  sharedTieText: {
    fontSize: 12,
    color: '#1E293B',
    lineHeight: 16,
  },
  draftBox: {
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
  },
  draftTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 2,
  },
  draftText: {
    fontSize: 12,
    color: '#374151',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  askButton: {
    backgroundColor: '#003057',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  askButtonDisabled: {
    backgroundColor: '#10B981',
  },
  askButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
