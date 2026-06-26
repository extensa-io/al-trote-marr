"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  getSession,
  getSessionsInWeek,
  moveSessions,
  updateSession,
} from "@/lib/db";
import { shiftDays } from "@/lib/date";
import type { Session } from "@/lib/types";
import {
  validateActual,
  validateStatus,
  type ActualInput,
} from "@/lib/validation";

export type ActionResult =
  | { ok: true; session: Session }
  | { ok: false; error: string };

export interface RescheduleConflict {
  date: string;
  label: string;
  swappable: boolean;
}

export type RescheduleResult =
  | { ok: true; session: Session }
  | { ok: false; error: string }
  | { ok: false; conflict: RescheduleConflict };

export type ShiftResult =
  | { ok: true; moved: number }
  | { ok: false; error: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MOVABLE = new Set(["planned", "skipped"]);

function sessionLabel(s: Session): string {
  return s.type === "Strength" ? "strength session" : `${s.type} · ${s.zone}`;
}

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

export async function rescheduleRun(
  fromDate: string,
  toDate: string,
  opts?: { swap?: boolean }
): Promise<RescheduleResult> {
  const owner = await requireOwner();
  if (!owner) return { ok: false, error: "unauthorized" };

  if (!DATE_RE.test(toDate)) return { ok: false, error: "invalid date" };
  if (toDate === fromDate) return { ok: false, error: "pick a different date" };

  const source = await getSession(owner, fromDate);
  if (!source) return { ok: false, error: "not found" };
  if (source.type === "Strength") return { ok: false, error: "strength sessions can't be moved" };
  if (!MOVABLE.has(source.status))
    return { ok: false, error: "only upcoming runs can be moved" };

  const target = await getSession(owner, toDate);
  if (!target) {
    await moveSessions(owner, [{ from: fromDate, to: toDate }]);
  } else {
    const swappable = target.type !== "Strength" && MOVABLE.has(target.status);
    if (!opts?.swap || !swappable) {
      return { ok: false, conflict: { date: toDate, label: sessionLabel(target), swappable } };
    }
    await moveSessions(owner, [
      { from: fromDate, to: toDate },
      { from: toDate, to: fromDate },
    ]);
  }

  revalidateAll(fromDate);
  revalidatePath(`/plan/${toDate}`);
  const moved = await getSession(owner, toDate);
  if (!moved) return { ok: false, error: "not found" };
  return { ok: true, session: moved };
}

export async function shiftWeek(week: number, deltaDays: number): Promise<ShiftResult> {
  const owner = await requireOwner();
  if (!owner) return { ok: false, error: "unauthorized" };
  if (deltaDays === 0) return { ok: false, error: "nothing to shift" };

  const inWeek = await getSessionsInWeek(owner, week);
  const movers = inWeek.filter((s) => s.type !== "Strength" && MOVABLE.has(s.status));
  if (movers.length === 0) return { ok: false, error: "no movable runs this week" };

  const moverDates = new Set(movers.map((s) => s.date));
  const moves = movers.map((s) => ({ from: s.date, to: shiftDays(s.date, deltaDays) }));

  // Block if any target lands on a session that isn't itself moving (strength,
  // done run, or a session in another week). No partial shift.
  for (const m of moves) {
    if (moverDates.has(m.to)) continue;
    const occupant = await getSession(owner, m.to);
    if (occupant) {
      return {
        ok: false,
        error: `Can't shift: ${m.to} already has a ${sessionLabel(occupant)}.`,
      };
    }
  }

  await moveSessions(owner, moves);
  revalidatePath("/");
  revalidatePath("/plan");
  revalidatePath("/dashboard");
  return { ok: true, moved: moves.length };
}
