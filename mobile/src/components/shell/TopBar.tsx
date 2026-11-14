import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import * as Haptics from 'expo-haptics';
import { THEME } from '../../theme/tokens';

interface TopBarProps {
  currentTab: 'home' | 'map';
  onSelectTab: (tab: 'home' | 'map') => void;
  onHomePress?: () => void;
}

export default function TopBar({
  currentTab,
  onSelectTab,
  onHomePress,
}: TopBarProps) {
  const handleTabPress = (tab: 'home' | 'map') => {
    if (tab !== currentTab) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSelectTab(tab);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Left: Glowing WarmPath title */}
        <TouchableOpacity
          style={styles.brandRow}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (onHomePress) onHomePress();
            else onSelectTab('home');
          }}
          activeOpacity={0.8}
        >
          <View style={styles.glowDot} />
          <Text style={styles.brandTitle}>WarmPath</Text>
        </TouchableOpacity>

        {/* Right: [ Home | Map ] Segmented Pill */}
        <View style={styles.switchPill}>
          <TouchableOpacity
            style={[
              styles.switchSegment,
              currentTab === 'home' && styles.switchSegmentActive,
            ]}
            onPress={() => handleTabPress('home')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.switchText,
                currentTab === 'home' && styles.switchTextActive,
              ]}
            >
              HOME
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.switchSegment,
              currentTab === 'map' && styles.switchSegmentActive,
            ]}
            onPress={() => handleTabPress('map')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.switchText,
                currentTab === 'map' && styles.switchTextActive,
              ]}
            >
              MAP
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
  switchPill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(9, 6, 15, 0.6)',
    borderRadius: THEME.rounded.pill,
    padding: 3,
    borderWidth: 1,
    borderColor: THEME.colors.line,
  },
  switchSegment: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: THEME.rounded.pill,
  },
  switchSegmentActive: {
    backgroundColor: THEME.colors.glow,
  },
  switchText: {
    ...THEME.typography.cap,
    fontSize: 10,
    color: THEME.colors.ash,
    letterSpacing: 1.4,
  },
  switchTextActive: {
    color: THEME.colors.void,
    fontWeight: '700',
  },
});
