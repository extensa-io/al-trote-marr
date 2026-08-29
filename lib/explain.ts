import { createHash } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import {
  getProfile,
  getSession,
  getSessionExplanation,
  upsertSessionExplanation,
} from "./db";
import { responseText } from "./model";
import { formatPace } from "./pace";
import type { Profile, Session } from "./types";

export const EXPLAIN_MODEL = "claude-opus-4-8";

const SYSTEM_PROMPT = `You explain one prescribed running workout in plain English for a runner using their half-marathon training app. The runner sees cryptic shorthand and wants to know exactly what to do and why.

Respond with a single paragraph of 2 to 4 sentences and nothing else. No markdown, no lists, no headings, no surrounding quotation marks.

Decode every abbreviation into ordinary words: WU means warm-up, CD means cool-down, Z1 to Z5 are heart-rate zones (name the zone and give its bpm range when provided), a "jog" between efforts is easy recovery, and "x" means repeats (so "2x8 min Z3" is two 8-minute efforts at the Z3 pace). Say plainly what to run, at what effort, for how long, and how to recover between efforts. Add at most one short clause on the point of the session. Ground everything in the data given; never invent paces, distances, or times that the prescription does not imply. Voice: plain, warm, like a knowledgeable coach. No hype, no clichés, no emoji. Use ordinary running language only; never military, drill, or boot-camp vocabulary.`;

// Cache key for one explanation. Two sessions that share a prescription AND the
// profile inputs the prompt reads share an explanation, so it is generated once
// and reused across every week the workout recurs. Changing any input yields a
// fresh explanation and orphans the old row (see CONTEXT.md section 9).
export function explanationKey(session: Session, profile: Profile): string {
  // Everything the prompt reads has to be in the key, not just the prescription.
  // Goal pace and the zone table are both injected into the explanation, so a
  // key built from the workout alone goes stale silently: changing the race goal
  // left every cached "at goal pace" explanation quoting the old pace forever,
  // because nothing about the workout had changed.
  const zones = profile.zones.map((z) => `${z.z}:${z.min}-${z.max}`).join(",");
  const normalized = [
    session.type,
    session.zone,
    session.title,
    session.plannedKm,
    profile.goalPaceSecPerKm,
    zones,
  ].join("|");
  return createHash("sha1").update(normalized).digest("hex").slice(0, 16);
}

// Assembles the data context for explaining `session`. Runs only; strength
// sessions already list each exercise with sets and reps, so they need no prose.
export function buildExplainPrompt(session: Session, profile: Profile): string | null {
  if (session.type === "Strength") return null;

  const lines: string[] = [];
  lines.push(
    `Workout: ${session.type} (${session.zone || "no zone"}) — ${session.title}. Planned ${session.plannedKm} km. Week ${session.week}, ${session.phase} phase.`
  );

  if (profile.zones.length) {
    const table = profile.zones
      .map((z) => `Z${z.z} ${z.name} ${z.min}-${z.max} bpm`)
      .join("; ");
    lines.push(`Heart-rate zones: ${table}.`);
  }

  if (profile.goalPaceSecPerKm) {
    lines.push(`Goal race pace: ${formatPace(profile.goalPaceSecPerKm)} per km.`);
  }

  return lines.join("\n");
}

// Strip a wrapping ```/```json fence and surrounding quotes the model may add.
function clean(text: string): string {
  const fenced = text.match(/```(?:\w+)?\s*([\s\S]*?)\s*```/);
  let out = (fenced ? fenced[1] : text).trim();
  if (out.length >= 2 && out.startsWith('"') && out.endsWith('"')) {
    out = out.slice(1, -1).trim();
  }
  return out;
}

// Calls Claude to produce the explanation paragraph. Throws if
// ANTHROPIC_API_KEY is missing, the API call fails, or the response was
// truncated; callers handle that.
export async function generateExplanation(
  session: Session,
  profile: Profile
): Promise<string | null> {
  const prompt = buildExplainPrompt(session, profile);
  if (!prompt) return null;

  const client = new Anthropic();
  const response = await client.messages.create({
    model: EXPLAIN_MODEL,
    // Shared with adaptive thinking: 512 left almost nothing for the paragraph
    // itself once the model thought about the prescription. A truncated
    // response is rejected outright below.
    max_tokens: 1024,
    thinking: { type: "adaptive" },
    output_config: { effort: "low" },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const text = responseText(response, "explain");
  return text ? clean(text) : null;
}

export type ExplainOutcome =
  | { status: "ready"; text: string }
  | { status: "no-profile" }
  | { status: "no-session" }
  | { status: "not-a-run" }
  | { status: "no-data" };

// Owner-scoped: return the cached explanation for the workout on `date`,
// generating and caching it first if absent. Keyed by prescription content, so a
// hit is reused across every date that shares the same workout.
export async function getOrCreateExplanation(
  owner: string,
  date: string
): Promise<ExplainOutcome> {
  const [profile, session] = await Promise.all([getProfile(owner), getSession(owner, date)]);
  if (!profile) return { status: "no-profile" };
  if (!session) return { status: "no-session" };
  if (session.type === "Strength") return { status: "not-a-run" };

  const key = explanationKey(session, profile);
  const cached = await getSessionExplanation(owner, key);
  if (cached) return { status: "ready", text: cached.text };

  const text = await generateExplanation(session, profile);
  if (!text) return { status: "no-data" };

  await upsertSessionExplanation({
    ownerEmail: owner,
    key,
    text,
    model: EXPLAIN_MODEL,
    createdAt: new Date().toISOString(),
  });
  return { status: "ready", text };
}
