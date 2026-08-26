import { daysBetween, shiftDays } from "./date";
import { paceSecPerKm } from "./pace";
import type { Phase, Profile, Session } from "./types";

const EASY_TYPES = new Set(["Easy", "Long", "Kickoff", "Shakeout"]);
export const RACE_DISTANCE_KM = 21.0975;

// Strength sessions are tracked separately and must not reshape running metrics.
const isRunSession = (s: Session): boolean => s.type !== "Strength";

// A logged test effort: a deliberate hard run to measure current fitness. It is
// excluded from every easy-run metric, where a maximal effort reads as lost
// fitness or broken zone discipline, and it feeds the speed-based projection
// whatever session it was logged against.
export const isTestEffort = (s: Session): boolean => s.actual?.testEffort === true;

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

// Riegel's endurance model: T2 = T1 × (D2/D1)^1.06. The exponent is the
// standard published value and encodes that pace decays as distance grows,
// which flat pace extrapolation ignores.
const RIEGEL_EXPONENT = 1.06;

// How far back a run can be and still say something about current fitness.
const PROJECTION_WINDOW_DAYS = 42;

// Shortest efforts worth projecting from, per basis. Below these a single good
// or bad kilometre swings the whole projection.
const MIN_SPEED_SOURCE_KM = 3;
const MIN_ENDURANCE_SOURCE_KM = 8;

// Below this, a logged session is a marker rather than a run — a travel day
// ticked off, a walk, an abandoned start. Comparing its pace or efficiency to
// real runs produces confident nonsense, so it is excluded from every trend and
// comparison. It still counts as `done` for adherence and volume.
export const MIN_COMPARABLE_KM = 1;

