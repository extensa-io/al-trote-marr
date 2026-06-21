import { auth } from "@/auth";
import { savePushSubscription } from "@/lib/db";

interface Body {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
}

export async function POST(req: Request) {
  const session = await auth();
  const owner = session?.user?.email?.toLowerCase();
  if (!owner) return Response.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return Response.json({ error: "invalid subscription" }, { status: 400 });
  }

  await savePushSubscription(owner, {
    endpoint: body.endpoint,
    keys: { p256dh: body.keys.p256dh, auth: body.keys.auth },
  });
  return Response.json({ ok: true });
}
