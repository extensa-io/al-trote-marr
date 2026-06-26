import { auth } from "@/auth";
import { listSessions } from "@/lib/db";
import { generateAndStoreRecap, type RecapOutcome } from "@/lib/recap";
import { todayStr } from "@/lib/date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Dev-only: backfill recaps for past logged runs so the recap UI can be seen on
// historical days. Generation is idempotent (skips runs whose recap already
// matches their updatedAt), so re-running is cheap. Disabled in production.
//
// Query params:
//   ?limit=N   how many past runs to process, most recent first (default 10)
//   ?all=1     ignore the limit and process every past logged run
//   ?force=1   regenerate even if a current recap already exists
//
// Hit it in the browser while signed in: http://localhost:3000/api/dev/recap
export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  const session = await auth();
  const owner = session?.user?.email?.toLowerCase();
  if (!owner) return Response.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const all = url.searchParams.get("all") === "1";
  const force = url.searchParams.get("force") === "1";
  const limit = Number(url.searchParams.get("limit")) || 10;

  const today = todayStr();
  const sessions = await listSessions(owner);
  const pastRuns = sessions
    .filter((s) => s.type !== "Strength" && s.status === "done" && s.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date));
  const targets = all ? pastRuns : pastRuns.slice(0, limit);

  const results: Record<string, RecapOutcome | "error"> = {};
  for (const run of targets) {
    try {
      results[run.date] = await generateAndStoreRecap(owner, run.date, { force });
    } catch (err) {
      console.error(`backfill recap failed for ${owner} on ${run.date}:`, err);
      results[run.date] = "error";
    }
  }

  return Response.json({
    ok: true,
    pastRuns: pastRuns.length,
    processed: targets.length,
    results,
  });
}
