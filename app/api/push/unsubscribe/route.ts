import { auth } from "@/auth";
import { deletePushSubscription } from "@/lib/db";

interface Body {
  endpoint?: string;
}

export async function POST(req: Request) {
  const session = await auth();
  const owner = session?.user?.email?.toLowerCase();
  if (!owner) return Response.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.endpoint) {
    return Response.json({ error: "missing endpoint" }, { status: 400 });
  }

  await deletePushSubscription(owner, body.endpoint);
  return Response.json({ ok: true });
}
