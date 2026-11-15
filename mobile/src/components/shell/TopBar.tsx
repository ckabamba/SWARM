import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEME } from '../../theme/tokens';

interface TopBarProps {
  onHomePress?: () => void;
  isAlumDemo?: boolean;
  onToggleDemo?: () => void;
}

export default function TopBar({
  onHomePress,
  isAlumDemo = false,
  onToggleDemo,
}: TopBarProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Left: Glowing WarmPath title and account actions */}
        <View style={styles.leftGroup}>
          <TouchableOpacity
            style={styles.brandRow}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (onHomePress) onHomePress();
            }}
            activeOpacity={0.8}
          >
            <View style={styles.glowDot} />
            <Text style={styles.brandTitle}>WarmPath</Text>
          </TouchableOpacity>

          {onToggleDemo && (
            <TouchableOpacity
              style={styles.demoBadge}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onToggleDemo();
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={isAlumDemo ? 'Switch to student demo' : 'Switch to alumni demo'}
            >
              <Ionicons name="swap-horizontal" size={11} color={THEME.colors.gold} />
              <Text style={styles.demoBadgeText}>
                {isAlumDemo ? 'STUDENT DEMO' : 'ALUM DEMO'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Right side left clear to avoid Expo Go floating settings button */}
        <View style={styles.rightSpacer} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: THEME.colors.void,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    height: 52,
    paddingHorizontal: THEME.spacing.gutter,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.line,
    backgroundColor: THEME.colors.void,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  glowDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: THEME.colors.glow,
  },
  brandTitle: {
    ...THEME.typography.title,
    fontSize: 17,
    fontWeight: '500',
    color: THEME.colors.bone,
    letterSpacing: -0.2,
  },
  demoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(234, 170, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(234, 170, 0, 0.35)',
    borderRadius: THEME.rounded.pill,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
  },
  demoBadgeText: {
    ...THEME.typography.cap,
    fontSize: 8.5,
    color: THEME.colors.gold,
    letterSpacing: 1,
    fontWeight: '700',
  },
  rightSpacer: {
    width: 44, // preserves clear area for Expo Go top-right menu
  },
});
