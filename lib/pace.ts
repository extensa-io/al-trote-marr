// Accepts mm:ss, mm.ss, mm,ss, "mm ss", or a bare whole-minute count.
// The separator is flexible because mobile numeric keypads have no colon;
// the decimal/comma key is the only separator they expose. Returns minutes.
export function parseMmSs(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const tokens = trimmed.split(/[:.,\s]+/);

  if (tokens.length === 1) {
    if (!/^\d+$/.test(tokens[0])) return null;
    return Number(tokens[0]);
  }

  if (tokens.length === 2) {
    const [m, s] = tokens;
    if (!/^\d+$/.test(m) || !/^\d{1,2}$/.test(s)) return null;
    const seconds = Number(s);
    if (seconds > 59) return null;
    return Number(m) + seconds / 60;
  }

  return null;
}

export function formatMmSs(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) return "0:00";
  const totalSeconds = Math.round(totalMinutes * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
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
