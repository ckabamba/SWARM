import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { THEME } from '../theme';

export default function AlumHome({ alum, activeAsks, onAcceptAsk }) {
  // Use the first active ask, or a placeholder ask if none
  const currentAsk = activeAsks[0] || {
    id: 991,
    studentName: 'George P. Burdell',
    studentMajor: 'CompE',
    studentYear: '2nd Year Undergraduate · CompE',
    sharedTie: 'You are both CompE and both joined VIP: Embedded Vision in second year',
    message:
      'Hi Elena, I am a second-year CompE student at Georgia Tech looking into SWE roles at NVIDIA. I saw you were on the VIP: Embedded Vision team—would you be open to a 15-minute call on how that shaped your preparation?',
    status: 'pending',
  };

  const isAccepted = currentAsk.status === 'accepted';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.replyColumn}>
        {/* Alum Profile Context */}
        <View style={styles.alumContextBar}>
          <Text style={styles.alumGreeting}>ALUMNI PORTAL · {alum.name.toUpperCase()}</Text>
          <Text style={styles.alumMeta}>
            {alum.company} · GT '{alum.gradYear} ({alum.major})
          </Text>
        </View>

        {/* Display Headline */}
        <Text style={styles.headline}>
          {currentAsk.studentName} is asking for a 15-minute call
        </Text>
        <Text style={styles.studentSub}>
          {currentAsk.studentYear}
        </Text>

        {/* Shared Tie Section */}
        <View style={styles.sectionBlock}>
          <Text style={styles.captionLabel}>WHY WARMPath MATCHED YOU</Text>
          <Text style={styles.sharedTieText}>{currentAsk.sharedTie}</Text>
        </View>

        {/* Student Message Box */}
        <View style={styles.sectionBlock}>
          <Text style={styles.captionLabel}>MESSAGE</Text>
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>"{currentAsk.message}"</Text>
          </View>
        </View>

        {/* Accept Button: Exact DESIGN.md spec */}
        <TouchableOpacity
          style={[
            styles.acceptButton,
            isAccepted && styles.acceptButtonAccepted,
          ]}
          onPress={() => onAcceptAsk(currentAsk.id)}
          disabled={isAccepted}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.acceptButtonText,
              isAccepted && styles.acceptButtonTextAccepted,
            ]}
          >
            {isAccepted ? '✓ Call Accepted' : 'Accept 15-minute call'}
          </Text>
        </TouchableOpacity>

        {isAccepted && (
          <View style={styles.confirmationRow}>
            <Text style={styles.confirmationText}>
              A Google Meet calendar invite was dispatched to {currentAsk.studentName}.
            </Text>
          </View>
        )}
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
    paddingTop: 24,
    paddingBottom: 48,
    alignItems: 'center',
  },
  replyColumn: {
    width: '100%',
    maxWidth: 400,
  },
  alumContextBar: {
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.line,
  },
  alumGreeting: {
    ...THEME.typography.label,
    fontSize: 9.5,
    color: THEME.colors.ash,
  },
  alumMeta: {
    ...THEME.typography.bodyAsh,
    fontSize: 12,
    marginTop: 2,
  },
  headline: {
    fontFamily: 'System',
    fontSize: 24,
    fontWeight: '300',
    lineHeight: 30,
    letterSpacing: -0.5,
    color: THEME.colors.bone,
    marginBottom: 4,
  },
  studentSub: {
    ...THEME.typography.bodyAsh,
    fontSize: 13,
    marginBottom: 28,
  },
  sectionBlock: {
    marginBottom: 24,
  },
  captionLabel: {
    ...THEME.typography.label,
    fontSize: 9.5,
    color: THEME.colors.ash,
    marginBottom: 8,
  },
  sharedTieText: {
    fontFamily: 'System',
    fontSize: 14.5,
    lineHeight: 21,
    color: THEME.colors.tie,
  },
  messageBox: {
    backgroundColor: 'rgba(244, 238, 230, 0.04)',
    padding: 16,
    borderRadius: THEME.rounded.message,
    borderWidth: 1,
    borderColor: THEME.colors.line,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 21,
    color: THEME.colors.bone,
    fontStyle: 'italic',
  },
  acceptButton: {
    backgroundColor: THEME.colors.glow,
    paddingVertical: 18,
    borderRadius: THEME.rounded.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  acceptButtonAccepted: {
    backgroundColor: 'rgba(255, 233, 168, 0.12)',
    borderWidth: 1,
    borderColor: THEME.colors.glow,
  },
  acceptButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.colors.void,
  },
  acceptButtonTextAccepted: {
    color: THEME.colors.glow,
  },
  confirmationRow: {
    marginTop: 14,
    alignItems: 'center',
  },
  confirmationText: {
    ...THEME.typography.bodyAsh,
    fontSize: 12,
    textAlign: 'center',
  },
});
