import React from 'react';
import { createThemedStyles } from '../../theme/themedStyles';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MobilePreferences from '../home/MobilePreferences';
import { MobilePreferences as Preferences } from '../../store/warmPathStore';
import { ProfileInfo } from '../../types/warmpath';
import { THEME } from '../../theme/tokens';

interface AccountSettingsModalProps {
  visible: boolean;
  accountName: string;
  accountType: 'Student' | 'Alumni';
  profileInfo: ProfileInfo;
  preferences: Preferences;
  onUpdatePreferences: (patch: Partial<Preferences>) => void;
  onSaveProfileInfo: (profileInfo: ProfileInfo) => void;
  onClose: () => void;
}

export default function AccountSettingsModal({
  visible,
  accountName,
  accountType,
  profileInfo,
  preferences,
  onUpdatePreferences,
  onSaveProfileInfo,
  onClose,
}: AccountSettingsModalProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(profileInfo);

  React.useEffect(() => {
    if (visible) {
      setEditing(false);
      setDraft(profileInfo);
    }
  }, [profileInfo, visible]);

  const updateDraft = (field: keyof ProfileInfo, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const saveProfile = () => {
    if (!draft.name.trim() || !draft.headline.trim()) return;
    onSaveProfileInfo({
      name: draft.name.trim(),
      headline: draft.headline.trim(),
      location: draft.location.trim(),
      about: draft.about.trim(),
    });
    setEditing(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>ACCOUNT SETTINGS</Text>
              <Text style={styles.subtitle}>Profile and preferences</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close account settings"
            >
              <Ionicons name="close" size={23} color={THEME.colors.ash} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <View style={styles.accountCard}>
              <View style={styles.accountIcon}>
                <Ionicons
                  name={accountType === 'Alumni' ? 'briefcase-outline' : 'school-outline'}
                  size={19}
                  color={THEME.colors.glow}
                />
              </View>
              <View style={styles.accountDetails}>
                <Text style={styles.accountName}>{accountName}</Text>
                <Text style={styles.accountType}>{accountType}</Text>
              </View>
            </View>

            <View style={styles.appearanceRow}>
              <View style={styles.appearanceDetails}>
                <Text style={styles.appearanceTitle}>Appearance</Text>
                <Text style={styles.appearanceSubtitle}>
                  {preferences.themeMode === 'dark' ? 'Dark' : 'Light'} theme
                </Text>
              </View>
              <Switch
                value={preferences.themeMode === 'light'}
                onValueChange={(enabled) => onUpdatePreferences({
                  themeMode: enabled ? 'light' : 'dark',
                })}
                trackColor={{ false: 'rgba(143, 135, 152, 0.3)', true: THEME.colors.gold }}
                thumbColor={preferences.themeMode === 'light' ? THEME.colors.glow : THEME.colors.bone}
                accessibilityLabel="Use light appearance"
              />
            </View>

            <TouchableOpacity
              style={styles.editButton}
              onPress={() => {
                setDraft(profileInfo);
                setEditing((current) => !current);
              }}
              activeOpacity={0.75}
              accessibilityRole="button"
            >
              <Ionicons name="create-outline" size={16} color={THEME.colors.glow} />
              <Text style={styles.editButtonText}>
                {editing ? 'CANCEL EDITING' : 'EDIT INFORMATION'}
              </Text>
            </TouchableOpacity>

            {editing && (
              <View style={styles.editForm}>
                <Text style={styles.fieldLabel}>NAME</Text>
                <TextInput
                  style={styles.input}
                  value={draft.name}
                  onChangeText={(value) => updateDraft('name', value)}
                  placeholder="Name"
                  placeholderTextColor={THEME.colors.ash}
                />
                <Text style={styles.fieldLabel}>ROLE OR FIELD OF STUDY</Text>
                <TextInput
                  style={styles.input}
                  value={draft.headline}
                  onChangeText={(value) => updateDraft('headline', value)}
                  placeholder="Role or field of study"
                  placeholderTextColor={THEME.colors.ash}
                />
                <Text style={styles.fieldLabel}>LOCATION OR SCHOOL</Text>
                <TextInput
                  style={styles.input}
                  value={draft.location}
                  onChangeText={(value) => updateDraft('location', value)}
                  placeholder="Location or school"
                  placeholderTextColor={THEME.colors.ash}
                />
                <Text style={styles.fieldLabel}>ABOUT</Text>
                <TextInput
                  style={[styles.input, styles.aboutInput]}
                  value={draft.about}
                  onChangeText={(value) => updateDraft('about', value)}
                  placeholder="A short introduction"
                  placeholderTextColor={THEME.colors.ash}
                  multiline
                  maxLength={300}
                />
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    (!draft.name.trim() || !draft.headline.trim()) && styles.saveButtonDisabled,
                  ]}
                  onPress={saveProfile}
                  disabled={!draft.name.trim() || !draft.headline.trim()}
                  activeOpacity={0.8}
                >
                  <Text style={styles.saveButtonText}>SAVE INFORMATION</Text>
                </TouchableOpacity>
              </View>
            )}

            <MobilePreferences
              preferences={preferences}
              onUpdatePreferences={onUpdatePreferences}
            />
          </ScrollView>

          <TouchableOpacity
            style={styles.doneButton}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.doneButtonText}>DONE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = createThemedStyles(StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.74)',
  },
  modal: {
    maxHeight: '82%',
    borderRadius: THEME.rounded.card,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    backgroundColor: THEME.colors.panelSolid,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 18 : 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.line,
  },
  title: {
    ...THEME.typography.cap,
    color: THEME.colors.glow,
    fontSize: 10,
  },
  subtitle: {
    ...THEME.typography.bodyAsh,
    fontSize: 12,
    marginTop: 3,
  },
  content: {
    paddingTop: 14,
    paddingBottom: 8,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    borderRadius: THEME.rounded.field,
    backgroundColor: THEME.colors.surface,
    padding: 12,
  },
  accountIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(234, 170, 0, 0.14)',
  },
  accountDetails: {
    flex: 1,
  },
  accountName: {
    ...THEME.typography.title,
    fontSize: 14,
  },
  accountType: {
    ...THEME.typography.bodyAsh,
    fontSize: 11,
    marginTop: 2,
  },
  appearanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.line,
  },
  appearanceDetails: {
    flex: 1,
    paddingRight: 12,
  },
  appearanceTitle: {
    ...THEME.typography.title,
    fontSize: 14,
  },
  appearanceSubtitle: {
    ...THEME.typography.bodyAsh,
    fontSize: 11,
    marginTop: 2,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.line,
  },
  editButtonText: {
    ...THEME.typography.cap,
    color: THEME.colors.glow,
    fontSize: 9,
  },
  editForm: {
    paddingTop: 12,
    gap: 7,
  },
  fieldLabel: {
    ...THEME.typography.cap,
    color: THEME.colors.ash,
    fontSize: 8,
    marginTop: 4,
  },
  input: {
    minHeight: 40,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    borderRadius: THEME.rounded.field,
    backgroundColor: THEME.colors.surface,
    color: THEME.colors.bone,
    paddingHorizontal: 11,
    paddingVertical: 8,
    fontSize: 13,
  },
  aboutInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  saveButton: {
    alignItems: 'center',
    borderRadius: THEME.rounded.pill,
    backgroundColor: THEME.colors.glow,
    paddingVertical: 10,
    marginTop: 6,
  },
  saveButtonDisabled: {
    opacity: 0.45,
  },
  saveButtonText: {
    color: THEME.colors.void,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.9,
  },
  doneButton: {
    alignItems: 'center',
    borderRadius: THEME.rounded.pill,
    backgroundColor: THEME.colors.glow,
    paddingVertical: 11,
    marginTop: 10,
  },
  doneButtonText: {
    color: THEME.colors.void,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
}));
