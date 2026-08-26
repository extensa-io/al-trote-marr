import Anthropic from "@anthropic-ai/sdk";
import {
  getDailySummary,
  getProfile,
  listSessions,
  upsertDailySummary,
} from "./db";
import { describeConstraints } from "./constraints";
import { responseText } from "./model";
import { formatPace, paceSecPerKm } from "./pace";
import { hrTargetForZone } from "./prescription";
import {
  countdown,
  efficiencyTrend,
  formatHms,
  formatPercent,
  longestCompletedRun,
  MIN_COMPARABLE_KM,
  paceVsRecentSameType,
  phaseStatus,
  raceProjections,
  rollingVolume,
  RACE_DISTANCE_KM,
} from "./stats";
import type { Profile, Session } from "./types";

export const RECAP_MODEL = "claude-opus-4-8";

const SYSTEM_PROMPT = `You write a recap of one run a runner just logged, shown on the home screen of their half-marathon training app. It replaces the daily progress note until the next morning's note arrives.

The runner is looking at a card directly above your text that already shows this run's distance, duration, pace, average heart rate, and the target zone range. Restating any of those is wasted space and reads as padding. Your job is the part they cannot see: what this run means next to their other runs, and what it implies for race day.

Respond with a single JSON object and nothing else, in this exact shape:
{"recap": string, "insights": string[], "suggestions": string[]}

- recap: 2 to 3 sentences on what this run changes about where the runner stands. Lead with the comparison, trend, or projection that matters most, not with a description of the run.
- insights: 2 to 4 short phrases, each carrying a comparison, a trend, or a projection. Every one must rest on something in the DERIVED CONTEXT section below, on the runner's note, or on a relationship between two numbers. An insight that only repeats a logged value is not an insight.
- suggestions: 1 to 3 short, actionable pointers for what to do next, tied to what the data actually shows is limiting.

Hard rules:
- Never state this run's distance, duration, pace, or heart rate as a bare fact. You may use those numbers inside a comparison ("18 seconds per km quicker than your last five easy runs"), a trend, or a projection.
- Never say a heart rate was inside its target zone without saying what that means in context, such as how it compares to recent runs at similar pace, or what it says about aerobic progress.
- Use the projected finish times when they are given, including the gap between the speed-based and endurance-based numbers and the gap to the stated goal. Name which run each projection came from.
- Ground every claim in the data given; never invent or extrapolate a number that isn't there. When you cite a date, distance, or pace from the context, copy it exactly as given; do not paraphrase or reconstruct it from memory. Projections are estimates: say "projects to" or "on this trend", never state a finish time as certain.
- If a figure is absent, say nothing about it rather than hedging about missing data.

- Respect the runner's standing constraints when they are given. If a constraint explains a metric, that metric is not a fitness signal and must not be presented as one. Example: easy runs done as run/walk intervals to hold the heart-rate cap make average pace a function of the walk ratio, not of turnover, so a pace delta on those runs says little; lean on efficiency, load, and long-run distance instead, and if you mention such a pace at all, name the reason.
- Do not repeat a figure the runner has already been told about unless it changed. When the derived context says a projection is unchanged since the last run, treat it as background, not news, and lead with what did move.
- When the previous recap is shown to you, treat its points as already said. Do not restate them as if they were new. A standing fact that still matters (an unchanged projection, a long-run gap) may be referred to once, briefly, as context; it must not be the lead or fill more than one insight. Find what this run adds that the last one couldn't say.

If the runner left a note, use what it reveals (how it felt, niggles, conditions) and weigh it against the numbers. Voice: plain, warm, encouraging, like a knowledgeable coach. No hype, no clichés, no emoji. Use ordinary running language only; never use military, drill, or boot-camp vocabulary. British spelling throughout ("prioritise", "metres", "realise"). No markdown anywhere in the strings, and no em dashes or en dashes in prose: use commas, semicolons, or a shorter sentence.`;

export interface RecapContent {
  recap: string;
  insights: string[];
  suggestions: string[];
}

// The response shape, enforced by the API rather than asked for in prose. The
// prompt still describes the fields (the schema constrains structure, not
// meaning) but a reply that isn't this object can no longer come back at all.
//
// `additionalProperties: false` and a full `required` list are mandatory for
// structured outputs. Array length is deliberately not constrained here: item
// counts are not supported by the schema subset, so "2 to 4 insights" stays in
// the prompt. First use of a new schema pays a one-off compilation cost, then
// caches for 24 hours.
const RECAP_SCHEMA = {
  type: "object",
  properties: {
    recap: { type: "string" },
    insights: { type: "array", items: { type: "string" } },
    suggestions: { type: "array", items: { type: "string" } },
  },
  required: ["recap", "insights", "suggestions"],
  additionalProperties: false,
} as const;

// What the runner was last told, so the next recap doesn't say it again.
export interface PreviousRecap {
  date: string;
  recap: string;
  insights: string[];
}

