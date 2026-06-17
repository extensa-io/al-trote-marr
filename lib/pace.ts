export function parseMmSs(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const match = /^(\d+):([0-5]\d)$/.exec(trimmed);
  if (!match) return null;
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  return minutes + seconds / 60;
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
