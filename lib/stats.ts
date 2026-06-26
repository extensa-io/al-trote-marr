import { daysBetween, shiftDays } from "./date";
import { paceSecPerKm } from "./pace";
import type { Phase, Profile, Session } from "./types";

const EASY_TYPES = new Set(["Easy", "Long", "Kickoff", "Shakeout"]);
const RACE_DISTANCE_KM = 21.0975;

// Strength sessions are tracked separately and must not reshape running metrics.
const isRunSession = (s: Session): boolean => s.type !== "Strength";

export interface Countdown {
  daysToRace: number;
  weeksToRace: number;
}

export interface PhaseStatus {
  phase: Phase | null;
  progress: number; // 0..1
}

export interface AdherenceCounts {
  done: number;
  due: number;
  ratio: number;
}

export interface WeekVolume {
  week: number;
  planned: number;
  actual: number;
}

export interface CumulativePoint {
  date: string;
  planned: number;
  actual: number | null;
}

export interface LongRunPoint {
  week: number;
  date: string;
  planned: number;
  actual: number | null;
}

export interface ZoneAdherence {
  adherent: number;
  total: number;
  ratio: number;
  z2Max: number;
}

export interface EfficiencyPoint {
  date: string;
  efficiency: number;
}

export interface WeightPoint {
  date: string;
  weightKg: number;
}

export interface EstimatedFinish {
  paceSecPerKm: number;
  totalSeconds: number;
  source: { date: string; type: string; title: string };
}

export function countdown(profile: Profile, today: string): Countdown {
  const days = Math.max(0, daysBetween(today, profile.raceDate));
  return { daysToRace: days, weeksToRace: Math.ceil(days / 7) };
}

export function phaseStatus(sessions: Session[], today: string): PhaseStatus {
  sessions = sessions.filter(isRunSession);
  if (sessions.length === 0) return { phase: null, progress: 0 };
  const past = sessions.filter((s) => s.date <= today);
  const phase = past.length ? past[past.length - 1].phase : sessions[0].phase;
  const inPhase = sessions.filter((s) => s.phase === phase);
  if (inPhase.length === 0) return { phase, progress: 0 };
  const done = inPhase.filter((s) => s.date <= today).length;
  return { phase, progress: done / inPhase.length };
}

export function adherenceOverall(sessions: Session[], today: string): AdherenceCounts {
  sessions = sessions.filter(isRunSession);
  const due = sessions.filter((s) => s.date <= today);
  const done = due.filter((s) => s.status === "done").length;
  return { done, due: due.length, ratio: due.length === 0 ? 0 : done / due.length };
}

export function adherence4wk(sessions: Session[], today: string): AdherenceCounts {
  sessions = sessions.filter(isRunSession);
  const windowStart = shiftDays(today, -27); // inclusive 28-day window ending today
  const due = sessions.filter((s) => s.date >= windowStart && s.date <= today);
  const done = due.filter((s) => s.status === "done").length;
  return { done, due: due.length, ratio: due.length === 0 ? 0 : done / due.length };
}

export function streak(sessions: Session[], today: string): number {
  const due = sessions
    .filter((s) => isRunSession(s) && s.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date));
  let count = 0;
  for (const s of due) {
    if (s.status === "done") count++;
    else break;
  }
  return count;
}

export function weeklyVolume(sessions: Session[]): WeekVolume[] {
  const map = new Map<number, WeekVolume>();
  for (const s of sessions.filter(isRunSession)) {
    const entry = map.get(s.week) ?? { week: s.week, planned: 0, actual: 0 };
    entry.planned += s.plannedKm;
    if (s.status === "done" && typeof s.actual?.km === "number") entry.actual += s.actual.km;
    map.set(s.week, entry);
  }
  return Array.from(map.values()).sort((a, b) => a.week - b.week);
}

export function cumulativeKm(sessions: Session[]): CumulativePoint[] {
  const ordered = sessions.filter(isRunSession).sort((a, b) => a.date.localeCompare(b.date));
  let plannedSum = 0;
  let actualSum = 0;
  let started = false;
  const out: CumulativePoint[] = [];
  for (const s of ordered) {
    plannedSum += s.plannedKm;
    if (s.status === "done" && typeof s.actual?.km === "number") {
      actualSum += s.actual.km;
      started = true;
    }
    out.push({
      date: s.date,
      planned: round1(plannedSum),
      actual: started ? round1(actualSum) : null,
    });
  }
  return out;
}

export function longRunProgression(sessions: Session[]): LongRunPoint[] {
  return sessions
    .filter((s) => s.type === "Long" || s.type === "Race")
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => ({
      week: s.week,
      date: s.date,
      planned: s.plannedKm,
      actual: s.status === "done" && typeof s.actual?.km === "number" ? s.actual.km : null,
    }));
}

export function zoneAdherence(sessions: Session[], profile: Profile): ZoneAdherence | null {
  const z2 = profile.zones.find((z) => z.z === 2);
  if (!z2) return null;
  const easyLogged = sessions.filter(
    (s) =>
      s.status === "done" &&
      EASY_TYPES.has(s.type) &&
      typeof s.actual?.avgHr === "number",
  );
  if (easyLogged.length === 0) return null;
  const adherent = easyLogged.filter((s) => (s.actual?.avgHr ?? Infinity) <= z2.max).length;
  return {
    adherent,
    total: easyLogged.length,
    ratio: adherent / easyLogged.length,
    z2Max: z2.max,
  };
}

export function aerobicEfficiency(sessions: Session[]): EfficiencyPoint[] {
  return sessions
    .filter(
      (s) =>
        s.status === "done" &&
        EASY_TYPES.has(s.type) &&
        typeof s.actual?.km === "number" &&
        typeof s.actual?.durationMin === "number" &&
        typeof s.actual?.avgHr === "number",
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => {
      const a = s.actual!;
      const metersPerSecond = (a.km! * 1000) / (a.durationMin! * 60);
      return { date: s.date, efficiency: metersPerSecond / a.avgHr! };
    });
}

export function weightTrend(sessions: Session[]): WeightPoint[] {
  return sessions
    .filter((s) => typeof s.actual?.weightKg === "number")
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => ({ date: s.date, weightKg: s.actual!.weightKg! }));
}

export function estimatedFinish(sessions: Session[]): EstimatedFinish | null {
  const eligible = sessions
    .filter(
      (s) =>
        s.status === "done" &&
        (s.type === "Quality" || /goal pace/i.test(s.title)) &&
        typeof s.actual?.km === "number" &&
        typeof s.actual?.durationMin === "number",
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const latest = eligible[0];
  if (!latest) return null;
  const pace = paceSecPerKm(latest.actual!.km!, latest.actual!.durationMin!);
  if (pace == null) return null;
  return {
    paceSecPerKm: pace,
    totalSeconds: pace * RACE_DISTANCE_KM,
    source: { date: latest.date, type: latest.type, title: latest.title },
  };
}

export function formatHms(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "—";
  const total = Math.round(totalSeconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
