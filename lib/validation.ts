import type { Actual, Status } from "./types";

export const VALID_STATUS: Status[] = ["planned", "done", "skipped"];

export interface ActualInput {
  km?: unknown;
  avgHr?: unknown;
  durationMin?: unknown;
  weightKg?: unknown;
  notes?: unknown;
  testEffort?: unknown;
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const NOTES_MAX = 500;
const TRAINING_CONTEXT_MAX = 1000;
const ZONES_SOURCE_MAX = 500;
const HR_MIN = 30;
const HR_MAX = 230;
const WEIGHT_MIN = 30;
const WEIGHT_MAX = 300;

function asFiniteNumber(input: unknown): number | null {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input === "string" && input.trim() !== "") {
    const n = Number(input);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function validateStatus(input: unknown): ValidationResult<Status> {
  if (typeof input !== "string" || !(VALID_STATUS as string[]).includes(input))
    return { ok: false, error: "invalid status" };
  return { ok: true, value: input as Status };
}

export interface ProfileContextInput {
  trainingContext?: unknown;
  zonesSource?: unknown;
}

// The two free-text profile fields that shape how the AI surfaces read the
// runner's numbers. An empty string is a deliberate clear, not an omission, so
// both are returned as strings and the caller decides between `$set` and
// `$unset` — unlike `validateActual`, where empty means "leave alone".
export function validateProfileContext(
  input: ProfileContextInput
): ValidationResult<{ trainingContext: string; zonesSource: string }> {
  const field = (value: unknown, label: string, max: number): ValidationResult<string> => {
    if (value === undefined || value === null) return { ok: true, value: "" };
    if (typeof value !== "string") return { ok: false, error: `${label} must be text` };
    const trimmed = value.trim();
    if (trimmed.length > max)
      return { ok: false, error: `${label} must be ${max} characters or fewer` };
    return { ok: true, value: trimmed };
  };

  const training = field(input.trainingContext, "Training context", TRAINING_CONTEXT_MAX);
  if (!training.ok) return training;
  const zones = field(input.zonesSource, "Zone source", ZONES_SOURCE_MAX);
  if (!zones.ok) return zones;

  return { ok: true, value: { trainingContext: training.value, zonesSource: zones.value } };
}

// A target finish time, entered as "3:20" or "3:20:00". Returns the stored pair:
// the goal string every prompt reads, and the pace it implies over the race
// distance. Deriving the pace rather than asking for it is the point — the two
// were free to disagree before, and a goal pace nobody could hold is what made
// the plan prescribe unrunnable sessions.
export function validateGoalTime(
  input: unknown,
  raceDistanceKm: number
): ValidationResult<{ goal: string; goalPaceSecPerKm: number }> {
  if (typeof input !== "string" || !input.trim())
    return { ok: false, error: "enter a target time like 3:20" };

  const parts = input.trim().split(":");
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d{1,2}$/.test(p)))
    return { ok: false, error: "use h:mm or h:mm:ss" };

  const [h, m, s = "0"] = parts;
  if (Number(m) > 59 || Number(s) > 59)
    return { ok: false, error: "minutes and seconds must be under 60" };

  const totalSeconds = Number(h) * 3600 + Number(m) * 60 + Number(s);
  if (totalSeconds < 3600 || totalSeconds > 8 * 3600)
    return { ok: false, error: "target must be between 1 and 8 hours" };

  const label = `sub-${h}:${m.padStart(2, "0")}${Number(s) ? `:${s.padStart(2, "0")}` : ""}`;
  return {
    ok: true,
    value: { goal: label, goalPaceSecPerKm: Math.round(totalSeconds / raceDistanceKm) },
  };
}

export function validateActual(input: ActualInput): ValidationResult<Actual> {
  const out: Actual = {};

  if (input.km !== undefined && input.km !== null && input.km !== "") {
    const km = asFiniteNumber(input.km);
    if (km == null || km <= 0) return { ok: false, error: "km must be a positive number" };
    out.km = km;
  }

  if (input.avgHr !== undefined && input.avgHr !== null && input.avgHr !== "") {
    const avgHr = asFiniteNumber(input.avgHr);
    if (avgHr == null || avgHr < HR_MIN || avgHr > HR_MAX)
      return { ok: false, error: `avgHr must be between ${HR_MIN} and ${HR_MAX}` };
    out.avgHr = avgHr;
  }

  if (input.durationMin !== undefined && input.durationMin !== null && input.durationMin !== "") {
    const durationMin = asFiniteNumber(input.durationMin);
    if (durationMin == null || durationMin <= 0)
      return { ok: false, error: "durationMin must be a positive number" };
    out.durationMin = durationMin;
  }

  if (input.weightKg !== undefined && input.weightKg !== null && input.weightKg !== "") {
    const weightKg = asFiniteNumber(input.weightKg);
    if (weightKg == null || weightKg < WEIGHT_MIN || weightKg > WEIGHT_MAX)
      return { ok: false, error: `weightKg must be between ${WEIGHT_MIN} and ${WEIGHT_MAX}` };
    out.weightKg = weightKg;
  }

  if (input.notes !== undefined && input.notes !== null && input.notes !== "") {
    if (typeof input.notes !== "string")
      return { ok: false, error: "notes must be a string" };
    const trimmed = input.notes.trim();
    if (trimmed.length > NOTES_MAX)
      return { ok: false, error: `notes must be ${NOTES_MAX} characters or fewer` };
    if (trimmed.length > 0) out.notes = trimmed;
  }

  // Only ever stored when true: an absent flag and an explicit false mean the
  // same thing, and omitting it keeps the stored document clean.
  if (input.testEffort === true || input.testEffort === "true") {
    out.testEffort = true;
  } else if (
    input.testEffort !== undefined &&
    input.testEffort !== null &&
    input.testEffort !== "" &&
    input.testEffort !== false &&
    input.testEffort !== "false"
  ) {
    return { ok: false, error: "testEffort must be a boolean" };
  }

  return { ok: true, value: out };
}
