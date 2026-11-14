import React, { useState } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import StudentHeader from '../components/home/StudentHeader';
import ActiveGoalCard from '../components/home/ActiveGoalCard';
import NextPreviewCard from '../components/home/NextPreviewCard';
import LitHexChips from '../components/home/LitHexChips';
import AsksOutbox from '../components/home/AsksOutbox';
import MobilePreferences from '../components/home/MobilePreferences';
import EditStudentModal from '../components/modals/EditStudentModal';
import NewGoalModal from '../components/modals/NewGoalModal';
import ReplyScreenModal from '../components/modals/ReplyScreenModal';
import { useWarmPathStore } from '../store/warmPathStore';
import { THEME } from '../theme/tokens';

interface HomeScreenProps {
  onOpenMap: (focusActivityId?: number) => void;
}

export default function HomeScreen({ onOpenMap }: HomeScreenProps) {
  const {
    student,
    allStudents,
    stops,
    nextStop,
    litStopsCount,
    goal,
    asks,
    preferences,
    setStudentId,
    toggleStopHave,
    setGoal,
    acceptAsk,
    setPreferences,
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

      <ReplyScreenModal
        visible={replyModalAskId !== null}
        ask={selectedReplyAsk}
        onAccept={acceptAsk}
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
