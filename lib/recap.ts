import Anthropic from "@anthropic-ai/sdk";
import {
  getDailySummary,
  getProfile,
  listSessions,
  upsertDailySummary,
} from "./db";
import { formatPace, paceSecPerKm } from "./pace";
import { hrTargetForZone } from "./prescription";
import { countdown, formatPercent, phaseStatus } from "./stats";
import type { Profile, Session } from "./types";

export const RECAP_MODEL = "claude-opus-4-8";

const SYSTEM_PROMPT = `You write a recap of one run a runner just logged, shown on the home screen of their half-marathon training app. It replaces the daily progress note until the next morning's note arrives.

Respond with a single JSON object and nothing else, in this exact shape:
{"recap": string, "insights": string[], "suggestions": string[]}

- recap: 2 to 3 sentences in English summarizing how this run went against its prescription and where it leaves the runner in the plan.
- insights: 2 to 4 short, specific observations grounded in the numbers provided (pacing, heart-rate vs target zone, effort, how it compares to recent similar runs, the runner's own notes). Each is a brief phrase, not a sentence.
- suggestions: 1 to 3 short, actionable pointers for what to do next.

Ground every claim in the data given; never invent numbers. If the runner left a note, use what it reveals (how it felt, niggles, conditions). Voice: plain, warm, encouraging, like a knowledgeable coach. No hype, no clichés, no emoji. Use ordinary running language only; never use military, drill, or boot-camp vocabulary. No markdown anywhere in the strings.`;

export interface RecapContent {
  recap: string;
  insights: string[];
  suggestions: string[];
}

// Assembles the data context for the recap of the run on `runDate`. `runDate`
// is YYYY-MM-DD in America/Toronto. Returns null when that session isn't a
// logged (done) run.
export function buildRecapPrompt(
  sessions: Session[],
  profile: Profile,
  runDate: string
): string | null {
  const run = sessions.find((s) => s.date === runDate);
  if (!run || run.type === "Strength" || run.status !== "done") return null;

  const lines: string[] = [];

  const { daysToRace, weeksToRace } = countdown(profile, runDate);
  lines.push(
    `Race: ${profile.raceName} on ${profile.raceDate} (${daysToRace} days / ${weeksToRace} weeks away). Goal: ${profile.goal}.`
  );

  const { phase, progress } = phaseStatus(sessions, runDate);
  if (phase) lines.push(`Current phase: ${phase}, ${formatPercent(progress)} through it.`);

  lines.push("");
  lines.push("The run just logged:");
  lines.push(
    `${run.date} ${run.type} (${run.zone}) — ${run.title}. Planned ${run.plannedKm} km.`
  );

  const a = run.actual;
  const detail: string[] = [];
  if (a?.km != null) detail.push(`distance ${a.km} km`);
  if (a?.durationMin != null) {
    const mins = Math.floor(a.durationMin);
    const secs = Math.round((a.durationMin - mins) * 60);
    detail.push(`duration ${mins}m${secs ? ` ${secs}s` : ""}`);
  }
  if (a?.km != null && a?.durationMin != null) {
    detail.push(`pace ${formatPace(paceSecPerKm(a.km, a.durationMin))}`);
  }
  if (a?.avgHr != null) {
    const target = hrTargetForZone(run.zone, profile.zones);
    detail.push(`avg HR ${a.avgHr} bpm${target ? ` (zone target ${target})` : ""}`);
  }
  if (a?.weightKg != null) detail.push(`weight ${a.weightKg} kg`);
  lines.push(detail.length ? `Logged: ${detail.join(", ")}.` : "Logged: marked done, no stats entered.");
  if (a?.notes) lines.push(`Runner's note: "${a.notes}"`);

  // Recent runs of the same type before this one, for comparison.
  const priorSameType = sessions
    .filter(
      (s) =>
        s.type === run.type &&
        s.date < runDate &&
        s.status === "done" &&
        typeof s.actual?.km === "number"
    )
    .slice(-3);
  if (priorSameType.length) {
    lines.push("");
    lines.push(`Recent ${run.type} runs for comparison:`);
    for (const s of priorSameType) {
      const parts = [`${s.date}`];
      const sa = s.actual!;
      if (sa.km != null) parts.push(`${sa.km} km`);
      if (sa.km != null && sa.durationMin != null) {
        parts.push(formatPace(paceSecPerKm(sa.km, sa.durationMin)));
      }
      if (sa.avgHr != null) parts.push(`${sa.avgHr} bpm`);
      lines.push(parts.join(", "));
    }
  }

  return lines.join("\n");
}

// Strip an optional ```json ... ``` fence the model may wrap the object in.
function unfence(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return (fenced ? fenced[1] : text).trim();
}

function parseRecap(raw: string): RecapContent {
  try {
    const obj = JSON.parse(unfence(raw)) as Partial<RecapContent>;
    const asList = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
    const recap = typeof obj.recap === "string" ? obj.recap.trim() : "";
    if (recap) {
      return { recap, insights: asList(obj.insights), suggestions: asList(obj.suggestions) };
    }
  } catch {
    // fall through to plain-text fallback
  }
  return { recap: raw.trim(), insights: [], suggestions: [] };
}

// Calls Claude to produce the recap. Throws if ANTHROPIC_API_KEY is missing or
// the API call fails; callers handle that.
export async function generateRecap(
  sessions: Session[],
  profile: Profile,
  runDate: string
): Promise<RecapContent | null> {
  const prompt = buildRecapPrompt(sessions, profile, runDate);
  if (!prompt) return null;

  const client = new Anthropic();
  const response = await client.messages.create({
    model: RECAP_MODEL,
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

  return text ? parseRecap(text) : null;
}

export type RecapOutcome =
  | "generated"
  | "exists"
  | "no-profile"
  | "no-run"
  | "no-data";

// Owner-scoped orchestration: load the plan, generate the recap for the run on
// `runDate`, and store it under that date. Idempotent on the session's
// updatedAt unless `force` is set, so a re-render that re-triggers generation
// does not re-bill; editing the logged run bumps updatedAt and forces a regen.
export async function generateAndStoreRecap(
  owner: string,
  runDate: string,
  opts: { force?: boolean } = {}
): Promise<RecapOutcome> {
  const [profile, sessions] = await Promise.all([
    getProfile(owner),
    listSessions(owner),
  ]);
  if (!profile) return "no-profile";

  const run = sessions.find((s) => s.date === runDate);
  if (!run || run.type === "Strength" || run.status !== "done") return "no-run";

  if (!opts.force) {
    const existing = await getDailySummary(owner, runDate);
    if (existing?.kind === "recap" && existing.runUpdatedAt === run.updatedAt) {
      return "exists";
    }
  }

  const content = await generateRecap(sessions, profile, runDate);
  if (!content) return "no-data";

  await upsertDailySummary({
    ownerEmail: owner,
    date: runDate,
    kind: "recap",
    text: content.recap,
    insights: content.insights,
    suggestions: content.suggestions,
    runUpdatedAt: run.updatedAt,
    model: RECAP_MODEL,
    createdAt: new Date().toISOString(),
  });
  return "generated";
}
