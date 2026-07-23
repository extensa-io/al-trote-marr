import Anthropic from "@anthropic-ai/sdk";
import {
  getProfile,
  listSessions,
  rebuildFutureSessions,
  type RebuildUpdate,
} from "./db";
import { todayStr } from "./date";
import { formatPace, paceSecPerKm } from "./pace";
import {
  adherenceOverall,
  countdown,
  formatPercent,
  phaseStatus,
  weeklyVolume,
} from "./stats";
import type { Phase, Profile, Session } from "./types";

export const REBUILD_MODEL = "claude-opus-4-8";

const PHASES: ReadonlyArray<Phase> = ["Base", "Build", "Peak", "Taper"];
// Types the rebuild may assign to a rewritten session. Race is fixed and never
// in the rewrite set; Kickoff only ever labelled the plan's first run.
const REWRITE_TYPES = new Set(["Easy", "Quality", "Long", "Shakeout"]);

const SYSTEM_PROMPT = `You are a running coach rebuilding the remainder of a half-marathon training plan for one runner. Their earlier plan ran ahead of their real fitness, so you re-scale the upcoming weeks to what the runner has actually been doing while still arriving race-ready.

You are given a fixed list of upcoming training dates (the runner's own running days) and must return exactly one workout for each date, keeping every date as given. Do not add, drop, or move dates. The race itself is fixed and is not in your list; everything you write builds toward it.

Respond with a single JSON object and nothing else, in this exact shape:
{"sessions": [{"date": "YYYY-MM-DD", "type": string, "title": string, "zone": string, "plannedKm": number, "phase": string}]}

Rules for the progression:
- Anchor the long run to the runner's current longest completed run, not the old plan. The first rebuilt long run should sit at or just above that distance.
- Grow the weekly long run by at most about 1.5 km or 10 percent from the previous week, whichever is smaller. Never jump more than that.
- Every third or fourth week is a cutback: drop the long run roughly 20 to 30 percent, then resume building.
- Peak the long run in the high teens (about 18 to 19 km) two to three weeks before race day, then taper: reduce volume across the final two weeks.
- Never prescribe a training run at or beyond the race distance.
- Keep each week's existing shape: easy aerobic runs, one quality session suited to the phase, and the week's longest run on its long-run day.
- type is one of: Easy, Quality, Long, Shakeout.
- phase is one of: Base, Build, Peak, Taper, reflecting where the week sits relative to the race.
- zone uses the runner's labels: easy runs Z2; quality runs Z3, Z3-Z4, or Z4 by phase; long runs Z2, or Z2-Z3 when they finish at goal pace.
- plannedKm is a number in kilometres, one decimal place is fine.
- title is a short plain-English prescription, e.g. "40 min easy", "WU, 2x8 min Z3 (3 min jog), CD", "10k easy", "14k: 11k easy + 3k at goal pace".

Voice: plain, warm, like a knowledgeable coach. Use ordinary running language only; never military, drill, or boot-camp vocabulary. No markdown, no comments, JSON only.`;

export interface RebuildSession {
  date: string;
  type: string;
  title: string;
  zone: string;
  plannedKm: number;
  phase: Phase;
}

export interface LongRunStep {
  week: number;
  date: string;
  plannedKm: number;
}

