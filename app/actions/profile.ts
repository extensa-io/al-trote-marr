"use server";

import { revalidatePath } from "next/cache";
import { currentOwner } from "@/lib/owner";
import { setProfileContext } from "@/lib/db";
import { validateProfileContext } from "@/lib/validation";

export type ProfileContextResult = { ok: boolean; error?: string };

// Save the runner's standing constraints and zone provenance. Both are free
// text the AI prompts read, so they change what future recaps and daily notes
// say; nothing already stored is rewritten. An empty field clears it.
export async function saveProfileContext(input: {
  trainingContext?: string;
  zonesSource?: string;
}): Promise<ProfileContextResult> {
  const owner = await currentOwner();
  if (!owner) return { ok: false, error: "unauthorized" };

  const validated = validateProfileContext(input);
  if (!validated.ok) return { ok: false, error: validated.error };

  try {
    const matched = await setProfileContext(owner, validated.value);
    if (!matched) return { ok: false, error: "no profile to update" };
  } catch (err) {
    console.error(`profile context save failed for ${owner}:`, err);
    return { ok: false, error: "couldn't save" };
  }

  revalidatePath("/settings");
  return { ok: true };
}
