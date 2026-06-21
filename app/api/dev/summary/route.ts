import { auth } from "@/auth";
import { todayStr } from "@/lib/date";
import { generateAndStoreSummary } from "@/lib/summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Dev-only: regenerate today's summary for the signed-in runner on demand, so
// you can test without waiting for the daily cron. Disabled in production.
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  const session = await auth();
  const owner = session?.user?.email?.toLowerCase();
  if (!owner) return Response.json({ error: "unauthorized" }, { status: 401 });

  const outcome = await generateAndStoreSummary(owner, todayStr(), { force: true });
  return Response.json({ ok: true, outcome });
}
