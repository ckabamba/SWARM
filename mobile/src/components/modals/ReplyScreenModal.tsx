import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ask } from '../../types/warmpath';
import { THEME } from '../../theme/tokens';

interface ReplyScreenModalProps {
  visible: boolean;
  ask: Ask | null;
  onAccept: (askId: number) => void;
  onClose: () => void;
}

export default function ReplyScreenModal({
  visible,
  ask,
  onAccept,
  onClose,
}: ReplyScreenModalProps) {
  if (!ask) return null;

  const isAccepted = ask.status === 'accepted';
  const firstName = ask.student_name.split(' ')[0] || 'Student';

  const handleAcceptPress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onAccept(ask.id);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.containerCard}>
          {/* Top Bar with Wordmark & Close Button */}
          <View style={styles.topBar}>
            <View style={styles.brandRow}>
              <View style={styles.glowDot} />
              <Text style={styles.wordmark}>WarmPath</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Context Badge */}
            <View style={styles.badgeRow}>
              <Text style={styles.capLabel}>ALUMNI REPLY VIEW</Text>
              <Text style={styles.alumNameTag}>PORTAL FOR {ask.alum_name.toUpperCase()}</Text>
            </View>

            {/* Headline */}
            <Text style={styles.headline}>
              {ask.student_name} would like 15 minutes of your time
            </Text>

            {/* Section: What You Share */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionCap}>WHAT YOU SHARE</Text>
              <Text style={styles.sharedTieText}>{ask.shared_tie}</Text>
            </View>

            {/* Section: Student Question */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionCap}>{firstName.toUpperCase()}'S QUESTION</Text>
              <View style={styles.messageBox}>
                <Text style={styles.messageText}>"{ask.message}"</Text>
              </View>
            </View>

            {/* 1-Tap Accept Button */}
            <TouchableOpacity
              style={[
                styles.acceptButton,
                isAccepted && styles.acceptButtonAccepted,
              ]}
              onPress={handleAcceptPress}
              disabled={isAccepted}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.acceptButtonText,
                  isAccepted && styles.acceptButtonTextAccepted,
                ]}
              >
                {isAccepted ? '✓ Call Accepted' : 'Accept a 15-minute call'}
              </Text>
            </TouchableOpacity>

            {isAccepted ? (
              <View style={styles.confirmationNote}>
                <Text style={styles.confirmText}>
                  Google Meet calendar invite confirmed for both devices.
                </Text>
              </View>
            ) : (
              <Text style={styles.privacyNote}>
                WarmPath logs completed calls to surface high-yield campus paths.
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(6, 4, 11, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  containerCard: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    backgroundColor: THEME.colors.panelSolid,
    borderRadius: THEME.rounded.card,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    overflow: 'hidden',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.line,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  glowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.glow,
  },
  wordmark: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.bone,
  },
  closeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  closeText: {
    ...THEME.typography.cap,
    fontSize: 9.5,
    color: THEME.colors.ash,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 30,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  capLabel: {
    ...THEME.typography.cap,
    fontSize: 9,
    color: THEME.colors.ash,
  },
  alumNameTag: {
    ...THEME.typography.cap,
    fontSize: 8.5,
    color: THEME.colors.glow,
  },
  headline: {
    ...THEME.typography.headline,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '300',
    color: THEME.colors.bone,
    marginBottom: 20,
  },
  sectionBlock: {
    marginBottom: 18,
  },
  sectionCap: {
    ...THEME.typography.cap,
    fontSize: 9,
    color: THEME.colors.ash,
    marginBottom: 6,
  },
  sharedTieText: {
    fontFamily: 'System',
    fontSize: 14,
    lineHeight: 20,
    color: THEME.colors.tie,
  },
  messageBox: {
    backgroundColor: 'rgba(244, 238, 230, 0.04)',
    padding: 14,
    borderRadius: THEME.rounded.message,
    borderWidth: 1,
    borderColor: THEME.colors.line,
  },
  messageText: {
    fontSize: 13.5,
    lineHeight: 20,
    color: THEME.colors.bone,
    fontStyle: 'italic',
  },
  acceptButton: {
    backgroundColor: THEME.colors.glow,
    paddingVertical: 16,
    borderRadius: THEME.rounded.pill,
    alignItems: 'center',
    marginTop: 10,
  },
  acceptButtonAccepted: {
    backgroundColor: 'rgba(255, 233, 168, 0.12)',
    borderWidth: 1,
    borderColor: THEME.colors.glow,
  },
  acceptButtonText: {
    fontFamily: 'System',
    fontSize: 14.5,
    fontWeight: '700',
    color: THEME.colors.void,
  },
  acceptButtonTextAccepted: {
    color: THEME.colors.glow,
  },
  confirmationNote: {
    marginTop: 12,
    alignItems: 'center',
  },
  confirmText: {
    ...THEME.typography.bodyAsh,
    fontSize: 12,
    textAlign: 'center',
    color: THEME.colors.glow,
  },
  privacyNote: {
    ...THEME.typography.bodyAsh,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
  },
});
