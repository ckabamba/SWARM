import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AccountSettingsModal from '../modals/AccountSettingsModal';
import { MobilePreferences } from '../../store/warmPathStore';
import { ProfileInfo } from '../../types/warmpath';
import { THEME } from '../../theme/tokens';

interface AccountSettingsControlProps {
  accountName: string;
  accountType: 'Student' | 'Alumni';
  profileInfo: ProfileInfo;
  preferences: MobilePreferences;
  onUpdatePreferences: (patch: Partial<MobilePreferences>) => void;
  onSaveProfileInfo: (profileInfo: ProfileInfo) => void;
}

export default function AccountSettingsControl({
  accountName,
  accountType,
  profileInfo,
  preferences,
  onUpdatePreferences,
  onSaveProfileInfo,
}: AccountSettingsControlProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setVisible(true);
        }}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel="Open account settings"
      >
        <Ionicons name="settings-outline" size={14} color={THEME.colors.ash} />
        <Text style={styles.buttonText}>ACCOUNT SETTINGS</Text>
      </TouchableOpacity>
      <AccountSettingsModal
        visible={visible}
        accountName={accountName}
        accountType={accountType}
        profileInfo={profileInfo}
        preferences={preferences}
        onUpdatePreferences={onUpdatePreferences}
        onSaveProfileInfo={onSaveProfileInfo}
        onClose={() => setVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-end',
    marginTop: -12,
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    borderRadius: THEME.rounded.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  buttonText: {
    ...THEME.typography.cap,
    fontSize: 8,
    color: THEME.colors.ash,
    letterSpacing: 0.9,
  },
});
