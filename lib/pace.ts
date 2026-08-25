// --- Duration entry ---
//
// Durations are entered as a bare stream of digits, read right to left: the
// last two are seconds, the two before that minutes, anything left is hours.
// A mobile numeric keypad exposes no colon, so any separator-based format has
// to abuse the decimal key; typing only digits sidesteps that entirely and,
// unlike a minutes-only field, needs no mental arithmetic for a run over an
// hour. `2845` is 28:45 and `12832` is 1:28:32.
//
// The raw digit string is what the input holds; these three functions convert
// between it, the grouped text shown in the field, and the stored minutes.

const MAX_DURATION_DIGITS = 6; // 99:59:59

// Keep only digits and drop leading zeros, so backspacing empties the field
// instead of sticking on a padded "0:00".
export function normalizeDurationDigits(input: string): string {
  return input.replace(/\D/g, "").replace(/^0+/, "").slice(0, MAX_DURATION_DIGITS);
}

// Split a digit string into h/m/s parts, right to left. Parts are positional
// and NOT normalized: a half-typed "284" yields 2:84, which reads back as what
// was actually typed. Rollover happens when it is converted to minutes.
function splitDigits(digits: string): { hh: string; mm: string; ss: string } {
  const padded = digits.padStart(3, "0");
  const ss = padded.slice(-2);
  const rest = padded.slice(0, -2);
  return { hh: rest.slice(0, -2), mm: rest.slice(-2), ss };
}

// The text shown in the field as the digits are typed.
export function groupDurationDigits(digits: string): string {
  if (!digits) return "";
  const { hh, mm, ss } = splitDigits(digits);
  return hh ? `${hh}:${mm.padStart(2, "0")}:${ss}` : `${Number(mm)}:${ss}`;
}

// Digits to stored minutes. Seconds and minutes above 59 roll over rather than
// being rejected, so a typo like 2:84 saves as 3:24 instead of blocking the log.
export function durationDigitsToMinutes(digits: string): number | null {
  if (!digits) return null;
  const { hh, mm, ss } = splitDigits(digits);
  const totalSeconds = Number(hh || "0") * 3600 + Number(mm) * 60 + Number(ss);
  return totalSeconds > 0 ? totalSeconds / 60 : null;
}

// Stored minutes back to digits, for pre-filling the form when editing a log.
export function minutesToDurationDigits(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return "";
  const totalSeconds = Math.round(totalMinutes * 60);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return normalizeDurationDigits(h ? `${h}${pad(m)}${pad(s)}` : `${m}${pad(s)}`);
}

// Display form for a stored duration: h:mm:ss past an hour, m:ss below it.
export function formatDuration(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) return "0:00";
  const totalSeconds = Math.round(totalMinutes * 60);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function paceSecPerKm(km: number, durationMin: number): number | null {
  if (!Number.isFinite(km) || !Number.isFinite(durationMin)) return null;
  if (km <= 0 || durationMin <= 0) return null;
  return (durationMin * 60) / km;
}

export function formatPace(secPerKm: number | null): string {
  if (secPerKm == null || !Number.isFinite(secPerKm) || secPerKm <= 0) return "—";
  const totalSeconds = Math.round(secPerKm);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}/km`;
}
