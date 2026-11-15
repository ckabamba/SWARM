import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Student } from '../../types/warmpath';
import { THEME } from '../../theme/tokens';

interface StudentHeaderProps {
  student: Student;
  onEditPress: () => void;
}

export default function StudentHeader({ student, onEditPress }: StudentHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.leftRow}>
        {/* Initials Ring */}
        <View style={styles.initialsRing}>
          <Text style={styles.initialsText}>{student.initials}</Text>
        </View>

        {/* Identity Details */}
        <View style={styles.detailsCol}>
          <Text style={styles.nameText}>{student.name}</Text>
          <Text style={styles.metaText}>
            {student.major} · {student.yearLabel} · {student.school}
          </Text>
        </View>
      </View>

      {/* Edit Trigger */}
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onEditPress();
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.editText}>SWITCH</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.line,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  initialsRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: THEME.colors.gold,
    backgroundColor: 'rgba(234, 170, 0, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontFamily: 'System',
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.glow,
    letterSpacing: 0.5,
  },
  detailsCol: {
    flex: 1,
  },
  nameText: {
    ...THEME.typography.headline,
    fontSize: 18,
    color: THEME.colors.bone,
  },
  metaText: {
    ...THEME.typography.bodyAsh,
    fontSize: 12.5,
    marginTop: 2,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.rounded.pill,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    backgroundColor: THEME.colors.surface,
  },
  editText: {
    ...THEME.typography.cap,
    fontSize: 9.5,
    color: THEME.colors.bone,
    letterSpacing: 1.2,
  },
});
