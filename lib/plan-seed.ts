import { shiftDays } from "./date";
import type { Phase, Profile, Session, StrengthExercise } from "./types";

export const OWNER = "nestor.daza@gmail.com";
export const STRENGTH_TYPE = "Strength";

export const profile: Profile = {
  ownerEmail: OWNER,
  raceName: "Half Marathon",
  raceDate: "2026-10-11",
  goal: "sub-2:45",
  baseline: "2:51 (2024)",
  maxHr: 187,
  vo2: 36,
  goalPaceSecPerKm: 469, // 7:49/km
  zones: [
    { z: 1, name: "Recovery", min: 94, max: 112 },
    { z: 2, name: "Easy", min: 112, max: 131 },
    { z: 3, name: "Tempo", min: 131, max: 150 },
    { z: 4, name: "Threshold", min: 150, max: 168 },
    { z: 5, name: "Hard", min: 168, max: 187 },
  ],
};

export type Seed = Omit<Session, "ownerEmail" | "status" | "actual" | "updatedAt">;

export const sessions: Seed[] = [
  { week: 1, date: "2026-06-19", day: "Fri", phase: "Base", type: "Kickoff", title: "5k easy, settle in and check HR", zone: "Z2", plannedKm: 5.0 },
  { week: 2, date: "2026-06-23", day: "Tue", phase: "Base", type: "Easy", title: "30 min easy", zone: "Z2", plannedKm: 3.4 },
  { week: 2, date: "2026-06-25", day: "Thu", phase: "Base", type: "Easy", title: "30 min easy + 4 strides", zone: "Z2", plannedKm: 3.4 },
  { week: 2, date: "2026-06-27", day: "Sat", phase: "Base", type: "Long", title: "7k easy", zone: "Z2", plannedKm: 7.0 },
  { week: 3, date: "2026-06-30", day: "Tue", phase: "Base", type: "Easy", title: "35 min easy", zone: "Z2", plannedKm: 4.0 },
  { week: 3, date: "2026-07-02", day: "Thu", phase: "Base", type: "Easy", title: "35 min easy + 5 strides", zone: "Z2", plannedKm: 4.0 },
  { week: 3, date: "2026-07-04", day: "Sat", phase: "Base", type: "Long", title: "9k easy", zone: "Z2", plannedKm: 9.0 },
  { week: 4, date: "2026-07-07", day: "Tue", phase: "Base", type: "Easy", title: "30 min easy", zone: "Z2", plannedKm: 3.4 },
  { week: 4, date: "2026-07-09", day: "Thu", phase: "Base", type: "Easy", title: "30 min easy + 5 strides", zone: "Z2", plannedKm: 3.4 },
  { week: 4, date: "2026-07-11", day: "Sat", phase: "Base", type: "Long", title: "7k easy (cutback)", zone: "Z2", plannedKm: 7.0 },
  { week: 5, date: "2026-07-14", day: "Tue", phase: "Build", type: "Easy", title: "35 min easy", zone: "Z2", plannedKm: 4.0 },
  { week: 5, date: "2026-07-16", day: "Thu", phase: "Build", type: "Quality", title: "10 min WU, 10 min Z3, 10 min easy", zone: "Z1-Z3", plannedKm: 4.0 },
  { week: 5, date: "2026-07-18", day: "Sat", phase: "Build", type: "Long", title: "10k easy", zone: "Z2", plannedKm: 10.0 },
  { week: 6, date: "2026-07-21", day: "Tue", phase: "Build", type: "Easy", title: "40 min easy", zone: "Z2", plannedKm: 4.6 },
  { week: 6, date: "2026-07-23", day: "Thu", phase: "Build", type: "Quality", title: "WU, 2x8 min Z3 (3 min jog), CD", zone: "Z3", plannedKm: 5.0 },
  { week: 6, date: "2026-07-25", day: "Sat", phase: "Build", type: "Long", title: "12k easy", zone: "Z2", plannedKm: 12.0 },
  { week: 7, date: "2026-07-28", day: "Tue", phase: "Build", type: "Easy", title: "40 min easy", zone: "Z2", plannedKm: 4.6 },
  { week: 7, date: "2026-07-30", day: "Thu", phase: "Build", type: "Quality", title: "WU, 18 min Z3 tempo, CD", zone: "Z3", plannedKm: 4.5 },
  { week: 7, date: "2026-08-01", day: "Sat", phase: "Build", type: "Long", title: "14k easy", zone: "Z2", plannedKm: 14.0 },
  { week: 8, date: "2026-08-04", day: "Tue", phase: "Build", type: "Easy", title: "35 min easy", zone: "Z2", plannedKm: 4.0 },
  { week: 8, date: "2026-08-06", day: "Thu", phase: "Build", type: "Easy", title: "35 min easy + 5 strides (cutback)", zone: "Z2", plannedKm: 4.0 },
  { week: 8, date: "2026-08-08", day: "Sat", phase: "Build", type: "Long", title: "11k easy (cutback)", zone: "Z2", plannedKm: 11.0 },
  { week: 9, date: "2026-08-11", day: "Tue", phase: "Build", type: "Easy", title: "40 min easy", zone: "Z2", plannedKm: 4.6 },
  { week: 9, date: "2026-08-13", day: "Thu", phase: "Build", type: "Quality", title: "WU, 3x8 min low Z4 (3 min jog), CD", zone: "Z4", plannedKm: 6.0 },
  { week: 9, date: "2026-08-15", day: "Sat", phase: "Build", type: "Long", title: "15k easy", zone: "Z2", plannedKm: 15.0 },
  { week: 10, date: "2026-08-18", day: "Tue", phase: "Build", type: "Easy", title: "45 min easy", zone: "Z2", plannedKm: 5.1 },
  { week: 10, date: "2026-08-20", day: "Thu", phase: "Build", type: "Quality", title: "WU, 25 min Z3 tempo, CD", zone: "Z3", plannedKm: 5.3 },
  { week: 10, date: "2026-08-22", day: "Sat", phase: "Build", type: "Long", title: "16k: 13k easy + 3k at goal pace", zone: "Z2-Z3", plannedKm: 16.0 },
  { week: 11, date: "2026-08-25", day: "Tue", phase: "Peak", type: "Easy", title: "45 min easy", zone: "Z2", plannedKm: 5.1 },
  { week: 11, date: "2026-08-27", day: "Thu", phase: "Peak", type: "Quality", title: "WU, 4x6 min Z4 (2 min jog), CD", zone: "Z4", plannedKm: 6.0 },
  { week: 11, date: "2026-08-29", day: "Sat", phase: "Peak", type: "Long", title: "17k: 13k easy + 4k at goal pace", zone: "Z2-Z3", plannedKm: 17.0 },
  { week: 12, date: "2026-09-01", day: "Tue", phase: "Peak", type: "Easy", title: "40 min easy", zone: "Z2", plannedKm: 4.6 },
  { week: 12, date: "2026-09-03", day: "Thu", phase: "Peak", type: "Easy", title: "40 min easy + 5 strides (cutback)", zone: "Z2", plannedKm: 4.6 },
  { week: 12, date: "2026-09-05", day: "Sat", phase: "Peak", type: "Long", title: "13k easy (cutback)", zone: "Z2", plannedKm: 13.0 },
  { week: 13, date: "2026-09-08", day: "Tue", phase: "Peak", type: "Easy", title: "45 min easy", zone: "Z2", plannedKm: 5.1 },
  { week: 13, date: "2026-09-10", day: "Thu", phase: "Peak", type: "Quality", title: "WU, 30 min Z3 tempo, CD", zone: "Z3", plannedKm: 6.0 },
  { week: 13, date: "2026-09-12", day: "Sat", phase: "Peak", type: "Long", title: "18k: 14k easy + 4k at goal pace", zone: "Z2-Z3", plannedKm: 18.0 },
  { week: 14, date: "2026-09-15", day: "Tue", phase: "Peak", type: "Easy", title: "50 min easy", zone: "Z2", plannedKm: 5.7 },
  { week: 14, date: "2026-09-17", day: "Thu", phase: "Peak", type: "Quality", title: "WU, 3x10 min Z3-Z4 (3 min jog), CD", zone: "Z3-Z4", plannedKm: 6.7 },
  { week: 14, date: "2026-09-19", day: "Sat", phase: "Peak", type: "Long", title: "19k easy (optional 20k if strong)", zone: "Z2", plannedKm: 19.0 },
  { week: 15, date: "2026-09-22", day: "Tue", phase: "Peak", type: "Easy", title: "45 min easy", zone: "Z2", plannedKm: 5.1 },
  { week: 15, date: "2026-09-24", day: "Thu", phase: "Peak", type: "Quality", title: "WU, 4x5 min at goal pace, CD", zone: "Z3", plannedKm: 5.5 },
  { week: 15, date: "2026-09-26", day: "Sat", phase: "Peak", type: "Long", title: "15k: 9k easy + 6k at goal pace", zone: "Z2-Z3", plannedKm: 15.0 },
  { week: 16, date: "2026-09-29", day: "Tue", phase: "Taper", type: "Easy", title: "40 min easy", zone: "Z2", plannedKm: 4.6 },
  { week: 16, date: "2026-10-01", day: "Thu", phase: "Taper", type: "Quality", title: "WU, 2x6 min Z3-Z4 (3 min jog), CD", zone: "Z3-Z4", plannedKm: 4.2 },
  { week: 16, date: "2026-10-03", day: "Sat", phase: "Taper", type: "Long", title: "13k easy", zone: "Z2", plannedKm: 13.0 },
  { week: 17, date: "2026-10-06", day: "Tue", phase: "Taper", type: "Easy", title: "30 min easy + 4 strides", zone: "Z2", plannedKm: 3.4 },
  { week: 17, date: "2026-10-08", day: "Thu", phase: "Taper", type: "Easy", title: "20 min easy + 3 strides", zone: "Z2", plannedKm: 2.3 },
  { week: 17, date: "2026-10-10", day: "Sat", phase: "Taper", type: "Shakeout", title: "4k shakeout + 3x1 min at goal pace", zone: "Z2-Z3", plannedKm: 4.0 },
  { week: 17, date: "2026-10-11", day: "Sun", phase: "Taper", type: "Race", title: "RACE 21.1k. Open in upper Z2, then settle to goal", zone: "Z2-Z3", plannedKm: 21.1 },
];