// Assembles the data context for the recap of the run on `runDate`. `runDate`
// is YYYY-MM-DD in America/Toronto. Returns null when that session isn't a
// logged (done) run. Pure: `previous` is passed in rather than read here.
export function buildRecapPrompt(
  sessions: Session[],
  profile: Profile,
  runDate: string,
  previous?: PreviousRecap | null
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

  const constraints = describeConstraints(profile);
  if (constraints) lines.push(`Runner's standing constraints: ${constraints}`);

  lines.push("");
  lines.push("The run just logged:");
  lines.push(
    `${run.date} ${run.type} (${run.zone}): ${run.title}. Planned ${run.plannedKm} km.`
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
  if (a?.testEffort) {
    detail.push(
      "logged as a TEST EFFORT: a deliberate hard run to measure fitness, not the prescribed session, so judge it as a benchmark rather than against the plan or against easy-run pace"
    );
  }
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
    .sort((x, y) => x.date.localeCompare(y.date))
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

  // Everything below is computed, not logged. The model cannot derive these
  // reliably from raw rows (a pace delta, an efficiency trend, a load ratio, a
  // Riegel projection) and without them the only thing left to write about is
  // the numbers the runner is already looking at.
  //
  // Prose here avoids em dashes on purpose: the model mirrors the register of
  // its context, and the recap copy rules forbid them.
  const derived: string[] = [];

  // A marker session (a travel day ticked off, a walk) has no comparable pace or
  // efficiency, and saying so beats letting the model infer a collapse in
  // fitness from a one-minute log.
  if ((a?.km ?? 0) < MIN_COMPARABLE_KM) {
    derived.push(
      `This log is too short to compare (under ${MIN_COMPARABLE_KM} km), so it is a marker rather than a training run. Draw no conclusions about pace, heart rate, or fitness from it; the pace and efficiency comparisons are omitted for that reason. Say what it means for continuity and load, nothing more.`
    );
  }

  const pace = paceVsRecentSameType(sessions, run);
  if (pace) {
    const delta = Math.round(Math.abs(pace.deltaVsMeanSec));
    const direction = pace.deltaVsMeanSec < 0 ? "faster" : "slower";
    derived.push(
      `Pace vs the last ${pace.count} ${run.type} run(s): ${delta} sec/km ${direction} than their mean of ${formatPace(pace.meanSecPerKm)}. Their best of those was ${formatPace(pace.bestSecPerKm)}${pace.isBest ? ", and this run beat it" : ""}.`
    );
  }

  const eff = efficiencyTrend(sessions, runDate);
  if (eff) {
    const direction = eff.changePct >= 0 ? "better" : "worse";
    derived.push(
      `Aerobic efficiency (speed per heartbeat) on this run: ${eff.current.toFixed(4)} m/s per bpm, ${Math.abs(eff.changePct).toFixed(1)}% ${direction} than the mean of the previous ${eff.sampleSize} ${run.type} run(s). Higher means more pace for the same heart rate, which is the fitness signal pace alone can't show.`
    );
  }

  const volume = rollingVolume(sessions, runDate);
  if (volume.last28Km > 0) {
    derived.push(
      `Load: ${volume.last7Km} km in the last 7 days, ${volume.last28Km} km in the last 28${volume.ratio != null ? ` (this week is ${volume.ratio.toFixed(2)}× the 4-week weekly average; above about 1.5 is a fast ramp)` : ""}.`
    );
  }

  const longest = longestCompletedRun(sessions, runDate);
  if (longest) {
    derived.push(
      `Longest run completed so far: ${longest.km} km on ${longest.date}. Race distance is 21.1 km.`
    );
  }

  const projections = raceProjections(sessions, runDate);
  if (projections.length) {
    const goalSeconds = profile.goalPaceSecPerKm * RACE_DISTANCE_KM;
    derived.push(
      `Projected half-marathon finish (Riegel scaling, an estimate not a promise): ${projections
        .map(
          (p) =>
            `${formatHms(p.totalSeconds)} on ${p.basis} (from the ${p.source.km} km ${p.source.type.toLowerCase()} on ${p.source.date} at ${formatPace(p.source.paceSecPerKm)}), race pace ${formatPace(p.paceSecPerKm)}`
        )
        .join("; ")}. Goal pace ${formatPace(profile.goalPaceSecPerKm)} would finish in ${formatHms(goalSeconds)}.${projections.length === 2 ? " The speed and endurance projections disagreeing tells you which side is the limiter." : ""}`
    );

    // Whether the projection actually moved since the previous logged run. Each
    // recap is generated in isolation, so without this the loudest standing
    // figure gets presented as news every single day.
    const priorRun = sessions
      .filter(
        (s) => s.type !== "Strength" && s.status === "done" && s.date < runDate
      )
      .sort((x, y) => x.date.localeCompare(y.date))
      .pop();
    if (priorRun) {
      const before = raceProjections(sessions, priorRun.date);
      const changes = projections.map((p) => {
        const was = before.find((b) => b.basis === p.basis);
        if (!was) return `${p.basis}: new, no ${p.basis} projection existed as of ${priorRun.date}`;
        const deltaSec = Math.round(p.totalSeconds - was.totalSeconds);
        if (Math.abs(deltaSec) < 30) {
          return `${p.basis}: unchanged since ${priorRun.date}, same source run, this is not news`;
        }
        return `${p.basis}: ${Math.abs(deltaSec) >= 60 ? `${Math.round(Math.abs(deltaSec) / 60)} min` : `${Math.abs(deltaSec)} sec`} ${deltaSec < 0 ? "faster" : "slower"} than as of ${priorRun.date}`;
      });
      derived.push(`Projection movement since the last logged run: ${changes.join("; ")}.`);
    }
  }

  // The previous recap, so standing facts get referred to once instead of
  // leading every entry. Each recap is generated in isolation, and the loudest
  // figure is by definition the same one day after day.
  if (previous) {
    lines.push("");
    lines.push(
      `ALREADY TOLD THE RUNNER, in the recap for ${previous.date} (do not repeat these points as news):`
    );
    lines.push(previous.recap);
    for (const insight of previous.insights) lines.push(`- ${insight}`);
  }

  if (derived.length) {
    lines.push("");
    lines.push("DERIVED CONTEXT (computed, not visible to the runner; this is what the recap should be built from):");
    for (const line of derived) lines.push(`- ${line}`);
  }

  return lines.join("\n");
}

// Strip an optional ```json ... ``` fence the model may wrap the object in.
function unfence(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return (fenced ? fenced[1] : text).trim();
}

// Pull the first balanced JSON object out of a response, so a preamble like
// "Here is the recap:" or a trailing remark doesn't cost the whole generation.
// Braces inside strings are skipped, and escapes are honoured, so a recap
// mentioning a brace can't unbalance the scan. Tolerant about what surrounds the
// object, strict about the object itself.
export function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      if (inString) escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

// Returns null when the response isn't a usable recap object. There is
// deliberately no plain-text fallback: the previous one stored the whole raw
// response as the recap, so one malformed reply put a JSON blob on the home
// screen and the updatedAt idempotency key kept it there. Failing here routes
// through the caller's error path to a "Try again" instead.
function parseRecap(raw: string): RecapContent | null {
  const candidate = extractJsonObject(unfence(raw));
  if (!candidate) return null;

  let obj: Partial<RecapContent>;
  try {
    obj = JSON.parse(candidate) as Partial<RecapContent>;
  } catch {
    return null;
  }

  const recap = typeof obj.recap === "string" ? obj.recap.trim() : "";
  if (!recap) return null;

  const asList = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  return { recap, insights: asList(obj.insights), suggestions: asList(obj.suggestions) };
}

// Calls Claude to produce the recap. Throws if ANTHROPIC_API_KEY is missing,
// the API call fails, the response was truncated, or it wasn't the JSON object
// the prompt asks for; callers handle that. Returns null only when there is no
// run to recap.
export async function generateRecap(
  sessions: Session[],
  profile: Profile,
  runDate: string,
  previous?: PreviousRecap | null
): Promise<RecapContent | null> {
  const prompt = buildRecapPrompt(sessions, profile, runDate, previous);
  if (!prompt) return null;

  const client = new Anthropic();
  const response = await client.messages.create({
    model: RECAP_MODEL,
    // Adaptive thinking draws on the same budget as the answer, and a
    // three-field JSON object cut off halfway is unrecoverable. 2048 is the
    // cheap margin over what the recap itself needs.
    max_tokens: 2048,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: RECAP_SCHEMA },
    },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const text = responseText(response, "recap");
  if (!text) throw new Error("recap: model returned no text");

  const content = parseRecap(text);
  if (!content) {
    // Carry a slice of the response into the error. Without it a parse failure
    // is unattributable: the log said only that parsing failed, not what came
    // back, so there was nothing to fix. Truncated to keep logs readable.
    const snippet = text.slice(0, 300).replace(/\s+/g, " ");
    throw new Error(
      `recap: model response was not a recap object (first 300 chars: ${snippet})`
    );
  }
  return content;
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

  // The recap for the previous logged run, when there is one, so this one can
  // avoid repeating it. A miss is fine: the prompt simply omits the section.
  const priorRun = sessions
    .filter((s) => s.type !== "Strength" && s.status === "done" && s.date < runDate)
    .sort((x, y) => x.date.localeCompare(y.date))
    .pop();
  const priorSummary = priorRun ? await getDailySummary(owner, priorRun.date) : null;
  const previous =
    priorSummary?.kind === "recap"
      ? {
          date: priorSummary.date,
          recap: priorSummary.text,
          insights: priorSummary.insights ?? [],
        }
      : null;

  const content = await generateRecap(sessions, profile, runDate, previous);
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
