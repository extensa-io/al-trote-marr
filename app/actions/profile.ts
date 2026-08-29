"use server";

import { revalidatePath } from "next/cache";
import { currentOwner } from "@/lib/owner";
import { setProfileContext, setRaceGoal } from "@/lib/db";
import { validateGoalTime, validateProfileContext } from "@/lib/validation";
import { RACE_DISTANCE_KM } from "@/lib/stats";

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

// Set the race goal from a target finish time. The goal and its pace are
// anchors the plan rebuild may not touch, so when they outrun the evidence only
// the runner can correct them; every projection, prescription and note reads
// these two fields.
export async function saveRaceGoal(targetTime: string): Promise<ProfileContextResult> {
  const owner = await currentOwner();
  if (!owner) return { ok: false, error: "unauthorized" };

  const validated = validateGoalTime(targetTime, RACE_DISTANCE_KM);
  if (!validated.ok) return { ok: false, error: validated.error };

  try {
    const matched = await setRaceGoal(owner, validated.value);
    if (!matched) return { ok: false, error: "no profile to update" };
  } catch (err) {
    console.error(`race goal save failed for ${owner}:`, err);
    return { ok: false, error: "couldn't save" };
  }

  // The goal feeds the dashboard projection card and every prescription, so the
  // plan and dashboard need revalidating too, not just settings.
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/plan");
  revalidatePath("/");
  return { ok: true };
}