// --- Strength: short upper-body circuits on non-run days (Sunday stays rest) ---

const WEEK1_MONDAY = "2026-06-15"; // Monday of plan week 1
const PLAN_END = "2026-10-11"; // race day, last day of the plan
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// A rotation of distinct circuits so consecutive strength days never repeat.
// Each pairs upper-body work with a dedicated abs/core finisher (distinct per
// circuit), 2-3 sets, doable with a pair of dumbbells, bands, or just
// bodyweight, in roughly 15-20 minutes.
const CIRCUITS: ReadonlyArray<{ title: string; exercises: StrengthExercise[] }> = [
  {
    title: "Upper body & abs — Push",
    exercises: [
      { name: "Dumbbell floor press", detail: "3×12" },
      { name: "Push-ups", detail: "3×10" },
      { name: "Band chest press", detail: "3×15" },
      { name: "Overhead triceps extension (DB)", detail: "2×12" },
      { name: "Abs: bicycle crunches", detail: "3×20" },
    ],
  },
  {
    title: "Upper body & abs — Pull",
    exercises: [
      { name: "Bent-over dumbbell row", detail: "3×12" },
      { name: "Band lat pulldown", detail: "3×15" },
      { name: "Band pull-apart", detail: "3×15" },
      { name: "Dumbbell biceps curl", detail: "2×12" },
      { name: "Abs: hollow-body hold", detail: "3×30s" },
    ],
  },
  {
    title: "Upper body & abs — Shoulders",
    exercises: [
      { name: "Dumbbell overhead press", detail: "3×10" },
      { name: "Lateral raise (DB)", detail: "3×12" },
      { name: "Band face pull", detail: "3×15" },
      { name: "Front raise (DB)", detail: "2×12" },
      { name: "Abs: lying leg raises", detail: "3×15" },
    ],
  },
  {
    title: "Upper body & abs — Arms & grip",
    exercises: [
      { name: "Dumbbell hammer curl", detail: "3×12" },
      { name: "Chair dips", detail: "3×12" },
      { name: "Band biceps curl", detail: "3×15" },
      { name: "Overhead triceps extension (DB)", detail: "2×12" },
      { name: "Abs: Russian twists (DB)", detail: "3×20" },
    ],
  },
  {
    title: "Upper body & abs — Push/pull mix",
    exercises: [
      { name: "Push-ups", detail: "3×10" },
      { name: "Bent-over dumbbell row", detail: "3×12" },
      { name: "Band chest press", detail: "2×15" },
      { name: "Band row", detail: "2×15" },
      { name: "Abs: plank with shoulder taps", detail: "3×40s" },
    ],
  },
  {
    title: "Upper body & abs — Full circuit",
    exercises: [
      { name: "Dumbbell clean to press", detail: "3×10" },
      { name: "Renegade row (DB)", detail: "3×8 each side" },
      { name: "Band pull-apart", detail: "3×15" },
      { name: "Dumbbell curl", detail: "2×12" },
      { name: "Abs: dead bug", detail: "3×12 each side" },
    ],
  },
];

