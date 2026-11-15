import React from 'react';
import { createThemedStyles } from '../theme/themedStyles';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme/tokens';

// Placeholder for the geographic maps (campus activities and alumni cities).
// The map views themselves are not built yet.
export default function GeoMapsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="map" size={20} color={THEME.colors.gold} />
          <Text style={styles.headerTitle}>MAPS</Text>
        </View>
        <Text style={styles.subtitle}>
          Campus activities by location and the cities where alumni are based
        </Text>
      </View>

      <View style={styles.emptyCard}>
        <Ionicons name="map-outline" size={28} color={THEME.colors.ash} />
        <Text style={styles.emptyTitle}>Maps are not available yet</Text>
        <Text style={styles.emptyBody}>
          The campus map and the alumni-city map will appear here.
        </Text>
      </View>
    </View>
  );
}

const styles = createThemedStyles(StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: THEME.spacing.gutter,
    paddingTop: 16,
  },
  header: {
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  headerTitle: {
    ...THEME.typography.cap,
    fontSize: 13,
    letterSpacing: 2,
    color: THEME.colors.glow,
  },
  subtitle: {
    ...THEME.typography.bodyAsh,
    fontSize: 13,
  },
  emptyCard: {
    alignItems: 'center',
    gap: 8,
    padding: 24,
    borderRadius: THEME.rounded.card,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    backgroundColor: THEME.colors.surface,
  },
  emptyTitle: {
    ...THEME.typography.title,
  },
  emptyBody: {
    ...THEME.typography.bodyAsh,
    textAlign: 'center',
  },
}));
