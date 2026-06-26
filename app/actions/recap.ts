"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { generateAndStoreRecap } from "@/lib/recap";

export type RecapActionResult = { ok: boolean; error?: string };

async function requireOwner(): Promise<string | null> {
  const session = await auth();
  const email = session?.user?.email;
  return email ? email.toLowerCase() : null;
}

// Generate (or refresh) the recap for the run logged on `date`, then revalidate
// the surfaces that show it. Errors are returned, not thrown, so the client can
// show a retry affordance instead of spinning forever.
export async function generateRecap(date: string): Promise<RecapActionResult> {
  const owner = await requireOwner();
  if (!owner) return { ok: false, error: "unauthorized" };

  try {
    await generateAndStoreRecap(owner, date);
  } catch (err) {
    console.error(`recap failed for ${owner} on ${date}:`, err);
    return { ok: false, error: "generation failed" };
  }

  revalidatePath("/");
  revalidatePath("/plan");
  revalidatePath(`/plan/${date}`);
  return { ok: true };
}
