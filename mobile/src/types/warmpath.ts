export type ActivityType = 'vip' | 'club' | 'course' | 'lab' | 'internship' | 'job';

export interface EventItem {
  id: number;
  title: string;
  starts_at: string;
  location: string;
  link: string;
  activity_id?: number;
  displayTime?: string;
}

export interface Stop {
  activity_id: number;
  name: string;
  type: ActivityType;
  achievers: number;
  lift: number;
  typical_year: number;
  have: boolean;
  next: boolean;
  event: EventItem | null;
}

export interface Student {
  id: number;
  name: string;
  initials: string;
  major: string;
  school_year: number;
  yearLabel: string;
  school: string;
}

export interface ProfileInfo {
  name: string;
  headline: string;
  location: string;
  about: string;
}

export interface Alum {
  id: number;
  name: string;
  firstName: string;
  major: string;
  grad_year: number;
  city?: string;
  headline?: string;
  about?: string;
  shared_tie: string;
  score: number;
  draft: string;
  activities: number[];
}

export interface Ask {
  id: number;
  student_id: number;
  student_name: string;
  alum_id: number;
  alum_name: string;
  goal_id: number;
  shared_tie: string;
  message: string;
  messages?: AskMessage[];
  status: 'sent' | 'accepted' | 'ignored' | 'completed';
  created_at: string;
}

export interface AskMessage {
  id: number;
  sender: 'student' | 'alum';
  sender_name: string;
  text: string;
  created_at: string;
}

export interface Goal {
  id: number;
  label: string;
  achievers: number;
}

export interface Spot {
  x: number;
  y: number;
  side: 'left' | 'right' | 'above' | 'below';
}
