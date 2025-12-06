export interface Mentor {
  id: string;
  email: string;
  full_name: string;
  short_form: string;
  created_at: string;
}

export interface Student {
  id: string;
  name: string;
  roll_number: string;
  class: string;
  photo_url?: string;
  created_at: string;
}

export interface Tally {
  id: string;
  student_id: string;
  count: number;
  fine_amount: number;
  added_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Star {
  id: string;
  student_id: string;
  count: number;
  added_by?: string;
  source: string;
  created_at: string;
}

export interface OtherTally {
  id: string;
  student_id: string;
  count: number;
  fine_amount: number;
  added_by?: string;
  created_at: string;
  updated_at: string;
}

export interface MorningBliss {
  id: string;
  student_id: string;
  class: string;
  topic: string;
  score: number;
  evaluated_by: string;
  evaluator_id?: string;
  photo_urls: string[];
  date: string;
  is_daily_winner: boolean;
  is_topper: boolean;
  created_at: string;
}

export interface MagazineScore {
  id: string;
  student_id: string;
  class: string;
  score: number;
  max_score: number;
  date: string;
  added_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  student_id: string;
  class: string;
  date: string;
  status: 'Present' | 'Absent' | 'Hospital' | 'Program' | 'Reported';
  prayer?: 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';
  marked_by?: string;
  created_at: string;
}

export interface AttendanceArchive {
  id: string;
  student_id: string;
  class: string;
  date: string;
  status: string;
  reason?: string;
  marked_by?: string;
  archived_at: string;
  original_month: string;
}

export const CLASSES = [
  'JCP3',
  'S2A',
  'S2B',
  'C2A',
  'C2B',
  'S1A',
  'S1B',
  'C1A',
  'C1B',
  'C1C'
];

export const ATTENDANCE_STATUS = [
  'Present',
  'Absent',
  'Hospital',
  'Program',
  'Reported'
] as const;

export const PRAYERS = [
  'Fajr',
  'Dhuhr',
  'Asr',
  'Maghrib',
  'Isha'
] as const;


export interface VoiceOfDirector {
  id: string;
  title: string;
  message: string;
  created_at: string;
  updated_at: string;
}

export interface Class {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface ClassReason {
  id: string;
  reason: string;
  tally: number;
  created_at: string;
  updated_at: string;
}

export interface PerformanceReason {
  id: string;
  reason: string;
  tally: number;
  created_at: string;
  updated_at: string;
}

export interface StarReason {
  id: string;
  reason: string;
  stars: number;
  created_at: string;
  updated_at: string;
}

export interface TallyHistory {
  id: string;
  student_id: string;
  class: string;
  mentor_id?: string;
  mentor_short_form: string;
  type: 'class' | 'star' | 'performance';
  reason?: string;
  tally_value: number;
  created_at: string;
}
