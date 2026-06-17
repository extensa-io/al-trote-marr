"use client";

import { useOptimistic, useState, useTransition } from "react";
import { logActual, markStatus } from "@/app/actions/sessions";
import { formatMmSs, formatPace, paceSecPerKm, parseMmSs } from "@/lib/pace";
import type { Session, Status } from "@/lib/types";

interface Props {
  session: Session;
}

export default function TodayFocus({ session }: Props) {
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
  const [notes, setNotes] = useState("");

  function openLog() {
    setKm("");
    setAvgHr("");
    setDuration("");
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
      setError("Duration must be mm:ss, like 28:45");
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
      notes: notes.trim() === "" ? undefined : notes.trim(),
    };

    startTransition(async () => {
      addOptimistic({ status: "done", actual: optimisticActual });
      const result = await logActual(session.date, {
        km: km.trim() === "" ? undefined : km,
        avgHr: avgHr.trim() === "" ? undefined : avgHr,
        durationMin: parsedDuration,
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

  return (
    <section
      className={`border-2 ${borderClass} bg-raised rounded-md p-5 transition-colors`}
      aria-busy={pending}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`font-display uppercase tracking-wider ${accentClass} text-sm`}>
          {optimistic.type} · {optimistic.zone}
        </span>
        <span className="font-mono text-canvas-dim text-xs">{optimistic.day}</span>
      </div>
      <p className="text-lg leading-snug mb-3">{optimistic.title}</p>
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
            <Field label="Duration (mm:ss)" htmlFor="duration">
              <input
                id="duration"
                inputMode="numeric"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className={inputClass}
                placeholder="28:45"
              />
            </Field>
            <Field label="" htmlFor="">
              <span className="font-mono text-canvas-dim text-xs self-end">
                Pace {formatPace(derivePreviewPace(km, duration))}
              </span>
            </Field>
          </div>
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
      ) : (
        <>
          {error ? <p className="text-signal text-sm font-mono mb-3">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            {status === "planned" ? (
              <>
                <button
                  type="button"
                  onClick={() => changeStatus("done")}
                  disabled={pending}
                  className="flex-1 min-w-[8rem] bg-brass text-field font-display uppercase tracking-wider text-sm py-2 rounded-md disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
                >
                  Mark done
                </button>
                <button
                  type="button"
                  onClick={() => changeStatus("skipped")}
                  disabled={pending}
                  className="px-4 py-2 border border-line rounded-md font-display uppercase tracking-wider text-sm text-canvas-dim hover:text-canvas disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={openLog}
                  disabled={pending}
                  className="px-4 py-2 border border-line rounded-md font-display uppercase tracking-wider text-sm text-canvas-dim hover:text-canvas disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
                >
                  Log run
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={openEdit}
                  disabled={pending}
                  className="flex-1 min-w-[8rem] bg-brass text-field font-display uppercase tracking-wider text-sm py-2 rounded-md disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
                >
                  {status === "done" ? "Edit run" : "Log run"}
                </button>
                <button
                  type="button"
                  onClick={() => changeStatus("planned")}
                  disabled={pending}
                  className="px-4 py-2 border border-line rounded-md font-display uppercase tracking-wider text-sm text-canvas-dim hover:text-canvas disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
                >
                  Mark planned
                </button>
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
