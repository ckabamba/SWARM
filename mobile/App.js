import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Header from './src/components/Header';
import StudentHome from './src/components/StudentHome';
import AlumHome from './src/components/AlumHome';
import { SEEDED_ACCOUNTS, SEEDED_PATH } from './src/data/mockData';

export default function App() {
  const [currentRole, setCurrentRole] = useState('student'); // 'student' | 'alum'
  const [activeAsks, setActiveAsks] = useState([
    {
      id: 991,
      studentName: 'George P. Burdell',
      studentMajor: 'Computer Engineering',
      studentYear: '2nd Year Undergraduate',
      alumId: 87,
      alumName: 'Sarah Chen',
      sharedTie: 'Both CompE, both did RoboJackets, and joined Autonomous Racing VIP in year 2.',
      message:
        'Hi Sarah! I am a 2nd year CompE in RoboJackets. I noticed you took the Autonomous Racing VIP path before landing at NVIDIA—could I ask you 2 questions over a 15-min chat?',
      status: 'pending',
      createdAt: '5m ago',
    },
  ]);

  const toggleRole = () => {
    setCurrentRole((prev) => (prev === 'student' ? 'alum' : 'student'));
  };

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
      <StatusBar style="light" />
      <Header currentRole={currentRole} onToggleRole={toggleRole} />
      {currentRole === 'student' ? (
        <StudentHome
          student={SEEDED_ACCOUNTS.student}
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
    backgroundColor: '#003057',
  },
});