// A projected half-marathon finish and the run it came from. `basis` is which
// side of fitness the source measures: "speed" from a quality/goal-pace effort,
// "endurance" from a long run. The two normally disagree, and the gap is the
// useful part — fast tempo with a slow long run means endurance is the limiter.
export interface RaceProjection {
  basis: "speed" | "endurance";
  paceSecPerKm: number; // projected race pace
  totalSeconds: number; // projected finish
  source: { date: string; type: string; title: string; km: number; paceSecPerKm: number };
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
      !isTestEffort(s) &&
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
        typeof s.actual?.avgHr === "number" &&
        s.actual!.km! >= MIN_COMPARABLE_KM &&
        !isTestEffort(s),
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

// Riegel-scale one completed effort to the half-marathon distance.
function projectFrom(session: Session, basis: RaceProjection["basis"]): RaceProjection | null {
  const km = session.actual?.km;
  const durationMin = session.actual?.durationMin;
  if (typeof km !== "number" || typeof durationMin !== "number") return null;

  const sourcePace = paceSecPerKm(km, durationMin);
  if (sourcePace == null) return null;

  const totalSeconds = durationMin * 60 * Math.pow(RACE_DISTANCE_KM / km, RIEGEL_EXPONENT);
  return {
    basis,
    paceSecPerKm: totalSeconds / RACE_DISTANCE_KM,
    totalSeconds,
    source: {
      date: session.date,
      type: session.type,
      title: session.title,
      km,
      paceSecPerKm: sourcePace,
    },
  };
}

// The best speed-based and endurance-based projections from the last six weeks
// ending `asOf`. Speed first. Either or both may be absent; "best" is the
// fastest projected finish, so one strong session isn't buried by a bad one.
export function raceProjections(sessions: Session[], asOf: string): RaceProjection[] {
  const windowStart = shiftDays(asOf, -(PROJECTION_WINDOW_DAYS - 1));
  const inWindow = sessions.filter(
    (s) =>
      s.status === "done" &&
      s.date >= windowStart &&
      s.date <= asOf &&
      typeof s.actual?.km === "number" &&
      typeof s.actual?.durationMin === "number",
  );

  const best = (
    eligible: Session[],
    basis: RaceProjection["basis"],
    minKm: number,
  ): RaceProjection | null => {
    const projected = eligible
      .filter((s) => (s.actual!.km as number) >= minKm)
      .map((s) => projectFrom(s, basis))
      .filter((p): p is RaceProjection => p !== null)
      .sort((a, b) => a.totalSeconds - b.totalSeconds);
    return projected[0] ?? null;
  };

  // A logged test effort counts as a speed source whatever session it landed
  // on: it is the most direct read of current fitness there is, and requiring it
  // to also be a Quality-typed session would mean the runner had to edit the
  // plan before they could measure themselves against it.
  const speed = best(
    inWindow.filter(
      (s) => isTestEffort(s) || s.type === "Quality" || /goal pace/i.test(s.title),
    ),
    "speed",
    MIN_SPEED_SOURCE_KM,
  );

  // A test effort is never an endurance source, even a long one: the endurance
  // basis assumes an aerobic pace it can extrapolate from, and a hard effort
  // would inflate it into a projection the runner has no aerobic evidence for.
  const endurance = best(
    inWindow.filter((s) => s.type === "Long" && !isTestEffort(s)),
    "endurance",
    MIN_ENDURANCE_SOURCE_KM,
  );

  return [speed, endurance].filter((p): p is RaceProjection => p !== null);
}

export interface PaceComparison {
  count: number;
  meanSecPerKm: number;
  bestSecPerKm: number;
  deltaVsMeanSec: number; // negative = faster than the recent mean
  isBest: boolean;
}

// How `run` compares on pace to the runs of the same type that preceded it.
// This is the comparison a recap can't make from the logged numbers alone.
export function paceVsRecentSameType(
  sessions: Session[],
  run: Session,
  limit = 5,
): PaceComparison | null {
  // A test effort has no comparable peers among the prescribed runs of its own
  // type, so there is nothing meaningful to say about the delta.
  if ((run.actual?.km ?? 0) < MIN_COMPARABLE_KM || isTestEffort(run)) return null;

  const runPace =
    run.actual?.km != null && run.actual?.durationMin != null
      ? paceSecPerKm(run.actual.km, run.actual.durationMin)
      : null;
  if (runPace == null) return null;

  const priorPaces = sessions
    .filter(
      (s) =>
        s.type === run.type &&
        s.date < run.date &&
        s.status === "done" &&
        typeof s.actual?.km === "number" &&
        typeof s.actual?.durationMin === "number" &&
        s.actual!.km! >= MIN_COMPARABLE_KM &&
        !isTestEffort(s),
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-limit)
    .map((s) => paceSecPerKm(s.actual!.km!, s.actual!.durationMin!))
    .filter((p): p is number => p != null);
  if (priorPaces.length === 0) return null;

  const mean = priorPaces.reduce((sum, p) => sum + p, 0) / priorPaces.length;
  const best = Math.min(...priorPaces);
  return {
    count: priorPaces.length,
    meanSecPerKm: mean,
    bestSecPerKm: best,
    deltaVsMeanSec: runPace - mean,
    isBest: runPace < best,
  };
}

export interface VolumeWindow {
  last7Km: number;
  last28Km: number;
  ratio: number | null; // last 7 vs the 28-day weekly average; >1.5 is a fast ramp
}

// Completed running km in the 7 and 28 days ending `date`, inclusive, with the
// acute-to-chronic ratio that says whether load is ramping or flat.
export function rollingVolume(sessions: Session[], date: string): VolumeWindow {
  const sum = (fromDays: number): number => {
    const start = shiftDays(date, -(fromDays - 1));
    return sessions
      .filter(
        (s) =>
          isRunSession(s) &&
          s.status === "done" &&
          s.date >= start &&
          s.date <= date &&
          typeof s.actual?.km === "number",
      )
      .reduce((total, s) => total + s.actual!.km!, 0);
  };

  const last7Km = round1(sum(7));
  const last28Km = round1(sum(28));
  const chronicWeekly = last28Km / 4;
  return {
    last7Km,
    last28Km,
    ratio: chronicWeekly > 0 ? last7Km / chronicWeekly : null,
  };
}

// The furthest single run completed on or before `date`. The reference point for
// whether a long run is new territory or a repeat.
export function longestCompletedRun(
  sessions: Session[],
  date: string,
): { date: string; km: number } | null {
  const runs = sessions
    .filter(
      (s) =>
        isRunSession(s) &&
        s.status === "done" &&
        s.date <= date &&
        typeof s.actual?.km === "number",
    )
    .sort((a, b) => b.actual!.km! - a.actual!.km!);
  return runs.length ? { date: runs[0].date, km: runs[0].actual!.km! } : null;
}

export interface EfficiencyTrend {
  current: number;
  priorMean: number;
  changePct: number; // positive = more speed per heartbeat than the recent mean
  sampleSize: number;
}

// This run's aerobic efficiency against the mean of the runs of the same type
// before it. Efficiency (m/s per bpm) is the one figure that separates "ran
// faster" from "got fitter", since it holds heart rate against pace.
//
// Same type only, deliberately: `aerobicEfficiency` pools every easy-ish type
// for the dashboard trend line, but a 5 km easy run and a 14 km long run sit at
// different paces and heart rates, so pooling them makes a per-run comparison
// swing on which types happen to be in the window rather than on fitness.
export function efficiencyTrend(
  sessions: Session[],
  date: string,
  limit = 6,
): EfficiencyTrend | null {
  const points = aerobicEfficiency(sessions);
  const current = points.find((p) => p.date === date);
  if (!current) return null;

  const runType = sessions.find((s) => s.date === date)?.type;
  const typeByDate = new Map(sessions.map((s) => [s.date, s.type]));
  const prior = points
    .filter((p) => p.date < date && typeByDate.get(p.date) === runType)
    .slice(-limit);
  if (prior.length === 0) return null;

  const priorMean = prior.reduce((sum, p) => sum + p.efficiency, 0) / prior.length;
  if (priorMean <= 0) return null;
  return {
    current: current.efficiency,
    priorMean,
    changePct: ((current.efficiency - priorMean) / priorMean) * 100,
    sampleSize: prior.length,
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
