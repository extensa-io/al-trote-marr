import { currentOwner, unauthorized } from "@/lib/owner";
import { deletePushSubscription } from "@/lib/db";

interface Body {
  endpoint?: string;
}

export async function POST(req: Request) {
  const owner = await currentOwner();
  if (!owner) return unauthorized();

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.endpoint) {
    return Response.json({ error: "missing endpoint" }, { status: 400 });
  }

  await deletePushSubscription(owner, body.endpoint);
  return Response.json({ ok: true });
}
