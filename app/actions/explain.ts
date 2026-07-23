"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getOrCreateExplanation } from "@/lib/explain";

export type ExplainActionResult = { ok: boolean; error?: string };

async function requireOwner(): Promise<string | null> {
  const session = await auth();
  const email = session?.user?.email;
  return email ? email.toLowerCase() : null;
}

// Ensure the plain-English explanation for the workout on `date` exists, then
// revalidate the surfaces that show it. Errors are returned, not thrown, so the
// client can offer a retry instead of spinning forever.
export async function explainSession(date: string): Promise<ExplainActionResult> {
  const owner = await requireOwner();
  if (!owner) return { ok: false, error: "unauthorized" };

  try {
    const outcome = await getOrCreateExplanation(owner, date);
    if (outcome.status !== "ready") return { ok: false, error: outcome.status };
  } catch (err) {
    console.error(`explain failed for ${owner} on ${date}:`, err);
    return { ok: false, error: "generation failed" };
  }

  revalidatePath("/");
  revalidatePath(`/plan/${date}`);
  return { ok: true };
}
