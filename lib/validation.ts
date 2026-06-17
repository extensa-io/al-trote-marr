import type { Actual, Status } from "./types";

export const VALID_STATUS: Status[] = ["planned", "done", "skipped"];

export interface ActualInput {
  km?: unknown;
  avgHr?: unknown;
  durationMin?: unknown;
  notes?: unknown;
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const NOTES_MAX = 500;
const HR_MIN = 30;
const HR_MAX = 230;

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

  if (input.notes !== undefined && input.notes !== null && input.notes !== "") {
    if (typeof input.notes !== "string")
      return { ok: false, error: "notes must be a string" };
    const trimmed = input.notes.trim();
    if (trimmed.length > NOTES_MAX)
      return { ok: false, error: `notes must be ${NOTES_MAX} characters or fewer` };
    if (trimmed.length > 0) out.notes = trimmed;
  }

  return { ok: true, value: out };
}
