import React from 'react';
import { createThemedStyles } from '../../theme/themedStyles';
import { StyleSheet, Text, View, Modal, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Student } from '../../types/warmpath';
import { THEME } from '../../theme/tokens';

interface EditStudentModalProps {
  visible: boolean;
  students: Student[];
  currentStudentId: number;
  onSelectStudent: (id: number) => void;
  onClose: () => void;
}

export default function EditStudentModal({
  visible,
  students,
  currentStudentId,
  onSelectStudent,
  onClose,
}: EditStudentModalProps) {
  const handleSelect = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelectStudent(id);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>SWITCH ACTIVE STUDENT</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtext}>
            Switch profile to view how checkpoints, "next for you", and closest alumni re-rank based on starting background:
          </Text>

          {students.map((st) => {
            const isSelected = st.id === currentStudentId;

            return (
              <TouchableOpacity
                key={st.id}
                style={[styles.studentItem, isSelected && styles.studentItemActive]}
                onPress={() => handleSelect(st.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.avatar, isSelected && styles.avatarActive]}>
                  <Text style={[styles.avatarText, isSelected && styles.avatarTextActive]}>
                    {st.initials}
                  </Text>
                </View>

                <View style={styles.infoCol}>
                  <Text style={styles.name}>{st.name}</Text>
                  <Text style={styles.meta}>
                    {st.major} · {st.yearLabel} · {st.school}
                  </Text>
                </View>

                {isSelected && <Text style={styles.check}>✓ ACTIVE</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = createThemedStyles(StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(6, 4, 11, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: THEME.colors.panelSolid,
    borderRadius: THEME.rounded.card,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    ...THEME.typography.cap,
    fontSize: 10,
    color: THEME.colors.ash,
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    color: THEME.colors.ash,
    fontSize: 14,
  },
  subtext: {
    ...THEME.typography.bodyAsh,
    fontSize: 12.5,
    marginBottom: 16,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: THEME.rounded.field,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    marginBottom: 10,
    backgroundColor: THEME.colors.surface,
  },
  studentItemActive: {
    borderColor: THEME.colors.glow,
    backgroundColor: 'rgba(255, 233, 168, 0.08)',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: THEME.colors.ash,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarActive: {
    borderColor: THEME.colors.glow,
    backgroundColor: THEME.colors.gold,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.bone,
  },
  avatarTextActive: {
    color: THEME.colors.void,
  },
  infoCol: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.colors.bone,
  },
  meta: {
    fontSize: 12,
    color: THEME.colors.ash,
    marginTop: 1,
  },
  check: {
    ...THEME.typography.cap,
    fontSize: 8.5,
    color: THEME.colors.glow,
    fontWeight: '700',
  },
}));
