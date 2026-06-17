export type Phase = "Base" | "Build" | "Peak" | "Taper";
export type Status = "planned" | "done" | "skipped";

export interface Actual {
  km?: number;
  avgHr?: number;
  durationMin?: number;
  notes?: string;
}

export interface Session {
  ownerEmail: string;
  week: number;
  date: string; // YYYY-MM-DD
  day: string;
  phase: Phase;
  type: string;
  title: string;
  zone: string;
  plannedKm: number;
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