function weekday(dateStr: string): string {
  return DAY_NAMES[new Date(dateStr + "T00:00:00Z").getUTCDay()];
}

function weekNumber(dateStr: string): number {
  const days =
    (Date.parse(dateStr + "T00:00:00Z") - Date.parse(WEEK1_MONDAY + "T00:00:00Z")) / 86_400_000;
  return Math.floor(days / 7) + 1;
}

function phaseForWeek(week: number): Phase {
  if (week <= 4) return "Base";
  if (week <= 10) return "Build";
  if (week <= 15) return "Peak";
  return "Taper";
}

// One circuit on every non-run day except Sunday (the weekly full rest day),
// across the whole plan window. Variety comes from rotating through CIRCUITS.
// Generated from a given runner's run dates so each plan gets its own schedule.
export function generateStrengthSessions(runDates: Set<string>): Seed[] {
  const out: Seed[] = [];
  let i = 0;
  for (let date = WEEK1_MONDAY; date <= PLAN_END; date = shiftDays(date, 1)) {
    const day = weekday(date);
    if (day === "Sun" || runDates.has(date)) continue;
    const week = weekNumber(date);
    const circuit = CIRCUITS[i % CIRCUITS.length];
    out.push({
      week,
      date,
      day,
      phase: phaseForWeek(week),
      type: STRENGTH_TYPE,
      title: circuit.title,
      zone: "",
      plannedKm: 0,
      exercises: circuit.exercises,
    });
    i++;
  }
  return out;
}

export const strengthSessions: Seed[] = generateStrengthSessions(
  new Set(sessions.map((s) => s.date))
);
