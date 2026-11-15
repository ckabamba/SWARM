import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createThemedStyles } from '../theme/themedStyles';
import { useAccount } from '../store/AccountContext';
import { THEME } from '../theme/tokens';

export default function ProfileScreen({ demoMode = false, onExitDemo }: { demoMode?: boolean; onExitDemo?: () => void }) {
  const { account, loading, error, signOut } = useAccount();

  if (demoMode) return <DemoProfile onExitDemo={onExitDemo} />;
  // Signed-out users are held at AuthGateScreen by App.tsx.
  if (!account) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>WARMPATH ACCOUNT</Text>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Your WarmPath account details and profile visibility.</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.identityRow}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{account.profile.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</Text></View>
          <View style={styles.identity}>
            <Text style={styles.name}>{account.profile.name}</Text>
            <Text style={styles.body}>{account.profile.kind === 'student' ? 'Student' : 'Alumni'}{account.profile.major ? ` · ${account.profile.major}` : ''}</Text>
          </View>
        </View>
        <View style={styles.rule} />
        <Text style={styles.label}>ACCOUNT EMAIL</Text>
        <Text style={styles.body}>{account.email}</Text>
        <Text style={[styles.label, styles.topSpace]}>PROFILE VISIBILITY</Text>
        <Text style={styles.body}>{account.profile.profile_visible ? 'Public profile' : 'Private profile'}</Text>
        <Text style={styles.note}>This is the profile setting returned by WarmPath. Profile editing and visibility controls remain on the web profile page.</Text>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.secondaryButton} disabled={loading} onPress={() => void signOut().catch(() => {})} accessibilityRole="button">
          <Text style={styles.secondaryButtonText}>{loading ? 'Please wait…' : 'Sign out'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.footer}><Ionicons name="shield-checkmark-outline" size={16} color={THEME.colors.gold} /><Text style={styles.note}>WarmPath account data uses the existing service. Sign-in does not verify campus affiliation.</Text></View>
    </ScrollView>
  );
}

function DemoProfile({ onExitDemo }: { onExitDemo?: () => void }) {
  return <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    <View style={styles.header}><Text style={styles.eyebrow}>DEMO PROFILE</Text><Text style={styles.title}>Student profile</Text><Text style={styles.subtitle}>A fictional profile for previewing the app. This is not an account.</Text></View>
    <View style={styles.card}>
      <View style={styles.identityRow}><View style={styles.avatar}><Text style={styles.avatarText}>JL</Text></View><View style={styles.identity}><Text style={styles.name}>Jordan Lee</Text><Text style={styles.body}>Student · Computer Engineering · Class of 2028</Text></View></View>
      <View style={styles.rule} />
      <Text style={styles.label}>DEMO DATA</Text>
      <Text style={styles.note}>The profile, feed, clubs, and events in Demo mode are fictional fixtures. They are local to this app session and are never published to the WarmPath account service.</Text>
      <TouchableOpacity style={styles.secondaryButton} onPress={onExitDemo} accessibilityRole="button"><Text style={styles.secondaryButtonText}>Exit demo and sign in</Text></TouchableOpacity>
    </View>
  </ScrollView>;
}

const styles = createThemedStyles(StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: THEME.spacing.gutter, paddingBottom: 32, gap: 14 },
  header: { gap: 5, marginBottom: 4 },
  eyebrow: { ...THEME.typography.cap, color: THEME.colors.gold },
  title: { ...THEME.typography.display, color: THEME.colors.bone },
  subtitle: { ...THEME.typography.bodyAsh },
  card: { backgroundColor: THEME.colors.panelSolid, borderWidth: 1, borderColor: THEME.colors.line, borderRadius: THEME.rounded.card, padding: 18, gap: 12 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(234,170,0,0.18)', borderWidth: 1, borderColor: THEME.colors.gold, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: THEME.colors.glow, fontWeight: '700' },
  identity: { flex: 1, gap: 3 },
  name: { ...THEME.typography.title, color: THEME.colors.bone },
  body: { ...THEME.typography.body, color: THEME.colors.bone },
  rule: { height: 1, backgroundColor: THEME.colors.line, marginVertical: 2 },
  label: { ...THEME.typography.cap, color: THEME.colors.ash, fontSize: 9, letterSpacing: 1.1 },
  topSpace: { marginTop: 3 },
  note: { ...THEME.typography.bodyAsh, fontSize: 11, lineHeight: 16 },
  secondaryButton: { minHeight: 40, borderRadius: THEME.rounded.pill, borderWidth: 1, borderColor: THEME.colors.line, alignItems: 'center', justifyContent: 'center', marginTop: 5 },
  secondaryButtonText: { color: THEME.colors.bone, fontSize: 13, fontWeight: '600' },
  error: { color: '#ff9b83', fontSize: 12, lineHeight: 17 },
  footer: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 3 },
}));
