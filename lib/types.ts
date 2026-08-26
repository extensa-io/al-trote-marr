export type Phase = "Base" | "Build" | "Peak" | "Taper";
export type Status = "planned" | "done" | "skipped";

export interface Actual {
  km?: number;
  avgHr?: number;
  durationMin?: number;
  weightKg?: number;
  notes?: string;
  // A deliberate hard effort run to measure current fitness, rather than the
  // prescribed session. It is a property of what was run, not of what was
  // planned, so it lives here and not on `Session.type` — the runner decides at
  // log time, and no session type needs editing.
  //
  // Two effects, both in lib/stats.ts: the run feeds the speed-based race
  // projection whatever its session type, and it is excluded from every
  // easy-run metric (zone adherence, aerobic efficiency, pace comparisons),
  // where a maximal effort would otherwise read as lost fitness or broken
  // discipline. It still counts for adherence, volume, and longest run.
  testEffort?: boolean;
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

// One doc per (ownerEmail, date) in `dailySummaries`. Two shapes share the key:
// the morning cron note (kind "daily") and the recap written when a run is
// logged (kind "recap"). A recap overwrites that day's note until the next
// morning's cron writes a fresh note under the new date. `kind` absent means a
// daily note written before recaps existed.
export interface DailySummary {
  ownerEmail: string;
  date: string; // YYYY-MM-DD, unique per owner
  kind?: "daily" | "recap"; // absent ⇒ daily
  text: string; // daily note prose, or the recap paragraph
  insights?: string[]; // recap only
  suggestions?: string[]; // recap only
  runUpdatedAt?: string; // recap only: session.updatedAt at generation time
  model: string;
  createdAt: string; // ISO timestamp
}

// Plain-English explanation of one workout's prescription, cached in
// `sessionExplanations`. Keyed by (ownerEmail, key) where `key` is a hash of the
// prescription itself (type, zone, title, plannedKm), so the many identical
// workouts across the plan share one explanation and are generated only once.
export interface SessionExplanation {
  ownerEmail: string;
  key: string; // hash of the prescription this explains
  text: string; // the paragraph
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
  // Standing facts about how this runner trains that change how their numbers
  // should be read, in the runner's own words. Injected into every AI prompt.
  // The case it exists for: easy Z2 runs done as run/walk intervals, where
  // average pace reflects the walk ratio rather than fitness, so a pace delta is
  // not a fitness signal. Absent for a runner with nothing to declare.
  trainingContext?: string;
}
