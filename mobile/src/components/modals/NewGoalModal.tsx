import React, { useState } from 'react';
import { createThemedStyles } from '../../theme/themedStyles';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { THEME } from '../../theme/tokens';

const SUGGESTED_GOALS = [
  'SWE internship at NVIDIA',
  'Robotics Research at IRIM',
  'Autonomous Flight Systems Lead',
  'SWE Intern at Stripe',
];

interface NewGoalModalProps {
  visible: boolean;
  currentGoalLabel: string;
  onSelectGoal: (label: string) => void;
  onClose: () => void;
}

export default function NewGoalModal({
  visible,
  currentGoalLabel,
  onSelectGoal,
  onClose,
}: NewGoalModalProps) {
  const [inputText, setInputText] = useState(currentGoalLabel);

  const handleSubmit = (label: string) => {
    if (label.trim().length > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onSelectGoal(label.trim());
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>TARGET CAREER GOAL</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtext}>
            Type a role or company; WarmPath maps the campus routes GT alumni took to land it:
          </Text>

          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="e.g. SWE internship at NVIDIA"
            placeholderTextColor={THEME.colors.ash}
            selectionColor={THEME.colors.ember}
            autoFocus
          />

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={() => handleSubmit(inputText)}
            activeOpacity={0.8}
          >
            <Text style={styles.submitBtnText}>Map This Goal →</Text>
          </TouchableOpacity>

          <Text style={styles.suggestCap}>SEEDED DEMO GOALS</Text>
          <View style={styles.chipsWrap}>
            {SUGGESTED_GOALS.map((suggestion) => (
              <TouchableOpacity
                key={suggestion}
                style={styles.chip}
                onPress={() => {
                  setInputText(suggestion);
                  handleSubmit(suggestion);
                }}
              >
                <Text style={styles.chipArrow}>→</Text>
                <Text style={styles.chipText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = createThemedStyles(StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(6, 4, 11, 0.8)',
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
    marginBottom: 14,
  },
  input: {
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    borderRadius: THEME.rounded.field,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: THEME.colors.bone,
    marginBottom: 14,
  },
  submitBtn: {
    backgroundColor: THEME.colors.glow,
    paddingVertical: 11,
    borderRadius: THEME.rounded.pill,
    alignItems: 'center',
    marginBottom: 20,
  },
  submitBtnText: {
    fontFamily: 'System',
    fontSize: 13.5,
    fontWeight: '700',
    color: THEME.colors.void,
  },
  suggestCap: {
    ...THEME.typography.cap,
    fontSize: 8.5,
    color: THEME.colors.ash,
    marginBottom: 8,
  },
  chipsWrap: {
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  chipArrow: {
    color: THEME.colors.ember,
    fontSize: 13,
    fontWeight: '700',
  },
  chipText: {
    fontSize: 13,
    color: THEME.colors.bone,
  },
}));
