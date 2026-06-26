export type Phase = "Base" | "Build" | "Peak" | "Taper";
export type Status = "planned" | "done" | "skipped";

export interface Actual {
  km?: number;
  avgHr?: number;
  durationMin?: number;
  weightKg?: number;
  notes?: string;
}

export interface StrengthExercise {
  name: string;
  detail: string; // sets × reps or hold, e.g. "3×12" or "2×30s"
}

export interface Session {
  ownerEmail: string;
  week: number;
  date: string; // YYYY-MM-DD
  day: string;
  phase: Phase;
  type: string; // run types (Easy, Quality, Long, …) or "Strength"
  title: string;
  zone: string; // empty for Strength
  plannedKm: number; // 0 for Strength
  exercises?: StrengthExercise[]; // present only on Strength sessions
  status: Status;
  actual?: Actual;
  updatedAt?: string;
}

export interface Zone {
  z: number;
  name: string;
  min: number;
  max: number;
}

export interface PushSubscriptionDoc {
  ownerEmail: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  createdAt: string; // ISO timestamp
}

export interface DailySummary {
  ownerEmail: string;
  date: string; // YYYY-MM-DD, unique per owner
  text: string;
  model: string;
  createdAt: string; // ISO timestamp
}

export interface Profile {
  ownerEmail: string;
  raceName: string;
  raceDate: string; // YYYY-MM-DD
  goal: string;
  baseline: string;
  maxHr: number;
  vo2: number;
  goalPaceSecPerKm: number;
  zones: Zone[];
}
