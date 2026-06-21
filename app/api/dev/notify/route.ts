import { auth } from "@/auth";
import {
  listPushSubscriptions,
  listSessions,
  getProfile,
  deletePushSubscriptionByEndpoint,
} from "@/lib/db";
import { buildDailyMessage } from "@/lib/notify";
import { sendPush } from "@/lib/push";
import { todayStr } from "@/lib/date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Dev-only: sends today's reminder to the signed-in user immediately, bypassing
// the cron schedule and the 7 AM gate. Disabled in production.
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  const session = await auth();
  const owner = session?.user?.email?.toLowerCase();
  if (!owner) return Response.json({ error: "unauthorized" }, { status: 401 });

  const today = todayStr();
  const [subs, sessions, profile] = await Promise.all([
    listPushSubscriptions(owner),
    listSessions(owner),
    getProfile(owner),
  ]);

  if (subs.length === 0) {
    return Response.json({ error: "no subscription on this device" }, { status: 409 });
  }

  const message = buildDailyMessage(sessions, profile, today);

  let sent = 0;
  let pruned = 0;
  for (const sub of subs) {
    const result = await sendPush(sub, message);
    if (result.ok) sent++;
    else if (result.expired) {
      await deletePushSubscriptionByEndpoint(sub.endpoint);
      pruned++;
    }
  }

  return Response.json({ ok: true, message, sent, pruned });
}
