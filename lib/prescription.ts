import type { Zone } from "./types";

// Derive a target HR range (bpm) from a zone label and the runner's zones.
// Handles single labels ("Z2") and ranges ("Z2-Z3", "Z1-Z3"). Returns null
// when the label has no zone (e.g. Strength) or no matching zone is found.
export function hrTargetForZone(zone: string, zones: Zone[]): string | null {
  const nums = (zone.match(/\d+/g) ?? []).map(Number);
  if (nums.length === 0) return null;

  const low = zones.find((z) => z.z === Math.min(...nums));
  const high = zones.find((z) => z.z === Math.max(...nums));
  if (!low || !high) return null;

  return `${low.min}–${high.max} bpm`;
}

// Count of strides prescribed in a title like "30 min easy + 4 strides".
export function stridesFromTitle(title: string): number | null {
  const match = title.match(/(\d+)\s*strides/i);
  return match ? Number(match[1]) : null;
}
