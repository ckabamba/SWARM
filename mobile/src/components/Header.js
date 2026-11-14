import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { THEME } from '../theme';

export default function Header({ currentRole, onSelectRole }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        {/* Wordmark */}
        <View style={styles.brandContainer}>
          <Text style={styles.wordmark}>WarmPath</Text>
          <Text style={styles.wordmarkSub}>ALUMNI PATH MAP</Text>
        </View>

        {/* Switch Pill */}
        <View style={styles.switchContainer}>
          <TouchableOpacity
            style={[
              styles.switchSegment,
              currentRole === 'student' && styles.switchSegmentActive,
            ]}
            onPress={() => onSelectRole('student')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.switchText,
                currentRole === 'student' && styles.switchTextActive,
              ]}
            >
              STUDENT
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.switchSegment,
              currentRole === 'alum' && styles.switchSegmentActive,
            ]}
            onPress={() => onSelectRole('alum')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.switchText,
                currentRole === 'alum' && styles.switchTextActive,
              ]}
            >
              ALUM REPLY
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: THEME.colors.void,
  },
  header: {
    paddingHorizontal: THEME.spacing.gutter,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: THEME.colors.void,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.line,
  },
  brandContainer: {
    flexDirection: 'column',
  },
  wordmark: {
    fontFamily: 'System',
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: -0.2,
    color: THEME.colors.bone,
  },
  wordmarkSub: {
    ...THEME.typography.label,
    fontSize: 9,
    letterSpacing: 1.2,
    color: THEME.colors.ash,
    marginTop: 1,
  },
  switchContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(244, 238, 230, 0.06)',
    borderRadius: THEME.rounded.pill,
    padding: 3,
    borderWidth: 1,
    borderColor: THEME.colors.line,
  },
  switchSegment: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.rounded.pill,
  },
  switchSegmentActive: {
    backgroundColor: THEME.colors.glow,
  },
  switchText: {
    ...THEME.typography.label,
    fontSize: 10,
    color: THEME.colors.ash,
  },
  switchTextActive: {
    color: THEME.colors.void,
    fontWeight: '600',
  },
});
