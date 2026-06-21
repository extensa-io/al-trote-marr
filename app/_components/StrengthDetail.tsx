"use client";

import { useOptimistic, useState, useTransition } from "react";
import { logActual, markStatus } from "@/app/actions/sessions";
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
  const [notes, setNotes] = useState("");

  function openNote() {
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

  function submitNote(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const trimmed = notes.trim();
    startTransition(async () => {
      addOptimistic({ status: "done", actual: { notes: trimmed || undefined } });
      const result = await logActual(session.date, { notes: trimmed || undefined });
      if (!result.ok) setError(result.error);
      else setEditing(false);
    });
  }

  const status = optimistic.status;
  const borderClass =
    status === "done" ? "border-confirmed" : status === "skipped" ? "border-signal" : "border-brass";
  const accentClass =
    status === "done" ? "text-confirmed" : status === "skipped" ? "text-signal" : "text-brass";

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

      {status !== "planned" && optimistic.actual?.notes && !editing ? (
        <div className="mb-4">
          <p className="eyebrow mb-1">Notes</p>
          <p className="font-body text-canvas text-sm whitespace-pre-wrap">
            {optimistic.actual.notes}
          </p>
        </div>
      ) : null}

      {editing ? (
        <form onSubmit={submitNote} className="space-y-3">
          <label htmlFor="strength-notes" className="flex flex-col gap-1">
            <span className="eyebrow">Notes</span>
            <textarea
              id="strength-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={3}
              className={`${inputClass} resize-none`}
              placeholder="How did it feel? Weights used?"
            />
          </label>
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
                  onClick={openNote}
                  disabled={pending}
                  className="px-4 py-2 border border-line rounded-md font-display uppercase tracking-wider text-sm text-canvas-dim hover:text-canvas disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
                >
                  Add note
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={openNote}
                  disabled={pending}
                  className="flex-1 min-w-[8rem] bg-brass text-field font-display uppercase tracking-wider text-sm py-2 rounded-md disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
                >
                  {optimistic.actual?.notes ? "Edit note" : "Add note"}
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
