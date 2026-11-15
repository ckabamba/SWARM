import React from 'react';
import { createThemedStyles } from '../../theme/themedStyles';
import { StyleSheet, Text, View, Switch } from 'react-native';
import * as Haptics from 'expo-haptics';
import { MobilePreferences as PrefsType } from '../../store/warmPathStore';
import { THEME } from '../../theme/tokens';

interface MobilePreferencesProps {
  preferences: PrefsType;
  onUpdatePreferences: (patch: Partial<PrefsType>) => void;
}

export default function MobilePreferences({
  preferences,
  onUpdatePreferences,
}: MobilePreferencesProps) {
  const handleToggle = (key: keyof PrefsType, val: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdatePreferences({ [key]: val });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.capLabel}>MOBILE PREFERENCES</Text>

      {/* Low Battery Thermal Mode */}
      <View style={styles.prefRow}>
        <View style={styles.prefTextCol}>
          <Text style={styles.prefTitle}>Low-Battery Thermal Mode</Text>
          <Text style={styles.prefSub}>
            Pauses background particle dust and idle canvas loops
          </Text>
        </View>
        <Switch
          value={preferences.lowBatteryMode}
          onValueChange={(val) => handleToggle('lowBatteryMode', val)}
          trackColor={{ false: 'rgba(143, 135, 152, 0.3)', true: THEME.colors.gold }}
          thumbColor={preferences.lowBatteryMode ? THEME.colors.glow : THEME.colors.bone}
        />
      </View>

      {/* Weekly Event Reminders */}
      <View style={[styles.prefRow, styles.noBorder]}>
        <View style={styles.prefTextCol}>
          <Text style={styles.prefTitle}>Weekly Event Reminders</Text>
          <Text style={styles.prefSub}>
            Notifies when an info session or training night is on your path
          </Text>
        </View>
        <Switch
          value={preferences.weeklyReminders}
          onValueChange={(val) => handleToggle('weeklyReminders', val)}
          trackColor={{ false: 'rgba(143, 135, 152, 0.3)', true: THEME.colors.gold }}
          thumbColor={preferences.weeklyReminders ? THEME.colors.glow : THEME.colors.bone}
        />
      </View>
    </View>
  );
}

const styles = createThemedStyles(StyleSheet.create({
  container: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.line,
    marginBottom: 40,
  },
  capLabel: {
    ...THEME.typography.cap,
    fontSize: 9.5,
    color: THEME.colors.ash,
    marginBottom: 14,
  },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(244, 238, 230, 0.08)',
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  prefTextCol: {
    flex: 1,
    paddingRight: 16,
  },
  prefTitle: {
    ...THEME.typography.title,
    fontSize: 14,
    color: THEME.colors.bone,
  },
  prefSub: {
    ...THEME.typography.bodyAsh,
    fontSize: 12,
    marginTop: 2,
  },
}));
