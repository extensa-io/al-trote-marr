"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { updateSession } from "@/lib/db";
import type { Session } from "@/lib/types";
import {
  validateActual,
  validateStatus,
  type ActualInput,
} from "@/lib/validation";

export type ActionResult =
  | { ok: true; session: Session }
  | { ok: false; error: string };

async function requireOwner(): Promise<string | null> {
  const session = await auth();
  const email = session?.user?.email;
  return email ? email.toLowerCase() : null;
}

export async function markStatus(date: string, status: string): Promise<ActionResult> {
  const owner = await requireOwner();
  if (!owner) return { ok: false, error: "unauthorized" };

  const checked = validateStatus(status);
  if (!checked.ok) return checked;

  const updated = await updateSession(owner, date, { status: checked.value });
  if (!updated) return { ok: false, error: "not found" };

  revalidateAll(date);
  return { ok: true, session: updated };
}

function revalidateAll(date: string) {
  revalidatePath("/");
  revalidatePath("/plan");
  revalidatePath(`/plan/${date}`);
}

export async function logActual(date: string, input: ActualInput): Promise<ActionResult> {
  const owner = await requireOwner();
  if (!owner) return { ok: false, error: "unauthorized" };

  const checked = validateActual(input);
  if (!checked.ok) return checked;

  const updated = await updateSession(owner, date, {
    status: "done",
    actual: checked.value,
  });
  if (!updated) return { ok: false, error: "not found" };

  revalidateAll(date);
  return { ok: true, session: updated };
}
