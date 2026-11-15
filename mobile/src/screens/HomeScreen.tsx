import React, { useState } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import StudentHeader from '../components/home/StudentHeader';
import AccountSettingsControl from '../components/home/AccountSettingsControl';
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
}

export default function HomeScreen({ onOpenMap }: HomeScreenProps) {
  const {
    student,
    allStudents,
    profileInfo,
    stops,
    nextStop,
    litStopsCount,
    goal,
    asks,
    preferences,
    setPreferences,
    updateProfileInfo,
    setStudentId,
    toggleStopHave,
    setGoal,
    sendAskMessage,
  } = useWarmPathStore();

  const [studentModalVisible, setStudentModalVisible] = useState(false);
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [replyModalAskId, setReplyModalAskId] = useState<number | null>(null);

  const selectedReplyAsk = asks.find((a) => a.id === replyModalAskId) || null;
  const profileKey = `student:${student.id}`;
  const currentProfileInfo = profileInfo[profileKey] || {
    name: student.name,
    headline: student.major,
    location: student.school,
    about: '',
  };

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
      <AccountSettingsControl
        accountName={student.name}
        accountType="Student"
        profileInfo={currentProfileInfo}
        preferences={preferences}
        onUpdatePreferences={setPreferences}
        onSaveProfileInfo={(nextProfileInfo) => updateProfileInfo(profileKey, nextProfileInfo)}
      />

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
});
