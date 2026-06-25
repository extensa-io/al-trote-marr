import {
  listAllPushSubscriptions,
  listSessions,
  getProfile,
  deletePushSubscriptionByEndpoint,
} from "@/lib/db";
import { ALLOWED_EMAILS } from "@/lib/allowlist";
import { buildDailyMessage } from "@/lib/notify";
import { sendPush } from "@/lib/push";
import { generateAndStoreSummary, type SummaryOutcome } from "@/lib/summary";
import { todayStr } from "@/lib/date";
import type { PushSubscriptionDoc } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Machine-triggered daily job (no user session), gated by CRON_SECRET.
// Vercel Hobby allows one cron run per day, so this single daily route runs
// both daily tasks: send the push reminder and generate each runner's AI
// progress note. Timing is approximate — Vercel fires within the hour and a
// single daily cron can't track DST — so there is no Toronto-hour gate.
//
// Order matters: the push goes out FIRST. The whole function is capped at
// maxDuration, and summary generation makes a blocking, adaptive-thinking
// model call per runner with no per-call timeout. If those run first and
// exhaust the budget (e.g. as runners are added), the function is killed
// before the push is ever sent. Sending the push first guarantees the
// time-critical notification ships even if summary generation later times
// out; the note is best-effort home-screen content.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authz = req.headers.get("authorization");
  if (!secret || authz !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const today = todayStr();

  // 1. Push reminder to every subscription. Cheap and fast — do it first.
  const subs = await listAllPushSubscriptions();

  // Group subscriptions by owner so we load each runner's plan once.
  const byOwner = new Map<string, PushSubscriptionDoc[]>();
  for (const sub of subs) {
    const list = byOwner.get(sub.ownerEmail) ?? [];
    list.push(sub);
    byOwner.set(sub.ownerEmail, list);
  }

  let sent = 0;
  let pruned = 0;
  let pushError: string | null = null;
  try {
    for (const [owner, ownerSubs] of byOwner) {
      const [sessions, profile] = await Promise.all([listSessions(owner), getProfile(owner)]);
      const message = buildDailyMessage(sessions, profile, today);

      for (const sub of ownerSubs) {
        const result = await sendPush(sub, message);
        if (result.ok) sent++;
        else if (result.expired) {
          await deletePushSubscriptionByEndpoint(sub.endpoint);
          pruned++;
        }
      }
    }
  } catch (err) {
    // A misconfigured VAPID setup throws from sendPush's configure() before any
    // notification goes out. Surface it in the response instead of an opaque 500
    // so a manual cron hit shows the cause.
    pushError = err instanceof Error ? err.message : String(err);
    console.error("push send failed:", err);
  }

  // 2. AI progress note for every allowlisted runner (idempotent per date, so
  //    a retry within the day reuses the stored note rather than re-billing).
  //    Best-effort: if the function times out here, the push above already shipped.
  const summaries: Record<string, SummaryOutcome | "error"> = {};
  for (const owner of ALLOWED_EMAILS) {
    try {
      summaries[owner] = await generateAndStoreSummary(owner, today);
    } catch (err) {
      console.error(`daily summary failed for ${owner}:`, err);
      summaries[owner] = "error";
    }
  }

  return Response.json({
    ok: !pushError,
    date: today,
    push: {
      recipients: subs.length,
      sent,
      pruned,
      ...(pushError ? { error: pushError } : {}),
    },
    summaries,
  });
}
