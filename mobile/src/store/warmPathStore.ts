import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Student, Stop, Alum, Ask, Goal } from '../types/warmpath';

const STORAGE_KEYS = {
  ACTIVE_STUDENT_ID: 'warmpath.active_student_id',
  HAVE_MAP: 'warmpath.have_map',
  ACTIVE_GOAL: 'warmpath.active_goal',
  ASKS: 'warmpath.asks',
  PREFS: 'warmpath.prefs',
};

// Seeded students
export const SEEDED_STUDENTS: Student[] = [
  {
    id: 1,
    name: 'George P. Burdell',
    initials: 'GB',
    major: 'Computer Engineering',
    school_year: 2,
    yearLabel: '2nd year',
    school: 'Georgia Tech',
  },
  {
    id: 2,
    name: 'Devon Brooks',
    initials: 'DB',
    major: 'Computer Science',
    school_year: 1,
    yearLabel: '1st year',
    school: 'Georgia Tech',
  },
];

// Initial stops baseline from fake-api.js
const INITIAL_STOPS: Omit<Stop, 'have' | 'next'>[] = [
  {
    activity_id: 3,
    name: 'VIP: Embedded Vision',
    type: 'vip',
    achievers: 9,
    lift: 4.1,
    typical_year: 2,
    event: {
      id: 40,
      title: 'Info session',
      starts_at: '2026-11-17T18:00:00-05:00',
      location: 'Klaus 1116',
      link: 'https://example.com/event/40',
      displayTime: 'Tue 6:00p',
    },
  },
  {
    activity_id: 4,
    name: 'VIP: GPU Systems',
    type: 'vip',
    achievers: 7,
    lift: 3.6,
    typical_year: 3,
    event: {
      id: 41,
      title: 'Team demo night',
      starts_at: '2026-11-19T17:30:00-05:00',
      location: 'Van Leer C240',
      link: 'https://example.com/event/41',
      displayTime: 'Thu 5:30p',
    },
  },
  {
    activity_id: 7,
    name: 'CS 3210 Operating Systems',
    type: 'course',
    achievers: 8,
    lift: 2.9,
    typical_year: 3,
    event: null,
  },
  {
    activity_id: 5,
    name: 'RoboJackets',
    type: 'club',
    achievers: 6,
    lift: 2.4,
    typical_year: 1,
    event: {
      id: 42,
      title: 'Software training night',
      starts_at: '2026-11-16T19:00:00-05:00',
      location: 'Student Competition Center',
      link: 'https://example.com/event/42',
      displayTime: 'Mon 7:00p',
    },
  },
  {
    activity_id: 9,
    name: 'Computer Architecture Lab',
    type: 'lab',
    achievers: 5,
    lift: 2.2,
    typical_year: 3,
    event: {
      id: 43,
      title: 'Undergrad research poster session',
      starts_at: '2026-11-20T14:00:00-05:00',
      location: 'Klaus Atrium',
      link: 'https://example.com/event/43',
      displayTime: 'Fri 2:00p',
    },
  },
];

// Seeded alumni from fake-api.js
export const SEEDED_ALUMNI: Alum[] = [
  {
    id: 87,
    name: 'Elena Rostova',
    firstName: 'Elena',
    major: 'CompE',
    grad_year: 2023,
    city: 'Santa Clara, CA',
    shared_tie: 'You are both CompE and both joined VIP: Embedded Vision in second year',
    score: 0.88,
    draft: 'Hi Elena, I am a second-year CompE student looking at SWE roles at NVIDIA. I saw you were on the VIP: Embedded Vision team—could I ask you a question or two over a 15-minute call about how that helped with interview preparation?',
    activities: [3, 4, 7, 5],
  },
  {
    id: 89,
    name: 'Marcus Vance',
    firstName: 'Marcus',
    major: 'CS',
    grad_year: 2023,
    city: 'Sunnyvale, CA',
    shared_tie: 'You both took CS 3210 and worked in the Computer Architecture Lab',
    score: 0.76,
    draft: 'Hi Marcus, I am a GT student aiming for SWE roles at NVIDIA. I saw you took CS 3210 before joining NVIDIA—would you be open to a 15-minute chat about systems prep?',
    activities: [7, 9, 4],
  },
  {
    id: 91,
    name: 'Priyah Patel',
    firstName: 'Priyah',
    major: 'CompE',
    grad_year: 2022,
    city: 'San Jose, CA',
    shared_tie: 'You both joined RoboJackets software division in your first year',
    score: 0.71,
    draft: 'Hi Priyah, I am a CompE student in RoboJackets looking towards NVIDIA. Would you have 15 minutes to share how your student team work carried into your full-time role?',
    activities: [5, 3, 7],
  },
  {
    id: 93,
    name: 'David Kim',
    firstName: 'David',
    major: 'CompE',
    grad_year: 2023,
    city: 'Santa Clara, CA',
    shared_tie: 'You are both CompE and both joined the VIP: GPU Systems team',
    score: 0.69,
    draft: 'Hi David, I am a second-year CompE interested in NVIDIA GPU systems SWE. Would you be open to a quick 15-minute call on how to get the most out of VIP research?',
    activities: [4, 7, 9],
  },
];

// Initial default have map for student 1 and 2
const DEFAULT_HAVE_MAP: Record<number, number[]> = {
  1: [5, 3], // George P. Burdell has RoboJackets and VIP Embedded Vision
  2: [5],    // Devon Brooks has RoboJackets
};

export interface MobilePreferences {
  lowBatteryMode: boolean;
  weeklyReminders: boolean;
}

