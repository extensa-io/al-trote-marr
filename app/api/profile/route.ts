import { auth } from "@/auth";
import { getProfile } from "@/lib/db";

export async function GET() {
  const session = await auth();
  const owner = session?.user?.email?.toLowerCase();
  if (!owner) return Response.json({ error: "unauthorized" }, { status: 401 });
  const profile = await getProfile(owner);
  if (!profile) return Response.json({ error: "no plan" }, { status: 404 });
  return Response.json(profile);
}
