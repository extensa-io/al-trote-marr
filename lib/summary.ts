import Anthropic from "@anthropic-ai/sdk";
import {
  getDailySummary,
  getProfile,
  listSessions,
  upsertDailySummary,
} from "./db";
import { formatPace, paceSecPerKm } from "./pace";
import {
  adherence4wk,
  adherenceOverall,
  aerobicEfficiency,
  countdown,
  formatPercent,
  phaseStatus,
  streak,
  weeklyVolume,
  zoneAdherence,
} from "./stats";
import type { Profile, Session } from "./types";

export const SUMMARY_MODEL = "claude-opus-4-8";

const SYSTEM_PROMPT = `You write a short daily progress note for one runner training for a half marathon, shown on the home screen of their training app.

Write 4 to 6 sentences in English. Cover where they stand in the plan, how their recent training has gone (adherence, volume versus plan, aerobic trend, easy-day discipline), and one specific, actionable thing to focus on next. Ground every claim in the numbers provided; do not invent data. If recent logs include the runner's own notes, weave in what they reveal (how a session felt, niggles, conditions).

Voice: plain, warm, and encouraging, like a knowledgeable coach. No hype, no clichés, no emoji. Use ordinary running language only: never use military, drill, or boot-camp vocabulary. Output the note as plain prose with no heading, no bullet points, and no markdown.`;

// Assembles the data context the model writes from. `today` is YYYY-MM-DD in
// America/Toronto. Returns null when there is not enough to say anything useful.
export function buildSummaryPrompt(
  sessions: Session[],
  profile: Profile,
  today: string
): string | null {
  // Strength is tracked separately; the running note ignores it.
  const runs = sessions.filter((s) => s.type !== "Strength");
  const due = runs.filter((s) => s.date <= today);
  if (due.length === 0) return null;

  const lines: string[] = [];

  const { daysToRace, weeksToRace } = countdown(profile, today);
  lines.push(
    `Race: ${profile.raceName} on ${profile.raceDate} (${daysToRace} days / ${weeksToRace} weeks away). Goal: ${profile.goal}.`
  );

  const { phase, progress } = phaseStatus(sessions, today);
  if (phase) lines.push(`Current phase: ${phase}, ${formatPercent(progress)} through it.`);

  const overall = adherenceOverall(sessions, today);
  const recent = adherence4wk(sessions, today);
  lines.push(
    `Adherence overall: ${overall.done}/${overall.due} (${formatPercent(overall.ratio)}). Last 4 weeks: ${recent.done}/${recent.due} (${formatPercent(recent.ratio)}).`
  );
  lines.push(`Current done streak: ${streak(sessions, today)} sessions.`);

  const weeks = weeklyVolume(runs).filter((w) =>
    runs.some((s) => s.week === w.week && s.date <= today)
  );
  const recentWeeks = weeks.slice(-4);
  if (recentWeeks.length) {
    lines.push(
      `Weekly km (planned vs done), recent weeks: ${recentWeeks
        .map((w) => `W${w.week} ${w.planned}/${w.actual}`)
        .join(", ")}.`
    );
  }

  const zone = zoneAdherence(sessions, profile);
  if (zone) {
    lines.push(
      `Easy-run aerobic discipline: ${zone.adherent}/${zone.total} easy runs kept HR at or below Z2 max (${zone.z2Max} bpm).`
    );
  }

  const eff = aerobicEfficiency(sessions);
  if (eff.length >= 2) {
    const first = eff[0];
    const last = eff[eff.length - 1];
    const change = ((last.efficiency - first.efficiency) / first.efficiency) * 100;
    lines.push(
      `Aerobic efficiency (m/s per bpm) over ${eff.length} logged easy runs: ${first.efficiency.toFixed(4)} → ${last.efficiency.toFixed(4)} (${change >= 0 ? "+" : ""}${change.toFixed(1)}%).`
    );
  }

  const logged = due
    .filter((s) => s.status === "done" || s.status === "skipped")
    .slice(-8);
  if (logged.length) {
    lines.push("");
    lines.push("Recent sessions:");
    for (const s of logged) {
      const parts = [`${s.date} ${s.type} (${s.zone}) — ${s.status}`];
      const a = s.actual;
      if (a?.km != null) parts.push(`${a.km} km`);
      if (a?.km != null && a?.durationMin != null) {
        parts.push(formatPace(paceSecPerKm(a.km, a.durationMin)));
      }
      if (a?.avgHr != null) parts.push(`${a.avgHr} bpm`);
      let line = parts.join(", ");
      if (a?.notes) line += ` — note: "${a.notes}"`;
      lines.push(line);
    }
  }

  const todays = runs.find((s) => s.date === today);
  lines.push("");
  lines.push(
    todays
      ? `Today's session: ${todays.type} (${todays.zone}) — ${todays.title}, planned ${todays.plannedKm} km.`
      : "Today is a rest or strength day (no run)."
  );

  return lines.join("\n");
}

// Calls Claude to produce the note. Throws if ANTHROPIC_API_KEY is missing or
// the API call fails; callers handle that per owner.
export async function generateDailySummary(
  sessions: Session[],
  profile: Profile,
  today: string
): Promise<string | null> {
  const prompt = buildSummaryPrompt(sessions, profile, today);
  if (!prompt) return null;

  const client = new Anthropic();
  const response = await client.messages.create({
    model: SUMMARY_MODEL,
    max_tokens: 1024,
    thinking: { type: "adaptive" },
    output_config: { effort: "low" },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  return text || null;
}

export type SummaryOutcome =
  | "generated"
  | "exists"
  | "no-profile"
  | "no-data";

// Owner-scoped orchestration: load the runner's plan, generate the note, and
// store it. Idempotent per date unless `force` is set, so a re-run of the daily
// cron does not re-bill. Used by the cron and the dev trigger.
export async function generateAndStoreSummary(
  owner: string,
  today: string,
  opts: { force?: boolean } = {}
): Promise<SummaryOutcome> {
  if (!opts.force && (await getDailySummary(owner, today))) return "exists";

  const [profile, sessions] = await Promise.all([
    getProfile(owner),
    listSessions(owner),
  ]);
  if (!profile) return "no-profile";

  const text = await generateDailySummary(sessions, profile, today);
  if (!text) return "no-data";

  await upsertDailySummary({
    ownerEmail: owner,
    date: today,
    text,
    model: SUMMARY_MODEL,
    createdAt: new Date().toISOString(),
  });
  return "generated";
}
