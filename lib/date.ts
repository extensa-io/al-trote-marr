export function todayStr(tz = "America/Toronto"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function daysBetween(fromStr: string, toStr: string): number {
  const from = new Date(fromStr + "T00:00:00").getTime();
  const to = new Date(toStr + "T00:00:00").getTime();
  return Math.round((to - from) / 86_400_000);
}

export function formatNiceDate(dateStr: string, tz = "America/Toronto"): string {
  const date = new Date(dateStr + "T00:00:00");
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function relativeDays(daysAhead: number): string {
  if (daysAhead === 0) return "today";
  if (daysAhead === 1) return "tomorrow";
  if (daysAhead === -1) return "yesterday";
  if (daysAhead > 1) return `in ${daysAhead} days`;
  return `${Math.abs(daysAhead)} days ago`;
}
