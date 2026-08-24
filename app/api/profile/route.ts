import { currentOwner, unauthorized } from "@/lib/owner";
import { getProfile } from "@/lib/db";

export async function GET() {
  const owner = await currentOwner();
  if (!owner) return unauthorized();
  const profile = await getProfile(owner);
  if (!profile) return Response.json({ error: "no plan" }, { status: 404 });
  return Response.json(profile);
}
