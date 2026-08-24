import { redirect } from "next/navigation";
import { auth } from "@/auth";

// The tenant key for every query. Always derived from the authenticated
// session, never from a client payload, header, or query string. This is the
// single definition; do not re-implement it per route or action, because
// tenancy isolation rests entirely on it being identical everywhere.
export async function currentOwner(): Promise<string | null> {
  const session = await auth();
  const email = session?.user?.email;
  return email ? email.toLowerCase() : null;
}

// For server components: the owner, or a redirect to sign-in. Use this only on
// pages that need nothing from the session but the owner key; a page that also
// renders the user's name still calls `auth()` directly.
export async function requireOwner(): Promise<string> {
  const owner = await currentOwner();
  if (!owner) redirect("/signin");
  return owner;
}

// The 401 every route handler returns when there is no session email.
export function unauthorized(): Response {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}
