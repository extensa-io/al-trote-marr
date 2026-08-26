import { currentOwner, unauthorized } from "@/lib/owner";
import { getDailySummary, listSessions } from "@/lib/db";
import { generateAndStoreRecap } from "@/lib/recap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DATES = 10;

// Dev-only: force-regenerate recaps for past logged runs, so a prompt change can
// be checked against real data without clicking Rewrite on one day at a time.
// Disabled in production.
//
//   POST /api/dev/recap?dates=2026-08-25,2026-08-23   explicit dates
//   POST /api/dev/recap?last=4                        the 4 most recent logged runs
//
// Only dates come from the client; the owner is the signed-in runner. Each date
// costs one model call and replaces whatever recap is stored for it.
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  const owner = await currentOwner();
  if (!owner) return unauthorized();

  const params = new URL(request.url).searchParams;
  const explicit = params.get("dates");
  const last = params.get("last");

  let dates: string[];
  if (explicit) {
    dates = explicit.split(",").map((d) => d.trim()).filter(Boolean);
    if (dates.some((d) => !DATE_RE.test(d))) {
      return Response.json({ error: "dates must be YYYY-MM-DD" }, { status: 400 });
    }
  } else {
    const count = last ? Number(last) : 1;
    if (!Number.isInteger(count) || count < 1) {
      return Response.json({ error: "last must be a positive integer" }, { status: 400 });
    }
    const sessions = await listSessions(owner);
    dates = sessions
      .filter((s) => s.type !== "Strength" && s.status === "done")
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, count)
      .map((s) => s.date)
      .reverse();
  }

  if (dates.length > MAX_DATES) {
    return Response.json({ error: `at most ${MAX_DATES} dates per call` }, { status: 400 });
  }

  // Sequential on purpose: one model call at a time keeps this inside the
  // function's budget and makes a failure easy to attribute to a date. The
  // stored recap is read back into the response so a prompt change can be judged
  // from the output without opening four pages.
  const results: {
    date: string;
    outcome?: string;
    error?: string;
    recap?: string;
    insights?: string[];
    suggestions?: string[];
  }[] = [];
  for (const date of dates) {
    try {
      const outcome = await generateAndStoreRecap(owner, date, { force: true });
      const stored = outcome === "generated" ? await getDailySummary(owner, date) : null;
      results.push({
        date,
        outcome,
        ...(stored?.kind === "recap"
          ? {
              recap: stored.text,
              insights: stored.insights ?? [],
              suggestions: stored.suggestions ?? [],
            }
          : {}),
      });
    } catch (err) {
      console.error(`dev recap failed for ${owner} on ${date}:`, err);
      results.push({ date, error: err instanceof Error ? err.message : "unknown" });
    }
  }

  return Response.json({ ok: true, results });
}
