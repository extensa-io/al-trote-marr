import { currentOwner, unauthorized } from "@/lib/owner";
import { listSessions } from "@/lib/db";

export async function GET() {
  const owner = await currentOwner();
  if (!owner) return unauthorized();
  return Response.json(await listSessions(owner));
}
