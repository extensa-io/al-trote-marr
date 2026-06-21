import { generateStrengthSessions, type Seed } from "./plan-seed";
import type { Profile } from "./types";

export const LILO_OWNER = "lilo.ayala@gmail.com";

// Max HR estimated via Tanaka (208 − 0.7×48 ≈ 174); zones are %max, same scheme
// as Néstor's. Goal sub-2:30 → ~7:06/km (427 s/km).
export const liloProfile: Profile = {
  ownerEmail: LILO_OWNER,
  raceName: "Half Marathon",
  raceDate: "2026-10-11",
  goal: "sub-2:30",
  baseline: "8k @ 7:30/km (Jun 2026)",
  maxHr: 174,
  vo2: 40,
  goalPaceSecPerKm: 427, // 7:06/km
  zones: [
    { z: 1, name: "Recovery", min: 87, max: 104 },
    { z: 2, name: "Easy", min: 104, max: 122 },
    { z: 3, name: "Tempo", min: 122, max: 139 },
    { z: 4, name: "Threshold", min: 139, max: 157 },
    { z: 5, name: "Hard", min: 157, max: 174 },
  ],
};

// Same 17-week structure and dates as Néstor's plan, scaled up modestly for a
// fitter runner: a touch more easy volume and longer long runs (peak 20k).
export const liloSessions: Seed[] = [
  { week: 1, date: "2026-06-19", day: "Fri", phase: "Base", type: "Kickoff", title: "6k easy, settle in and check HR", zone: "Z2", plannedKm: 6.0 },
  { week: 2, date: "2026-06-23", day: "Tue", phase: "Base", type: "Easy", title: "35 min easy", zone: "Z2", plannedKm: 4.5 },
  { week: 2, date: "2026-06-25", day: "Thu", phase: "Base", type: "Easy", title: "35 min easy + 4 strides", zone: "Z2", plannedKm: 4.5 },
  { week: 2, date: "2026-06-27", day: "Sat", phase: "Base", type: "Long", title: "8k easy", zone: "Z2", plannedKm: 8.0 },
  { week: 3, date: "2026-06-30", day: "Tue", phase: "Base", type: "Easy", title: "40 min easy", zone: "Z2", plannedKm: 5.2 },
  { week: 3, date: "2026-07-02", day: "Thu", phase: "Base", type: "Easy", title: "40 min easy + 5 strides", zone: "Z2", plannedKm: 5.2 },
  { week: 3, date: "2026-07-04", day: "Sat", phase: "Base", type: "Long", title: "10k easy", zone: "Z2", plannedKm: 10.0 },
  { week: 4, date: "2026-07-07", day: "Tue", phase: "Base", type: "Easy", title: "35 min easy", zone: "Z2", plannedKm: 4.5 },
  { week: 4, date: "2026-07-09", day: "Thu", phase: "Base", type: "Easy", title: "35 min easy + 5 strides", zone: "Z2", plannedKm: 4.5 },
  { week: 4, date: "2026-07-11", day: "Sat", phase: "Base", type: "Long", title: "8k easy (cutback)", zone: "Z2", plannedKm: 8.0 },
  { week: 5, date: "2026-07-14", day: "Tue", phase: "Build", type: "Easy", title: "40 min easy", zone: "Z2", plannedKm: 5.2 },
  { week: 5, date: "2026-07-16", day: "Thu", phase: "Build", type: "Quality", title: "10 min WU, 12 min Z3, 10 min easy", zone: "Z1-Z3", plannedKm: 4.5 },
  { week: 5, date: "2026-07-18", day: "Sat", phase: "Build", type: "Long", title: "11k easy", zone: "Z2", plannedKm: 11.0 },
  { week: 6, date: "2026-07-21", day: "Tue", phase: "Build", type: "Easy", title: "45 min easy", zone: "Z2", plannedKm: 5.8 },
  { week: 6, date: "2026-07-23", day: "Thu", phase: "Build", type: "Quality", title: "WU, 2x8 min Z3 (3 min jog), CD", zone: "Z3", plannedKm: 5.5 },
  { week: 6, date: "2026-07-25", day: "Sat", phase: "Build", type: "Long", title: "13k easy", zone: "Z2", plannedKm: 13.0 },
  { week: 7, date: "2026-07-28", day: "Tue", phase: "Build", type: "Easy", title: "45 min easy", zone: "Z2", plannedKm: 5.8 },
  { week: 7, date: "2026-07-30", day: "Thu", phase: "Build", type: "Quality", title: "WU, 20 min Z3 tempo, CD", zone: "Z3", plannedKm: 5.5 },
  { week: 7, date: "2026-08-01", day: "Sat", phase: "Build", type: "Long", title: "15k easy", zone: "Z2", plannedKm: 15.0 },
  { week: 8, date: "2026-08-04", day: "Tue", phase: "Build", type: "Easy", title: "40 min easy", zone: "Z2", plannedKm: 5.2 },
  { week: 8, date: "2026-08-06", day: "Thu", phase: "Build", type: "Easy", title: "40 min easy + 5 strides (cutback)", zone: "Z2", plannedKm: 5.2 },
  { week: 8, date: "2026-08-08", day: "Sat", phase: "Build", type: "Long", title: "12k easy (cutback)", zone: "Z2", plannedKm: 12.0 },
  { week: 9, date: "2026-08-11", day: "Tue", phase: "Build", type: "Easy", title: "45 min easy", zone: "Z2", plannedKm: 5.8 },
  { week: 9, date: "2026-08-13", day: "Thu", phase: "Build", type: "Quality", title: "WU, 3x8 min low Z4 (3 min jog), CD", zone: "Z4", plannedKm: 6.5 },
  { week: 9, date: "2026-08-15", day: "Sat", phase: "Build", type: "Long", title: "16k easy", zone: "Z2", plannedKm: 16.0 },
  { week: 10, date: "2026-08-18", day: "Tue", phase: "Build", type: "Easy", title: "50 min easy", zone: "Z2", plannedKm: 6.5 },
  { week: 10, date: "2026-08-20", day: "Thu", phase: "Build", type: "Quality", title: "WU, 25 min Z3 tempo, CD", zone: "Z3", plannedKm: 6.0 },
  { week: 10, date: "2026-08-22", day: "Sat", phase: "Build", type: "Long", title: "17k: 13k easy + 4k at goal pace", zone: "Z2-Z3", plannedKm: 17.0 },
  { week: 11, date: "2026-08-25", day: "Tue", phase: "Peak", type: "Easy", title: "50 min easy", zone: "Z2", plannedKm: 6.5 },
  { week: 11, date: "2026-08-27", day: "Thu", phase: "Peak", type: "Quality", title: "WU, 4x6 min Z4 (2 min jog), CD", zone: "Z4", plannedKm: 6.5 },
  { week: 11, date: "2026-08-29", day: "Sat", phase: "Peak", type: "Long", title: "18k: 13k easy + 5k at goal pace", zone: "Z2-Z3", plannedKm: 18.0 },
  { week: 12, date: "2026-09-01", day: "Tue", phase: "Peak", type: "Easy", title: "45 min easy", zone: "Z2", plannedKm: 5.8 },
  { week: 12, date: "2026-09-03", day: "Thu", phase: "Peak", type: "Easy", title: "45 min easy + 5 strides (cutback)", zone: "Z2", plannedKm: 5.8 },
  { week: 12, date: "2026-09-05", day: "Sat", phase: "Peak", type: "Long", title: "14k easy (cutback)", zone: "Z2", plannedKm: 14.0 },
  { week: 13, date: "2026-09-08", day: "Tue", phase: "Peak", type: "Easy", title: "50 min easy", zone: "Z2", plannedKm: 6.5 },
  { week: 13, date: "2026-09-10", day: "Thu", phase: "Peak", type: "Quality", title: "WU, 30 min Z3 tempo, CD", zone: "Z3", plannedKm: 6.5 },
  { week: 13, date: "2026-09-12", day: "Sat", phase: "Peak", type: "Long", title: "19k: 14k easy + 5k at goal pace", zone: "Z2-Z3", plannedKm: 19.0 },
  { week: 14, date: "2026-09-15", day: "Tue", phase: "Peak", type: "Easy", title: "55 min easy", zone: "Z2", plannedKm: 7.1 },
  { week: 14, date: "2026-09-17", day: "Thu", phase: "Peak", type: "Quality", title: "WU, 3x10 min Z3-Z4 (3 min jog), CD", zone: "Z3-Z4", plannedKm: 7.2 },
  { week: 14, date: "2026-09-19", day: "Sat", phase: "Peak", type: "Long", title: "20k easy (steady last 3k if strong)", zone: "Z2", plannedKm: 20.0 },
  { week: 15, date: "2026-09-22", day: "Tue", phase: "Peak", type: "Easy", title: "50 min easy", zone: "Z2", plannedKm: 6.5 },
  { week: 15, date: "2026-09-24", day: "Thu", phase: "Peak", type: "Quality", title: "WU, 4x5 min at goal pace, CD", zone: "Z3", plannedKm: 6.0 },
  { week: 15, date: "2026-09-26", day: "Sat", phase: "Peak", type: "Long", title: "16k: 9k easy + 7k at goal pace", zone: "Z2-Z3", plannedKm: 16.0 },
  { week: 16, date: "2026-09-29", day: "Tue", phase: "Taper", type: "Easy", title: "45 min easy", zone: "Z2", plannedKm: 5.8 },
  { week: 16, date: "2026-10-01", day: "Thu", phase: "Taper", type: "Quality", title: "WU, 2x6 min Z3-Z4 (3 min jog), CD", zone: "Z3-Z4", plannedKm: 4.6 },
  { week: 16, date: "2026-10-03", day: "Sat", phase: "Taper", type: "Long", title: "13k easy", zone: "Z2", plannedKm: 13.0 },
  { week: 17, date: "2026-10-06", day: "Tue", phase: "Taper", type: "Easy", title: "30 min easy + 4 strides", zone: "Z2", plannedKm: 3.9 },
  { week: 17, date: "2026-10-08", day: "Thu", phase: "Taper", type: "Easy", title: "20 min easy + 3 strides", zone: "Z2", plannedKm: 2.6 },
  { week: 17, date: "2026-10-10", day: "Sat", phase: "Taper", type: "Shakeout", title: "4k shakeout + 3x1 min at goal pace", zone: "Z2-Z3", plannedKm: 4.0 },
  { week: 17, date: "2026-10-11", day: "Sun", phase: "Taper", type: "Race", title: "RACE 21.1k. Open easy in Z2, then settle to goal pace", zone: "Z2-Z3", plannedKm: 21.1 },
];

export const liloStrengthSessions: Seed[] = generateStrengthSessions(
  new Set(liloSessions.map((s) => s.date))
);
