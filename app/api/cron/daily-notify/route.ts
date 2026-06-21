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
// both daily tasks: generate each runner's AI progress note and send the push
// reminder. Timing is approximate — Vercel fires within the hour and a single
// daily cron can't track DST — so there is no Toronto-hour gate.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authz = req.headers.get("authorization");
  if (!secret || authz !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const today = todayStr();

  // 1. AI progress note for every allowlisted runner (idempotent per date, so
  //    a retry within the day reuses the stored note rather than re-billing).
  const summaries: Record<string, SummaryOutcome | "error"> = {};
  for (const owner of ALLOWED_EMAILS) {
    try {
      summaries[owner] = await generateAndStoreSummary(owner, today);
    } catch (err) {
      console.error(`daily summary failed for ${owner}:`, err);
      summaries[owner] = "error";
    }
  }

  // 2. Push reminder to every subscription.
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

  return Response.json({
    ok: true,
    date: today,
    summaries,
    push: { recipients: subs.length, sent, pruned },
  });
}
