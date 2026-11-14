import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Header from './src/components/Header';
import StudentHome from './src/components/StudentHome';
import AlumHome from './src/components/AlumHome';
import { SEEDED_ACCOUNTS, SEEDED_PATH } from './src/data/mockData';
import { THEME } from './src/theme';

export default function App() {
  const [currentRole, setCurrentRole] = useState('student'); // 'student' | 'alum'
  const [currentStudentId, setCurrentStudentId] = useState(1); // 1: George P. Burdell, 2: Devon Brooks
  const [activeAsks, setActiveAsks] = useState([
    {
      id: 991,
      studentName: 'George P. Burdell',
      studentMajor: 'CompE',
      studentYear: '2nd Year Undergraduate · CompE',
      alumId: 87,
      alumName: 'Elena Rostova',
      sharedTie: 'You are both CompE and both joined VIP: Embedded Vision in second year',
      message:
        'Hi Elena, I am a second-year CompE student at Georgia Tech looking into SWE roles at NVIDIA. I saw you were on the VIP: Embedded Vision team—would you be open to a 15-minute call on how that shaped your preparation?',
      status: 'pending',
      createdAt: '5m ago',
    },
  ]);

  const activeStudent =
    currentStudentId === 1
      ? SEEDED_ACCOUNTS.student
      : SEEDED_ACCOUNTS.studentDevon;

  const handleSendAsk = (newAsk) => {
    setActiveAsks((prev) => [newAsk, ...prev]);
  };

  const handleAcceptAsk = (askId) => {
    setActiveAsks((prev) =>
      prev.map((ask) =>
        ask.id === askId ? { ...ask, status: 'accepted' } : ask
      )
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={THEME.colors.void} />
      <Header currentRole={currentRole} onSelectRole={setCurrentRole} />
      {currentRole === 'student' ? (
        <StudentHome
          student={activeStudent}
          currentStudentId={currentStudentId}
          onSwitchStudent={setCurrentStudentId}
          pathData={SEEDED_PATH}
          activeAsks={activeAsks}
          onSendAsk={handleSendAsk}
        />
      ) : (
        <AlumHome
          alum={SEEDED_ACCOUNTS.alum}
          activeAsks={activeAsks}
          onAcceptAsk={handleAcceptAsk}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.void,
  },
});
