import { auth } from "@/auth";
import { listSessions } from "@/lib/db";

export async function GET() {
  const session = await auth();
  const owner = session?.user?.email?.toLowerCase();
  if (!owner) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json(await listSessions(owner));
}