// The upcoming run sessions the rebuild is allowed to rewrite: dated after
// today, still a run (not Strength), not the fixed Race, and not already logged.
export function futureRunSessions(sessions: Session[], today: string): Session[] {
  return sessions
    .filter(
      (s) =>
        s.date > today &&
        s.type !== "Strength" &&
        s.type !== "Race" &&
        s.status !== "done"
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Assembles the data context: the fixed race, the runner's real recent fitness
// (longest completed run, recent weekly volume, adherence), recent long runs for
// grounding, and the exact list of dates to rewrite with their current shape.
export function buildRebuildPrompt(
  sessions: Session[],
  profile: Profile,
  today: string,
  expected: Session[]
): string {
  const lines: string[] = [];

  const { daysToRace, weeksToRace } = countdown(profile, today);
  lines.push(
    `Race: ${profile.raceName} on ${profile.raceDate} (${daysToRace} days / ${weeksToRace} weeks away). Goal: ${profile.goal}. Race day is fixed at 21.1 km and is not in the list below.`
  );

  const { phase, progress } = phaseStatus(sessions, today);
  if (phase) lines.push(`Today (${today}) sits in the ${phase} phase, ${formatPercent(progress)} through it.`);

  // Real fitness: longest completed run and recent logged weekly volume.
  const doneRuns = sessions.filter(
    (s) => s.type !== "Strength" && s.status === "done" && typeof s.actual?.km === "number"
  );
  const longestKm = doneRuns.reduce((max, s) => Math.max(max, s.actual!.km!), 0);
  lines.push("");
  lines.push(
    longestKm > 0
      ? `Longest run actually completed so far: ${longestKm} km.`
      : "No runs completed with a logged distance yet."
  );

  const adh = adherenceOverall(sessions, today);
  lines.push(
    `Adherence: ${adh.done} of ${adh.due} due runs completed (${formatPercent(adh.ratio)}).`
  );

  const recentVolume = weeklyVolume(sessions)
    .filter((w) => w.actual > 0)
    .slice(-4);
  if (recentVolume.length) {
    lines.push("Recent logged weekly running volume:");
    for (const w of recentVolume) {
      lines.push(`  Week ${w.week}: ${round1(w.actual)} km actual (planned ${round1(w.planned)} km).`);
    }
  }

  const recentLong = doneRuns
    .filter((s) => s.type === "Long")
    .slice(-3);
  if (recentLong.length) {
    lines.push("");
    lines.push("Most recent completed long runs:");
    for (const s of recentLong) {
      const a = s.actual!;
      const parts = [`${s.date}`, `${a.km} km`];
      if (a.durationMin != null) parts.push(formatPace(paceSecPerKm(a.km!, a.durationMin)!) + "/km");
      if (a.avgHr != null) parts.push(`${a.avgHr} bpm`);
      lines.push(`  ${parts.join(", ")}`);
    }
  }

  lines.push("");
  lines.push(`Rewrite exactly these ${expected.length} upcoming dates, one workout each:`);
  for (const s of expected) {
    lines.push(
      `  ${s.date} (${s.day}, week ${s.week}, ${s.phase}): currently ${s.type} (${s.zone || "no zone"}) "${s.title}", ${s.plannedKm} km`
    );
  }

  return lines.join("\n");
}

// Strip an optional ```json ... ``` fence the model may wrap the object in.
function unfence(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return (fenced ? fenced[1] : text).trim();
}

function isPhase(v: unknown): v is Phase {
  return typeof v === "string" && (PHASES as readonly string[]).includes(v);
}

// Coerce and validate a candidate proposal (from the model or the client) into a
// clean RebuildSession[] covering exactly the expected dates. Returns null on any
// structural problem: missing dates, bad types, non-finite km. Extra or unknown
// dates are ignored, so tampering can only ever touch the owner's own future
// runs, and every expected date must be present and well-formed.
export function coerceProposal(
  value: unknown,
  expected: Set<string>
): RebuildSession[] | null {
  const arr = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { sessions?: unknown }).sessions)
      ? (value as { sessions: unknown[] }).sessions
      : null;
  if (!arr) return null;

  const byDate = new Map<string, RebuildSession>();
  for (const raw of arr) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const date = typeof r.date === "string" ? r.date : "";
    if (!expected.has(date) || byDate.has(date)) continue;
    if (typeof r.type !== "string" || !REWRITE_TYPES.has(r.type)) return null;
    if (typeof r.title !== "string" || r.title.trim() === "") return null;
    if (typeof r.zone !== "string") return null;
    if (typeof r.plannedKm !== "number" || !Number.isFinite(r.plannedKm) || r.plannedKm < 0) {
      return null;
    }
    if (!isPhase(r.phase)) return null;
    byDate.set(date, {
      date,
      type: r.type,
      title: r.title.trim(),
      zone: r.zone.trim(),
      plannedKm: r.plannedKm,
      phase: r.phase,
    });
  }

  // Every expected date must be covered.
  for (const date of expected) {
    if (!byDate.has(date)) return null;
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

// Calls Claude to design the rebuilt sessions. Throws if ANTHROPIC_API_KEY is
// missing or the API call fails; callers handle that. Returns null when the
// response can't be coerced into a valid proposal for the expected dates.
export async function generatePlanRebuild(
  sessions: Session[],
  profile: Profile,
  today: string,
  expected: Session[]
): Promise<RebuildSession[] | null> {
  const prompt = buildRebuildPrompt(sessions, profile, today, expected);
  const expectedDates = new Set(expected.map((s) => s.date));

  const client = new Anthropic();
  const response = await client.messages.create({
    model: REBUILD_MODEL,
    max_tokens: 8192,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  if (!text) return null;

  try {
    return coerceProposal(JSON.parse(unfence(text)), expectedDates);
  } catch {
    return null;
  }
}

// The upcoming long runs of a proposal, tagged with their plan week (looked up
// from the sessions being rewritten) for a readable preview of the new ramp.
function longRunSteps(proposal: RebuildSession[], expected: Session[]): LongRunStep[] {
  const weekByDate = new Map(expected.map((s) => [s.date, s.week]));
  return proposal
    .filter((p) => p.type === "Long")
    .map((p) => ({ week: weekByDate.get(p.date) ?? 0, date: p.date, plannedKm: p.plannedKm }));
}

export type PreviewOutcome =
  | { status: "ready"; proposal: RebuildSession[]; longRun: LongRunStep[] }
  | { status: "no-profile" }
  | { status: "nothing-to-rebuild" }
  | { status: "no-data" };

// Owner-scoped: generate a proposed rebuild without writing anything. The caller
// shows it, then hands the same proposal to applyRebuild to commit it.
export async function previewRebuild(owner: string): Promise<PreviewOutcome> {
  const [profile, sessions] = await Promise.all([getProfile(owner), listSessions(owner)]);
  if (!profile) return { status: "no-profile" };

  const today = todayStr();
  const expected = futureRunSessions(sessions, today);
  if (expected.length === 0) return { status: "nothing-to-rebuild" };

  const proposal = await generatePlanRebuild(sessions, profile, today, expected);
  if (!proposal) return { status: "no-data" };

  return { status: "ready", proposal, longRun: longRunSteps(proposal, expected) };
}

export type ApplyOutcome =
  | { status: "applied"; count: number }
  | { status: "nothing-to-rebuild" }
  | { status: "invalid" };

// Owner-scoped: validate a proposal against the runner's current future runs and
// write it. Re-deriving the expected dates here (rather than trusting the client)
// means a stale or tampered proposal is rejected or reduced to the owner's own
// upcoming runs before anything is written.
export async function applyRebuild(owner: string, proposal: unknown): Promise<ApplyOutcome> {
  const sessions = await listSessions(owner);
  const today = todayStr();
  const expected = futureRunSessions(sessions, today);
  if (expected.length === 0) return { status: "nothing-to-rebuild" };

  const clean = coerceProposal(proposal, new Set(expected.map((s) => s.date)));
  if (!clean) return { status: "invalid" };

  const updates: RebuildUpdate[] = clean.map((s) => ({
    date: s.date,
    type: s.type,
    title: s.title,
    zone: s.zone,
    plannedKm: s.plannedKm,
    phase: s.phase,
  }));
  const count = await rebuildFutureSessions(owner, updates);
  return { status: "applied", count };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
