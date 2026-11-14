import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';

export default function AlumHome({ alum, activeAsks, onAcceptAsk }) {
  const handleAccept = (askId) => {
    onAcceptAsk(askId);
    Alert.alert(
      'Call Accepted! 🎉',
      'A 15-minute Google Meet link has been generated and sent to George P. Burdell.'
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Alum Profile Header */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{alum.avatar}</Text>
        </View>
        <View style={styles.profileTextContainer}>
          <Text style={styles.profileName}>{alum.name}</Text>
          <Text style={styles.profileSubtitle}>
            {alum.title} • {alum.company}
          </Text>
          <Text style={styles.profileMeta}>
            GT '{alum.gradYear} ({alum.major}) • {alum.city}
          </Text>
        </View>
      </View>

      {/* Past Path Highlights */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeader}>Your Verified GT Path</Text>
        <Text style={styles.sectionSubtext}>
          Students with similar starting points are matched based on these milestones:
        </Text>
        <View style={styles.tagsContainer}>
          {alum.pastActivities.map((act) => (
            <View key={act.id} style={styles.activityBadge}>
              <Text style={styles.activityBadgeText}>
                {act.name} (Yr {act.year})
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Incoming Requests Section */}
      <View style={styles.sectionCard}>
        <View style={styles.requestHeaderRow}>
          <Text style={styles.sectionHeader}>Incoming 15-Min Asks</Text>
          <View style={styles.badgeCount}>
            <Text style={styles.badgeCountText}>
              {activeAsks.length} {activeAsks.length === 1 ? 'Request' : 'Requests'}
            </Text>
          </View>
        </View>

        {activeAsks.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No pending requests right now.</Text>
            <Text style={styles.emptySubtext}>
              When a student taps "Send Ask" on their device, it will immediately appear here.
            </Text>
          </View>
        ) : (
          activeAsks.map((ask) => (
            <View
              key={ask.id}
              style={[
                styles.askCard,
                ask.status === 'accepted' && styles.askCardAccepted,
              ]}
            >
              <View style={styles.askHeader}>
                <View>
                  <Text style={styles.studentName}>{ask.studentName}</Text>
                  <Text style={styles.studentDetails}>
                    {ask.studentYear} • {ask.studentMajor}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    ask.status === 'accepted'
                      ? styles.statusBadgeAccepted
                      : styles.statusBadgePending,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      ask.status === 'accepted'
                        ? styles.statusBadgeTextAccepted
                        : styles.statusBadgeTextPending,
                    ]}
                  >
                    {ask.status === 'accepted' ? 'ACCEPTED' : 'NEW REQUEST'}
                  </Text>
                </View>
              </View>

              <View style={styles.tieContainer}>
                <Text style={styles.tieTitle}>Why You Were Matched:</Text>
                <Text style={styles.tieText}>{ask.sharedTie}</Text>
              </View>

              <View style={styles.messageBox}>
                <Text style={styles.messageText}>"{ask.message}"</Text>
              </View>

              {ask.status === 'accepted' ? (
                <View style={styles.acceptedRow}>
                  <Text style={styles.acceptedCheck}>✓ 15-min call booked</Text>
                  <Text style={styles.calendarNote}>Syncing to Google Calendar...</Text>
                </View>
              ) : (
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleAccept(ask.id)}
                  >
                    <Text style={styles.acceptButtonText}>Accept 15-Min Call</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  avatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#38BDF8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 26,
  },
  profileTextContainer: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileSubtitle: {
    fontSize: 13,
    color: '#38BDF8',
    fontWeight: '600',
    marginTop: 2,
  },
  profileMeta: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  sectionSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activityBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activityBadgeText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  requestHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  badgeCount: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeCountText: {
    color: '#1E40AF',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  emptySubtext: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },
  askCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  askCardAccepted: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  askHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  studentDetails: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgePending: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeAccepted: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusBadgeTextPending: {
    color: '#B45309',
  },
  statusBadgeTextAccepted: {
    color: '#15803D',
  },
  tieContainer: {
    marginTop: 10,
    backgroundColor: '#EFF6FF',
    padding: 8,
    borderRadius: 6,
  },
  tieTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
    marginBottom: 2,
  },
  tieText: {
    fontSize: 12,
    color: '#1E3A8A',
    lineHeight: 16,
  },
  messageBox: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  messageText: {
    fontSize: 13,
    color: '#334155',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  buttonRow: {
    marginTop: 12,
  },
  acceptButton: {
    backgroundColor: '#16A34A',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  acceptedRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#BBF7D0',
    alignItems: 'center',
  },
  acceptedCheck: {
    color: '#15803D',
    fontWeight: 'bold',
    fontSize: 14,
  },
  calendarNote: {
    color: '#166534',
    fontSize: 11,
    marginTop: 2,
  },
});
