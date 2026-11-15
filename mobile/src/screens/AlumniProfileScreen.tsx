import React from 'react';
import { createThemedStyles } from '../theme/themedStyles';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AskConversationModal from '../components/modals/AskConversationModal';
import AccountSettingsControl from '../components/home/AccountSettingsControl';
import { useWarmPathStore } from '../store/warmPathStore';
import { THEME } from '../theme/tokens';

export default function AlumniProfileScreen() {
  const {
    stops,
    asks,
    alumni,
    profileInfo,
    preferences,
    setPreferences,
    updateProfileInfo,
    acceptAsk,
    sendAskMessage,
  } = useWarmPathStore();
  const alum = alumni[0];
  const profileKey = `alum:${alum.id}`;
  const currentProfileInfo = profileInfo[profileKey] || {
    name: alum.name,
    headline: 'Software Engineer · NVIDIA',
    location: alum.city || '',
    about: 'Georgia Tech CompE alum working on software at NVIDIA. I enjoy helping students explore systems, research, and early-career opportunities.',
  };
  const [selectedAskId, setSelectedAskId] = React.useState<number | null>(null);
  const experiences = alum.activities
    .map((activityId) => stops.find((stop) => stop.activity_id === activityId))
    .filter((stop) => stop !== undefined);
  const inboxAsks = asks.filter((ask) => ask.alum_id === alum.id);
  const selectedAsk = inboxAsks.find((ask) => ask.id === selectedAskId) || null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>ER</Text>
        </View>
        <View style={styles.identity}>
          <Text style={styles.name}>{alum.name}</Text>
          <Text style={styles.role}>{alum.headline || currentProfileInfo.headline}</Text>
          <Text style={styles.meta}>
            {`${alum.major} '${String(alum.grad_year).slice(-2)} · Georgia Tech`}
          </Text>
        </View>
        <View style={styles.alumBadge}>
          <Text style={styles.alumBadgeText}>ALUM</Text>
        </View>
      </View>
      <AccountSettingsControl
        accountName={alum.name}
        accountType="Alumni"
        profileInfo={currentProfileInfo}
        preferences={preferences}
        onUpdatePreferences={setPreferences}
        onSaveProfileInfo={(nextProfileInfo) => updateProfileInfo(profileKey, nextProfileInfo)}
      />

      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={16} color={THEME.colors.gold} />
        <Text style={styles.location}>{alum.city}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ABOUT</Text>
        <Text style={styles.about}>
          {alum.about || currentProfileInfo.about}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>CAMPUS EXPERIENCE</Text>
        {experiences.map((experience) => (
          <View key={experience.activity_id} style={styles.experienceRow}>
            <View style={styles.experienceIcon}>
              <Ionicons
                name="git-branch-outline"
                size={15}
                color={THEME.colors.glow}
              />
            </View>
            <View style={styles.experienceDetails}>
              <Text style={styles.experienceName}>{experience.name}</Text>
              <Text style={styles.experienceYear}>
                {experience.typical_year === 1
                  ? '1st'
                  : experience.typical_year === 2
                    ? '2nd'
                    : '3rd'}{' '}
                year
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>CURRENT ROLE</Text>
        <View style={styles.roleCard}>
          <View style={styles.companyIcon}>
            <Ionicons name="hardware-chip-outline" size={20} color={THEME.colors.glow} />
          </View>
          <View>
            <Text style={styles.companyName}>NVIDIA</Text>
            <Text style={styles.companyRole}>Software Engineer</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.inboxHeader}>
          <Text style={styles.sectionLabel}>ASKS & MESSAGES</Text>
          <Text style={styles.inboxCount}>{inboxAsks.length}</Text>
        </View>
        {inboxAsks.length === 0 ? (
          <Text style={styles.emptyInbox}>
            Ask requests sent to {alum.firstName} will appear here.
          </Text>
        ) : inboxAsks.map((ask) => {
          const lastMessage = ask.messages?.[ask.messages.length - 1]?.text || ask.message;
          return (
            <TouchableOpacity
              key={ask.id}
              style={styles.inboxCard}
              onPress={() => setSelectedAskId(ask.id)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Open conversation with ${ask.student_name}`}
            >
              <View style={styles.inboxCardHeader}>
                <Text style={styles.inboxStudent}>{ask.student_name}</Text>
                <Text style={styles.inboxStatus}>
                  {ask.status === 'accepted' ? 'ACCEPTED' : 'NEW ASK'}
                </Text>
              </View>
              <Text style={styles.inboxMessage} numberOfLines={2}>{lastMessage}</Text>
              <Text style={styles.openConversation}>OPEN CONVERSATION →</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <AskConversationModal
        visible={selectedAskId !== null}
        ask={selectedAsk}
        sender="alum"
        onSend={sendAskMessage}
        onAccept={acceptAsk}
        onClose={() => setSelectedAskId(null)}
      />
    </ScrollView>
  );
}

const styles = createThemedStyles(StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    paddingHorizontal: THEME.spacing.gutter,
    paddingTop: 24,
    paddingBottom: 40,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.line,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1.5,
    borderColor: THEME.colors.gold,
    backgroundColor: 'rgba(234, 170, 0, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: THEME.colors.glow,
    fontSize: 18,
    fontWeight: '700',
  },
  identity: {
    flex: 1,
  },
  name: {
    ...THEME.typography.headline,
    fontSize: 19,
  },
  role: {
    ...THEME.typography.body,
    marginTop: 3,
  },
  meta: {
    ...THEME.typography.bodyAsh,
    fontSize: 12,
    marginTop: 2,
  },
  alumBadge: {
    borderWidth: 1,
    borderColor: 'rgba(234, 170, 0, 0.45)',
    borderRadius: THEME.rounded.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  alumBadgeText: {
    ...THEME.typography.cap,
    color: THEME.colors.gold,
    fontSize: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  location: {
    ...THEME.typography.bodyAsh,
  },
  section: {
    paddingTop: 18,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.line,
  },
  sectionLabel: {
    ...THEME.typography.cap,
    color: THEME.colors.gold,
    marginBottom: 12,
  },
  inboxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inboxCount: {
    ...THEME.typography.cap,
    color: THEME.colors.glow,
    marginBottom: 12,
  },
  emptyInbox: {
    ...THEME.typography.bodyAsh,
    fontSize: 12,
    lineHeight: 18,
  },
  inboxCard: {
    borderRadius: THEME.rounded.card,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    backgroundColor: THEME.colors.surface,
    padding: 14,
    marginBottom: 10,
  },
  inboxCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },
  inboxStudent: {
    ...THEME.typography.title,
    fontSize: 14,
  },
  inboxStatus: {
    ...THEME.typography.cap,
    fontSize: 8,
    color: THEME.colors.gold,
  },
  inboxMessage: {
    ...THEME.typography.bodyAsh,
    fontSize: 12,
    lineHeight: 18,
  },
  openConversation: {
    ...THEME.typography.cap,
    fontSize: 8,
    color: THEME.colors.glow,
    marginTop: 10,
  },
  about: {
    ...THEME.typography.body,
    lineHeight: 22,
  },
  experienceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  experienceIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  experienceDetails: {
    flex: 1,
  },
  experienceName: {
    ...THEME.typography.body,
    fontWeight: '500',
  },
  experienceYear: {
    ...THEME.typography.bodyAsh,
    fontSize: 12,
    marginTop: 2,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: THEME.rounded.card,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    backgroundColor: THEME.colors.surface,
    padding: 14,
  },
  companyIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(234, 170, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyName: {
    ...THEME.typography.title,
  },
  companyRole: {
    ...THEME.typography.bodyAsh,
    marginTop: 2,
  },
}));
