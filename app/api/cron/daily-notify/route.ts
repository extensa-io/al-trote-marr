import {
  listAllPushSubscriptions,
  listSessions,
  getProfile,
  deletePushSubscriptionByEndpoint,
} from "@/lib/db";
import { buildDailyMessage } from "@/lib/notify";
import { sendPush } from "@/lib/push";
import { todayStr, torontoHour } from "@/lib/date";
import type { PushSubscriptionDoc } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Machine-triggered: no user session. Gated by CRON_SECRET instead of auth().
// Runs hourly on Vercel Cron; only the run that lands on the target Toronto
// hour actually sends, so delivery stays at 7:00 AM local across DST changes.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authz = req.headers.get("authorization");
  if (!secret || authz !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const targetHour = Number(process.env.NOTIFY_HOUR ?? 7);
  if (torontoHour() !== targetHour) {
    return Response.json({ skipped: true, reason: "off-hour" });
  }

  const today = todayStr();
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

  return Response.json({ ok: true, date: today, recipients: subs.length, sent, pruned });
}
