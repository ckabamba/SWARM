import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme/tokens';
import { useAccount } from '../store/AccountContext';

export default function AuthGateScreen({ onEnterDemo }: { onEnterDemo: () => void }) {
  const { loading, error, signIn, register, clearError } = useAccount();
  const [registerMode, setRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async () => {
    clearError();
    try {
      if (registerMode) await register(name.trim(), email.trim(), password);
      else await signIn(email.trim(), password);
    } catch { /* The service error is rendered below. */ }
  };

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.panel}>
          <View style={styles.brandLine}><View style={styles.goldDot} /><Text style={styles.brand}>WarmPath</Text></View>
          <Text style={styles.eyebrow}>CAMPUS PATHS · COMMUNITY · DISCOVERY</Text>
          <Text style={styles.title}>Sign in to continue</Text>
          <Text style={styles.intro}>Sign in or create an account to open WarmPath. For a demo, enter with fictional student data.</Text>
          {registerMode ? <Field label="Name" value={name} onChangeText={setName} autoCapitalize="words" /> : null}
          <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
          {registerMode ? <Text style={styles.note}>Use at least 12 characters. This local account service does not verify Georgia Tech membership or offer password recovery yet.</Text> : null}
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          {loading ? <Text style={styles.note}>Checking account session…</Text> : null}
          <TouchableOpacity style={[styles.primaryButton, (loading || !email.trim() || !password || (registerMode && !name.trim())) && styles.disabled]} disabled={loading || !email.trim() || !password || (registerMode && !name.trim())} onPress={() => void submit()} accessibilityRole="button">
            {loading ? <ActivityIndicator color={THEME.colors.void} /> : <Text style={styles.primaryText}>{registerMode ? 'Create account and continue' : 'Sign in and continue'}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.textButton} onPress={() => { setRegisterMode((value) => !value); clearError(); }} accessibilityRole="button">
            <Text style={styles.textButtonLabel}>{registerMode ? 'Already have an account? Sign in' : 'New to WarmPath? Create an account'}</Text>
          </TouchableOpacity>
          <View style={styles.divider}><View style={styles.rule} /><Text style={styles.or}>OR</Text><View style={styles.rule} /></View>
          <TouchableOpacity style={styles.demoButton} onPress={onEnterDemo} accessibilityRole="button" accessibilityLabel="Enter demo mode with fictional demo data">
            <Ionicons name="flask-outline" size={16} color={THEME.colors.glow} />
            <Text style={styles.demoButtonText}>Demo</Text>
          </TouchableOpacity>
          <Text style={styles.demoNote}>DEMO MODE · Fictional student profiles, posts, clubs, and events. Demo changes stay on this device session and are not sent to WarmPath.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...input } = props;
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...input} style={styles.input} placeholderTextColor={THEME.colors.ash} autoCorrect={false} returnKeyType="next" /></View>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 18 },
  panel: { width: '100%', maxWidth: 470, gap: 12, padding: 21, borderWidth: 1, borderColor: THEME.colors.line, borderRadius: THEME.rounded.card, backgroundColor: THEME.colors.panelSolid },
  brandLine: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  goldDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: THEME.colors.gold },
  brand: { ...THEME.typography.title, color: THEME.colors.bone },
  eyebrow: { ...THEME.typography.cap, color: THEME.colors.gold, fontSize: 8.5, letterSpacing: 1.2, marginTop: 8 },
  title: { ...THEME.typography.display, color: THEME.colors.bone, fontSize: 26, lineHeight: 32 },
  intro: { ...THEME.typography.bodyAsh, marginBottom: 3 },
  field: { gap: 6 },
  label: { ...THEME.typography.cap, color: THEME.colors.ash, fontSize: 9, letterSpacing: 1.1 },
  input: { minHeight: 44, borderRadius: THEME.rounded.field, borderWidth: 1, borderColor: THEME.colors.line, backgroundColor: THEME.colors.surface, color: THEME.colors.bone, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 },
  note: { ...THEME.typography.bodyAsh, fontSize: 10.5, lineHeight: 15 },
  error: { color: '#ff9b83', fontSize: 12, lineHeight: 17 },
  primaryButton: { minHeight: 46, borderRadius: THEME.rounded.pill, backgroundColor: THEME.colors.gold, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  primaryText: { color: THEME.colors.void, fontSize: 13, fontWeight: '700' },
  disabled: { opacity: 0.45 },
  textButton: { alignItems: 'center', padding: 5 },
  textButtonLabel: { color: THEME.colors.glow, fontSize: 12 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 9, marginVertical: 1 },
  rule: { flex: 1, height: 1, backgroundColor: THEME.colors.line },
  or: { ...THEME.typography.cap, fontSize: 8, color: THEME.colors.ash },
  demoButton: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: THEME.rounded.pill, borderWidth: 1, borderColor: THEME.colors.gold, backgroundColor: 'rgba(234,170,0,0.09)' },
  demoButtonText: { color: THEME.colors.glow, fontSize: 13, fontWeight: '700' },
  demoNote: { color: THEME.colors.ash, fontSize: 10, lineHeight: 15, textAlign: 'center' },
});
