import type { Profile, Session } from "./types";
import { countdown, phaseStatus, streak, formatPercent, adherence4wk } from "./stats";

export interface DailyMessage {
  title: string;
  body: string;
}

// Composes the daily reminder from the same stats the dashboard shows.
// `today` is a YYYY-MM-DD string in America/Toronto.
export function buildDailyMessage(
  sessions: Session[],
  profile: Profile | null,
  today: string
): DailyMessage {
  const todays = sessions.find((s) => s.date === today) ?? null;

  const title = todays
    ? todays.type === "Race"
      ? `Race day: ${todays.title}`
      : `Today: ${todays.title} · ${todays.zone}`
    : "Rest day";

  const parts: string[] = [];

  if (profile) {
    const { phase, progress } = phaseStatus(sessions, today);
    if (phase) parts.push(`${phase} phase ${formatPercent(progress)}`);

    const { daysToRace } = countdown(profile, today);
    if (daysToRace > 0) parts.push(`${daysToRace} days to race`);
    else if (daysToRace === 0) parts.push("race is today");
  }

  const s = streak(sessions, today);
  if (s > 0) parts.push(`${s}-day streak`);

  const recent = adherence4wk(sessions, today);
  if (recent.due > 0) parts.push(`${formatPercent(recent.ratio)} adherence (4 wk)`);

  const body = parts.length ? parts.join(" · ") : "Open the app to see your plan.";

  return { title, body };
}