// Global in-memory state
let currentStudentId = 1;
let currentHaveMap = { ...DEFAULT_HAVE_MAP };
let currentGoal: Goal = { id: 12, label: 'SWE internship at NVIDIA', achievers: 14 };
let currentAsks: Ask[] = [
  {
    id: 501,
    student_id: 1,
    student_name: 'George P. Burdell',
    alum_id: 87,
    alum_name: 'Elena Rostova',
    goal_id: 12,
    shared_tie: 'You are both CompE and both joined VIP: Embedded Vision in second year',
    message: 'Hi Elena, I am a second-year CompE student looking at SWE roles at NVIDIA. I saw you were on the VIP: Embedded Vision team—could I ask you a question or two over a 15-minute call about how that helped with interview preparation?',
    status: 'sent',
    created_at: '2 hours ago',
  },
];
let currentPrefs: MobilePreferences = {
  lowBatteryMode: false,
  weeklyReminders: true,
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

/**
 * Calculates stops with dynamic 'have' and 'next' based on student's current activities.
 */
function computeStops(studentId: number, haveMap: Record<number, number[]>): Stop[] {
  const studentHaves = haveMap[studentId] || [];

  // Sort stops by lift descending
  const sorted = [...INITIAL_STOPS].sort((a, b) => b.lift - a.lift);

  let nextAssigned = false;
  return sorted.map((stop) => {
    const have = studentHaves.includes(stop.activity_id);
    let next = false;
    if (!have && !nextAssigned) {
      next = true;
      nextAssigned = true;
    }
    return {
      ...stop,
      have,
      next,
    };
  });
}

// Load persisted state on startup
(async () => {
  try {
    const [savedStudentId, savedHaveMap, savedGoal, savedAsks, savedPrefs] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_STUDENT_ID),
      AsyncStorage.getItem(STORAGE_KEYS.HAVE_MAP),
      AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_GOAL),
      AsyncStorage.getItem(STORAGE_KEYS.ASKS),
      AsyncStorage.getItem(STORAGE_KEYS.PREFS),
    ]);

    if (savedStudentId) currentStudentId = JSON.parse(savedStudentId);
    if (savedHaveMap) currentHaveMap = JSON.parse(savedHaveMap);
    if (savedGoal) currentGoal = JSON.parse(savedGoal);
    if (savedAsks) currentAsks = JSON.parse(savedAsks);
    if (savedPrefs) currentPrefs = JSON.parse(savedPrefs);

    notify();
  } catch (err) {
    console.warn('Failed to load warmPath store from AsyncStorage', err);
  }
})();

export function useWarmPathStore() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setTick((t) => t + 1);
    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  const activeStudent = SEEDED_STUDENTS.find((s) => s.id === currentStudentId) || SEEDED_STUDENTS[0];
  const stops = computeStops(currentStudentId, currentHaveMap);
  const nextStop = stops.find((s) => s.next) || null;
  const litStopsCount = stops.filter((s) => s.have).length;

  const setStudentId = useCallback((id: number) => {
    currentStudentId = id;
    AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_STUDENT_ID, JSON.stringify(id));
    notify();
  }, []);

  const toggleStopHave = useCallback((activityId: number) => {
    const studentHaves = currentHaveMap[currentStudentId] || [];
    const exists = studentHaves.includes(activityId);
    const updated = exists ? studentHaves.filter((id) => id !== activityId) : [...studentHaves, activityId];

    currentHaveMap = {
      ...currentHaveMap,
      [currentStudentId]: updated,
    };
    AsyncStorage.setItem(STORAGE_KEYS.HAVE_MAP, JSON.stringify(currentHaveMap));
    notify();
  }, []);

  const setGoal = useCallback((goalLabel: string) => {
    currentGoal = {
      id: Date.now(),
      label: goalLabel,
      achievers: 14,
    };
    AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_GOAL, JSON.stringify(currentGoal));
    notify();
  }, []);

  const createAsk = useCallback((alumId: number, message: string) => {
    const alum = SEEDED_ALUMNI.find((a) => a.id === alumId) || SEEDED_ALUMNI[0];
    const newAsk: Ask = {
      id: Date.now(),
      student_id: activeStudent.id,
      student_name: activeStudent.name,
      alum_id: alum.id,
      alum_name: alum.name,
      goal_id: currentGoal.id,
      shared_tie: alum.shared_tie,
      message,
      status: 'sent',
      created_at: 'Just now',
    };
    currentAsks = [newAsk, ...currentAsks];
    AsyncStorage.setItem(STORAGE_KEYS.ASKS, JSON.stringify(currentAsks));
    notify();
    return newAsk;
  }, [activeStudent]);

  const acceptAsk = useCallback((askId: number) => {
    currentAsks = currentAsks.map((a) => (a.id === askId ? { ...a, status: 'accepted' as const } : a));
    AsyncStorage.setItem(STORAGE_KEYS.ASKS, JSON.stringify(currentAsks));
    notify();
  }, []);

  const setPreferences = useCallback((patch: Partial<MobilePreferences>) => {
    currentPrefs = { ...currentPrefs, ...patch };
    AsyncStorage.setItem(STORAGE_KEYS.PREFS, JSON.stringify(currentPrefs));
    notify();
  }, []);

  return {
    student: activeStudent,
    allStudents: SEEDED_STUDENTS,
    stops,
    nextStop,
    litStopsCount,
    goal: currentGoal,
    asks: currentAsks,
    alumni: SEEDED_ALUMNI,
    preferences: currentPrefs,
    setStudentId,
    toggleStopHave,
    setGoal,
    createAsk,
    acceptAsk,
    setPreferences,
  };
}
