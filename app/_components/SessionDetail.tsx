"use client";

import { useOptimistic, useState, useTransition } from "react";
import { logActual, markStatus, rescheduleRun } from "@/app/actions/sessions";
import { formatMmSs, formatPace, paceSecPerKm, parseMmSs } from "@/lib/pace";
import { formatNiceDate, shiftDays } from "@/lib/date";
import { stridesFromTitle } from "@/lib/prescription";
import KebabMenu from "@/app/_components/KebabMenu";
import type { Session, Status } from "@/lib/types";

interface Props {
  session: Session;
  hrTarget?: string | null;
}

export default function SessionDetail({ session, hrTarget }: Props) {
  const [optimistic, addOptimistic] = useOptimistic<Session, Partial<Session>>(
    session,
    (current, patch) => ({ ...current, ...patch }),
  );
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [km, setKm] = useState("");
  const [avgHr, setAvgHr] = useState("");
  const [duration, setDuration] = useState("");
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");

  const [rescheduling, setRescheduling] = useState(false);
  const [moveDate, setMoveDate] = useState("");

  function openReschedule() {
    setMoveDate(optimistic.date);
    setError(null);
    setEditing(false);
    setRescheduling(true);
  }

  function runReschedule(toDate: string, swap: boolean) {
    startTransition(async () => {
      const result = await rescheduleRun(optimistic.date, toDate, swap ? { swap: true } : undefined);
      if (result.ok) {
        setRescheduling(false);
        return;
      }
      if ("conflict" in result) {
        if (result.conflict.swappable) {
          const ok = window.confirm(
            `${formatNiceDate(result.conflict.date)} already has a ${result.conflict.label}. Swap them?`,
          );
          if (ok) runReschedule(toDate, true);
          return;
        }
        setError(`${formatNiceDate(result.conflict.date)} already has a ${result.conflict.label}.`);
        return;
      }
      setError(result.error);
    });
  }

  function submitReschedule(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (moveDate === optimistic.date) {
      setError("Pick a different date.");
      return;
    }
    runReschedule(moveDate, false);
  }

  function openLog() {
    setKm("");
    setAvgHr("");
    setDuration("");
    setWeight("");
    setNotes("");
    setError(null);
    setEditing(true);
  }

  function openEdit() {
    setKm(optimistic.actual?.km?.toString() ?? "");
    setAvgHr(optimistic.actual?.avgHr?.toString() ?? "");
    setDuration(
      optimistic.actual?.durationMin != null ? formatMmSs(optimistic.actual.durationMin) : "",
    );
    setWeight(optimistic.actual?.weightKg?.toString() ?? "");
    setNotes(optimistic.actual?.notes ?? "");
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setError(null);
  }

  function changeStatus(next: Status) {
    if (optimistic.status === "done" && next !== "done") {
      const confirmed = window.confirm("This run is already marked done. Change status anyway?");
      if (!confirmed) return;
    }
    setError(null);
    startTransition(async () => {
      addOptimistic({ status: next });
      const result = await markStatus(session.date, next);
      if (!result.ok) setError(result.error);
    });
  }

  function submitLog(event: React.FormEvent) {
    event.preventDefault();

    const trimmedDuration = duration.trim();
    const parsedDuration = trimmedDuration === "" ? undefined : parseMmSs(trimmedDuration);
    if (trimmedDuration !== "" && parsedDuration == null) {
      setError("Duration must be minutes:seconds, like 28:45 or 28.45");
      return;
    }

    if (optimistic.status === "done") {
      const confirmed = window.confirm("This run is already marked done. Save changes anyway?");
      if (!confirmed) return;
    }

    setError(null);
    const optimisticActual = {
      km: km.trim() === "" ? undefined : Number(km),
      avgHr: avgHr.trim() === "" ? undefined : Number(avgHr),
      durationMin: parsedDuration ?? undefined,
      weightKg: weight.trim() === "" ? undefined : Number(weight),
      notes: notes.trim() === "" ? undefined : notes.trim(),
    };

    startTransition(async () => {
      addOptimistic({ status: "done", actual: optimisticActual });
      const result = await logActual(session.date, {
        km: km.trim() === "" ? undefined : km,
        avgHr: avgHr.trim() === "" ? undefined : avgHr,
        durationMin: parsedDuration,
        weightKg: weight.trim() === "" ? undefined : weight,
        notes: notes.trim() === "" ? undefined : notes.trim(),
      });
      if (!result.ok) {
        setError(result.error);
      } else {
        setEditing(false);
      }
    });
  }

  const status = optimistic.status;
  const borderClass =
    status === "done" ? "border-confirmed" : status === "skipped" ? "border-signal" : "border-brass";
  const accentClass =
    status === "done" ? "text-confirmed" : status === "skipped" ? "text-signal" : "text-brass";

  const actual = optimistic.actual;
  const pace =
    actual?.km != null && actual?.durationMin != null
      ? paceSecPerKm(actual.km, actual.durationMin)
      : null;
  const strides = stridesFromTitle(optimistic.title);

  return (
    <section
      className={`border-2 ${borderClass} bg-raised rounded-md p-5 transition-colors`}
      aria-busy={pending}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`font-display uppercase tracking-wider ${accentClass} text-sm`}>
          {optimistic.type} · {optimistic.zone}
          {hrTarget ? ` · ${hrTarget}` : ""}
        </span>
        <span className="font-mono text-canvas-dim text-xs">{optimistic.day}</span>
      </div>
      <p className="text-lg leading-snug mb-3">{optimistic.title}</p>
      {strides != null ? (
        <p className="text-canvas-dim text-xs leading-relaxed mb-3">
          <span className="text-canvas">{strides} strides:</span> ~20s (80–100 m) relaxed
          accelerations to near-fast pace, with a full walk or jog recovery between. They sharpen
          turnover without adding fatigue.
        </p>
      ) : null}
      <p className="font-mono text-canvas-dim text-xs mb-4">
        Planned {optimistic.plannedKm} km · Week {optimistic.week} · {optimistic.phase}
      </p>

      {status !== "planned" && actual && !editing ? (
        <dl className="grid grid-cols-2 gap-y-2 gap-x-4 font-mono text-sm mb-4">
          {actual.km != null && (
            <Row label="Distance" value={`${actual.km} km`} />
          )}
          {pace != null && <Row label="Pace" value={formatPace(pace)} />}
          {actual.durationMin != null && (
            <Row label="Duration" value={formatMmSs(actual.durationMin)} />
          )}
          {actual.avgHr != null && <Row label="Avg HR" value={`${actual.avgHr} bpm`} />}
          {actual.weightKg != null && <Row label="Weight" value={`${actual.weightKg} kg`} />}
          {actual.notes && (
            <div className="col-span-2">
              <p className="eyebrow mb-1">Notes</p>
              <p className="font-body text-canvas text-sm whitespace-pre-wrap">{actual.notes}</p>
            </div>
          )}
        </dl>
      ) : null}

      {editing ? (
        <form onSubmit={submitLog} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Km" htmlFor="km">
              <input
                id="km"
                inputMode="decimal"
                value={km}
                onChange={(e) => setKm(e.target.value)}
                className={inputClass}
                placeholder="5.2"
              />
            </Field>
            <Field label="Avg HR" htmlFor="avgHr">
              <input
                id="avgHr"
                inputMode="numeric"
                value={avgHr}
                onChange={(e) => setAvgHr(e.target.value)}
                className={inputClass}
                placeholder="138"
              />
            </Field>
            <Field label="Duration (min:sec)" htmlFor="duration">
              <input
                id="duration"
                inputMode="decimal"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className={inputClass}
                placeholder="28:45 or 28.45"
              />
            </Field>
            <Field label="Weight (kg)" htmlFor="weight">
              <input
                id="weight"
                inputMode="decimal"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className={inputClass}
                placeholder="72.5"
              />
            </Field>
          </div>
          <p className="font-mono text-canvas-dim text-xs">
            Pace {formatPace(derivePreviewPace(km, duration))}
          </p>
          <Field label="Notes" htmlFor="notes">
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={3}
              className={`${inputClass} resize-none`}
              placeholder="How did it feel?"
            />
          </Field>
          {error ? <p className="text-signal text-sm font-mono">{error}</p> : null}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="flex-1 bg-brass text-field font-display uppercase tracking-wider text-sm py-2 rounded-md disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
            >
              {pending ? "Saving…" : "Save run"}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={pending}
              className="px-4 py-2 border border-line rounded-md font-display uppercase tracking-wider text-sm text-canvas-dim hover:text-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : rescheduling ? (
        <form onSubmit={submitReschedule} className="space-y-3">
          <Field label="New date" htmlFor="moveDate">
            <input
              id="moveDate"
              type="date"
              value={moveDate}
              onChange={(e) => setMoveDate(e.target.value)}
              className={inputClass}
            />
          </Field>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMoveDate(shiftDays(moveDate || optimistic.date, -1))}
              disabled={pending}
              className="px-3 py-1.5 border border-line rounded-md font-mono text-sm text-canvas-dim hover:text-canvas disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
            >
              −1 day
            </button>
            <button
              type="button"
              onClick={() => setMoveDate(shiftDays(moveDate || optimistic.date, 1))}
              disabled={pending}
              className="px-3 py-1.5 border border-line rounded-md font-mono text-sm text-canvas-dim hover:text-canvas disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
            >
              +1 day
            </button>
          </div>
          {moveDate ? (
            <p className="font-mono text-canvas-dim text-xs">Moving to {formatNiceDate(moveDate)}</p>
          ) : null}
          {error ? <p className="text-signal text-sm font-mono">{error}</p> : null}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="flex-1 bg-brass text-field font-display uppercase tracking-wider text-sm py-2 rounded-md disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
            >
              {pending ? "Moving…" : "Move"}
            </button>
            <button
              type="button"
              onClick={() => {
                setRescheduling(false);
                setError(null);
              }}
              disabled={pending}
              className="px-4 py-2 border border-line rounded-md font-display uppercase tracking-wider text-sm text-canvas-dim hover:text-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          {error ? <p className="text-signal text-sm font-mono mb-3">{error}</p> : null}
          <div className="flex gap-2">
            {status === "planned" ? (
              <>
                <button
                  type="button"
                  onClick={openLog}
                  disabled={pending}
                  className="flex-1 bg-brass text-field font-display uppercase tracking-wider text-sm py-2 rounded-md disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
                >
                  Log
                </button>
                <KebabMenu
                  disabled={pending}
                  items={[
                    { label: "Reschedule", onSelect: openReschedule },
                    { label: "Mark done", onSelect: () => changeStatus("done") },
                    { label: "Skip", onSelect: () => changeStatus("skipped"), destructive: true },
                  ]}
                />
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={openEdit}
                  disabled={pending}
                  className="flex-1 bg-brass text-field font-display uppercase tracking-wider text-sm py-2 rounded-md disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
                >
                  {status === "done" ? "Edit" : "Log"}
                </button>
                <KebabMenu
                  disabled={pending}
                  items={[
                    { label: "Mark planned", onSelect: () => changeStatus("planned") },
                    ...(status === "skipped"
                      ? [{ label: "Reschedule", onSelect: openReschedule }]
                      : []),
                    {
                      label: status === "skipped" ? "Mark done" : "Skip",
                      onSelect: () => changeStatus(status === "skipped" ? "done" : "skipped"),
                      destructive: status !== "skipped",
                    },
                  ]}
                />
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}

const inputClass =
  "w-full bg-panel border border-line rounded-md px-3 py-2 font-mono text-canvas placeholder:text-canvas-dim/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1">
      {label ? <span className="eyebrow">{label}</span> : null}
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="eyebrow mb-0.5">{label}</p>
      <p className="text-canvas">{value}</p>
    </div>
  );
}

function derivePreviewPace(km: string, duration: string): number | null {
  const kmNum = Number(km);
  const durationMin = parseMmSs(duration);
  if (!Number.isFinite(kmNum) || durationMin == null) return null;
  return paceSecPerKm(kmNum, durationMin);
}
