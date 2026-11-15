import React, { useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Text } from 'react-native';
import StudentHeader from '../components/home/StudentHeader';
import ActiveGoalCard from '../components/home/ActiveGoalCard';
import NextPreviewCard from '../components/home/NextPreviewCard';
import LitHexChips from '../components/home/LitHexChips';
import AsksOutbox from '../components/home/AsksOutbox';
import MobilePreferences from '../components/home/MobilePreferences';
import EditStudentModal from '../components/modals/EditStudentModal';
import NewGoalModal from '../components/modals/NewGoalModal';
import AskConversationModal from '../components/modals/AskConversationModal';
import { useWarmPathStore } from '../store/warmPathStore';
import { THEME } from '../theme/tokens';

interface HomeScreenProps {
  onOpenMap: (focusActivityId?: number) => void;
  onOpenProfile: () => void;
}

export default function HomeScreen({ onOpenMap, onOpenProfile }: HomeScreenProps) {
  const {
    student,
    allStudents,
    stops,
    nextStop,
    litStopsCount,
    goal,
    asks,
    preferences,
    setPreferences,
    setStudentId,
    toggleStopHave,
    setGoal,
    sendAskMessage,
  } = useWarmPathStore();

  const [studentModalVisible, setStudentModalVisible] = useState(false);
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [replyModalAskId, setReplyModalAskId] = useState<number | null>(null);

  const selectedReplyAsk = asks.find((a) => a.id === replyModalAskId) || null;
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Student Identity Header */}
      <StudentHeader
        student={student}
        onEditPress={() => setStudentModalVisible(true)}
      />
      <TouchableOpacity style={styles.accountButton} onPress={onOpenProfile} accessibilityRole="button">
        <Text style={styles.accountButtonText}>WARMPath ACCOUNT & PROFILE</Text>
      </TouchableOpacity>

      {/* Active Goal Hero Card */}
      <ActiveGoalCard
        goal={goal}
        stops={stops}
        litCount={litStopsCount}
        onOpenMap={() => onOpenMap()}
        onNewGoalPress={() => setGoalModalVisible(true)}
      />

      {/* Next For You / This Week Preview */}
      <NextPreviewCard
        nextStop={nextStop}
        onViewOnMap={(activityId) => onOpenMap(activityId)}
      />

      {/* Your Lit Hexes Interactive Chips */}
      <LitHexChips stops={stops} onToggleHave={toggleStopHave} />

      {/* Asks Outbox */}
      <AsksOutbox
        asks={asks}
        onOpenReplyDemo={(askId) => setReplyModalAskId(askId)}
      />

      {/* Mobile Preferences */}
      <MobilePreferences
        preferences={preferences}
        onUpdatePreferences={setPreferences}
      />

      {/* Modals */}
      <EditStudentModal
        visible={studentModalVisible}
        students={allStudents}
        currentStudentId={student.id}
        onSelectStudent={setStudentId}
        onClose={() => setStudentModalVisible(false)}
      />

      <NewGoalModal
        visible={goalModalVisible}
        currentGoalLabel={goal.label}
        onSelectGoal={setGoal}
        onClose={() => setGoalModalVisible(false)}
      />

      <AskConversationModal
        visible={replyModalAskId !== null}
        ask={selectedReplyAsk}
        sender="student"
        onSend={sendAskMessage}
        onClose={() => setReplyModalAskId(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    paddingHorizontal: THEME.spacing.gutter,
    paddingTop: 16,
    paddingBottom: 40,
  },
  accountButton: {
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: THEME.colors.line,
    borderRadius: THEME.rounded.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: -12,
    marginBottom: 16,
  },
  accountButtonText: {
    ...THEME.typography.cap,
    fontSize: 8,
    color: THEME.colors.ash,
    letterSpacing: 0.9,
  },
});
