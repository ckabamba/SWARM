import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';

export default function Header({ currentRole, onToggleRole }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.brandContainer}>
          <Text style={styles.brandTitle}>WarmPath</Text>
          <Text style={styles.brandSubtitle}>Alumni Path Map</Text>
        </View>

        <TouchableOpacity style={styles.switcherButton} onPress={onToggleRole}>
          <Text style={styles.switchLabel}>Device View:</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {currentRole === 'student' ? '🎓 George (Student)' : '⚡ Sarah (Alum)'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#003057', // Georgia Tech Navy
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#003057',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#B3A369', // Tech Gold
  },
  brandContainer: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 11,
    color: '#B3A369',
    fontWeight: '600',
    marginTop: -2,
  },
  switcherButton: {
    alignItems: 'flex-end',
  },
  switchLabel: {
    fontSize: 9,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  roleBadge: {
    backgroundColor: '#B3A369',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#003057',
  },
});
