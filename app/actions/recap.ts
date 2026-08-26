"use server";

import { revalidatePath } from "next/cache";
import { currentOwner } from "@/lib/owner";
import { generateAndStoreRecap } from "@/lib/recap";

export type RecapActionResult = { ok: boolean; error?: string };

// Generate (or refresh) the recap for the run logged on `date`, then revalidate
// the surfaces that show it. Errors are returned, not thrown, so the client can
// show a retry affordance instead of spinning forever.
//
// `force` bypasses the stored recap's `runUpdatedAt` idempotency check and
// re-bills one call. It exists so a recap the runner doesn't want to keep can be
// rewritten without editing the logged run. Only the date is accepted from the
// client; the owner comes from the session.
export async function generateRecap(
  date: string,
  opts: { force?: boolean } = {}
): Promise<RecapActionResult> {
  const owner = await currentOwner();
  if (!owner) return { ok: false, error: "unauthorized" };

  try {
    await generateAndStoreRecap(owner, date, { force: opts.force });
  } catch (err) {
    console.error(`recap failed for ${owner} on ${date}:`, err);
    return { ok: false, error: "generation failed" };
  }

  revalidatePath("/");
  revalidatePath("/plan");
  revalidatePath(`/plan/${date}`);
  return { ok: true };
}
