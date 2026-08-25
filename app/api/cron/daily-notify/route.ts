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
import { todayStr, torontoHour } from "@/lib/date";
import type { PushSubscriptionDoc } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// 300s is the platform default and costs nothing extra. The push is sent first
// and is fast; the budget exists for the per-runner model calls that follow,
// which have no timeout of their own. If those overrun, the platform kills the
// function after the notifications have already shipped and that day's progress
// notes are simply not written — the next morning writes fresh ones.
export const maxDuration = 300;

const DEFAULT_NOTIFY_HOUR = 7;

// The local Toronto hour the reminder should arrive. Anything unset, unparseable
// or out of range falls back to 7 AM rather than silently notifying at midnight.
function notifyHour(): number {
  const raw = parseInt(process.env.NOTIFY_HOUR ?? "", 10);
  return Number.isInteger(raw) && raw >= 0 && raw <= 23 ? raw : DEFAULT_NOTIFY_HOUR;
}

// Machine-triggered daily job (no user session), gated by CRON_SECRET. It runs
// both daily tasks: send the push reminder and generate each runner's AI
// progress note.
//
// Fixed local time across DST: a cron schedule is UTC, so no single daily entry
// can hold 7 AM Toronto all year — it drifts an hour at each changeover.
// `vercel.json` therefore schedules BOTH UTC hours that can be 7 AM local
// (11:00 for EDT, 12:00 for EST) and the gate below lets exactly one of them
// through. Two invocations a day, one send, correct year-round.
//
// Vercel may fire a cron a few minutes late. If a run slips across an hour
// boundary the gate can in principle skip both runs (no reminder that day) or
// pass both (two sends). A double send is harmless: the notification carries
// tag "daily-reminder", so the second replaces the first in the tray rather
// than stacking.
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

  // Only the scheduled run that lands on the target local hour does the work;
  // its DST-shifted twin returns early having sent and generated nothing.
  const hour = torontoHour();
  const target = notifyHour();
  if (hour !== target) {
    return Response.json({ ok: true, skipped: true, localHour: hour, notifyHour: target });
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
