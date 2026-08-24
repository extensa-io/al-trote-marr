"use server";

import { revalidatePath } from "next/cache";
import { currentOwner } from "@/lib/owner";
import { applyRebuild, previewRebuild, type LongRunStep, type RebuildSession } from "@/lib/rebuild";

export type PreviewResult =
  | { ok: true; proposal: RebuildSession[]; longRun: LongRunStep[] }
  | { ok: false; error: string };

export type ApplyResult = { ok: true; count: number } | { ok: false; error: string };

// Generate a proposed rebuild of the upcoming plan and hand it back to the
// client for review. Nothing is written here. Errors are returned, not thrown,
// so the control can offer a retry.
export async function previewPlanRebuild(): Promise<PreviewResult> {
  const owner = await currentOwner();
  if (!owner) return { ok: false, error: "unauthorized" };

  try {
    const outcome = await previewRebuild(owner);
    switch (outcome.status) {
      case "ready":
        return { ok: true, proposal: outcome.proposal, longRun: outcome.longRun };
      case "no-profile":
        return { ok: false, error: "Set up your profile before rebuilding the plan." };
      case "nothing-to-rebuild":
        return { ok: false, error: "No upcoming runs to rebuild." };
      case "no-data":
        return { ok: false, error: "Couldn't build a plan. Try again." };
    }
  } catch (err) {
    console.error(`plan rebuild preview failed for ${owner}:`, err);
    return { ok: false, error: "Couldn't build a plan. Try again." };
  }
}

// Commit a previously previewed rebuild. The proposal is re-validated
// server-side against the owner's current upcoming runs before any write.
export async function applyPlanRebuild(proposal: RebuildSession[]): Promise<ApplyResult> {
  const owner = await currentOwner();
  if (!owner) return { ok: false, error: "unauthorized" };

  try {
    const outcome = await applyRebuild(owner, proposal);
    switch (outcome.status) {
      case "applied":
        revalidatePath("/");
        revalidatePath("/plan");
        revalidatePath("/dashboard");
        return { ok: true, count: outcome.count };
      case "nothing-to-rebuild":
        return { ok: false, error: "No upcoming runs to rebuild." };
      case "invalid":
        return { ok: false, error: "That plan is no longer valid. Rebuild again." };
    }
  } catch (err) {
    console.error(`plan rebuild apply failed for ${owner}:`, err);
    return { ok: false, error: "Couldn't save the plan. Try again." };
  }
}
