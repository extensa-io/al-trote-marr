export function todayStr(tz = "America/Toronto"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function daysBetween(fromStr: string, toStr: string): number {
  const from = Date.parse(fromStr + "T00:00:00Z");
  const to = Date.parse(toStr + "T00:00:00Z");
  return Math.round((to - from) / 86_400_000);
}

export function formatNiceDate(dateStr: string): string {
  // Treat YYYY-MM-DD as a calendar date; format in UTC so the day matches the string verbatim.
  const date = new Date(dateStr + "T00:00:00Z");
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
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
