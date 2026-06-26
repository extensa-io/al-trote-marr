"use client";

import { useOptimistic, useState, useTransition } from "react";
import { logActual, markStatus } from "@/app/actions/sessions";
import KebabMenu from "@/app/_components/KebabMenu";
import type { Session, Status } from "@/lib/types";

interface Props {
  session: Session;
}

export default function StrengthDetail({ session }: Props) {
  const [optimistic, addOptimistic] = useOptimistic<Session, Partial<Session>>(
    session,
    (current, patch) => ({ ...current, ...patch }),
  );
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [duration, setDuration] = useState("");
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");

  function openLog() {
    setDuration(optimistic.actual?.durationMin?.toString() ?? "");
    setWeight(optimistic.actual?.weightKg?.toString() ?? "");
    setNotes(optimistic.actual?.notes ?? "");
    setError(null);
    setEditing(true);
  }

  function changeStatus(next: Status) {
    if (optimistic.status === "done" && next !== "done") {
      const confirmed = window.confirm("This session is already marked done. Change status anyway?");
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

    if (duration.trim() !== "" && !Number.isFinite(Number(duration))) {
      setError("Time spent must be a number of minutes");
      return;
    }

    if (optimistic.status === "done") {
      const confirmed = window.confirm("This session is already marked done. Save changes anyway?");
      if (!confirmed) return;
    }

    setError(null);
    const trimmedNotes = notes.trim();
    const optimisticActual = {
      durationMin: duration.trim() === "" ? undefined : Number(duration),
      weightKg: weight.trim() === "" ? undefined : Number(weight),
      notes: trimmedNotes || undefined,
    };

    startTransition(async () => {
      addOptimistic({ status: "done", actual: optimisticActual });
      const result = await logActual(session.date, {
        durationMin: duration.trim() === "" ? undefined : duration,
        weightKg: weight.trim() === "" ? undefined : weight,
        notes: trimmedNotes || undefined,
      });
      if (!result.ok) setError(result.error);
      else setEditing(false);
    });
  }

  const status = optimistic.status;
  const borderClass =
    status === "done" ? "border-confirmed" : status === "skipped" ? "border-signal" : "border-brass";
  const accentClass =
    status === "done" ? "text-confirmed" : status === "skipped" ? "text-signal" : "text-brass";

  const actual = optimistic.actual;
  const hasLog =
    status !== "planned" &&
    (actual?.durationMin != null || actual?.weightKg != null || actual?.notes);

  return (
    <section
      className={`border-2 ${borderClass} bg-raised rounded-md p-5 transition-colors`}
      aria-busy={pending}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`font-display uppercase tracking-wider ${accentClass} text-sm`}>
          Strength
        </span>
        <span className="font-mono text-canvas-dim text-xs">{optimistic.day}</span>
      </div>
      <p className="text-lg leading-snug mb-3">{optimistic.title}</p>
      <p className="font-mono text-canvas-dim text-xs mb-4">
        ~15-20 min · dumbbells, bands, or bodyweight · Week {optimistic.week} · {optimistic.phase}
      </p>

      {optimistic.exercises && optimistic.exercises.length > 0 ? (
        <ul className="mb-4 divide-y divide-line/60">
          {optimistic.exercises.map((ex) => (
            <li key={ex.name} className="flex items-baseline justify-between gap-3 py-1.5">
              <span className="text-canvas text-sm leading-snug">{ex.name}</span>
              <span className="font-mono text-canvas-dim text-sm shrink-0">{ex.detail}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {hasLog && !editing ? (
        <dl className="grid grid-cols-2 gap-y-2 gap-x-4 font-mono text-sm mb-4">
          {actual?.durationMin != null && (
            <Row label="Time spent" value={`${actual.durationMin} min`} />
          )}
          {actual?.weightKg != null && <Row label="Weight" value={`${actual.weightKg} kg`} />}
          {actual?.notes && (
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
            <Field label="Time spent (min)" htmlFor="strength-duration">
              <input
                id="strength-duration"
                inputMode="numeric"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className={inputClass}
                placeholder="20"
              />
            </Field>
            <Field label="Weight (kg)" htmlFor="strength-weight">
              <input
                id="strength-weight"
                inputMode="decimal"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className={inputClass}
                placeholder="72.5"
              />
            </Field>
          </div>
          <Field label="Notes" htmlFor="strength-notes">
            <textarea
              id="strength-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={3}
              className={`${inputClass} resize-none`}
              placeholder="How did it feel? Weights used?"
            />
          </Field>
          {error ? <p className="text-signal text-sm font-mono">{error}</p> : null}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="flex-1 bg-brass text-field font-display uppercase tracking-wider text-sm py-2 rounded-md disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
            >
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
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
            <button
              type="button"
              onClick={openLog}
              disabled={pending}
              className="flex-1 bg-brass text-field font-display uppercase tracking-wider text-sm py-2 rounded-md disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
            >
              {status === "done" ? "Edit" : "Log"}
            </button>
            {status === "planned" ? (
              <KebabMenu
                disabled={pending}
                items={[
                  { label: "Mark done", onSelect: () => changeStatus("done") },
                  { label: "Skip", onSelect: () => changeStatus("skipped"), destructive: true },
                ]}
              />
            ) : (
              <KebabMenu
                disabled={pending}
                items={[
                  { label: "Mark planned", onSelect: () => changeStatus("planned") },
                  {
                    label: status === "skipped" ? "Mark done" : "Skip",
                    onSelect: () => changeStatus(status === "skipped" ? "done" : "skipped"),
                    destructive: status !== "skipped",
                  },
                ]}
              />
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
