"use client";

import { useState, useTransition } from "react";
import { applyPlanRebuild, previewPlanRebuild } from "@/app/actions/rebuild";
import { formatDayShort } from "@/lib/date";
import { useReducedMotion } from "@/lib/useReducedMotion";
import type { LongRunStep, RebuildSession } from "@/lib/rebuild";

type View =
  | { step: "idle" }
  | { step: "review"; proposal: RebuildSession[]; longRun: LongRunStep[] }
  | { step: "done"; count: number };

export default function RebuildPlanControls() {
  const [view, setView] = useState<View>({ step: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const reduceMotion = useReducedMotion();
  const pulse = reduceMotion ? "" : "animate-pulse";

  function preview() {
    setError(null);
    startTransition(async () => {
      const result = await previewPlanRebuild();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setView({ step: "review", proposal: result.proposal, longRun: result.longRun });
    });
  }

  function apply(proposal: RebuildSession[]) {
    setError(null);
    startTransition(async () => {
      const result = await applyPlanRebuild(proposal);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setView({ step: "done", count: result.count });
    });
  }

  function discard() {
    setError(null);
    setView({ step: "idle" });
  }

  return (
    <section className="border border-line bg-panel rounded-md p-4 mb-6">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow mb-1">Rebuild plan</p>
          <p className="text-canvas-dim text-sm leading-snug">
            Re-scale your upcoming runs to your recent training. Your race and logged
            history stay put.
          </p>
        </div>
        {view.step === "idle" ? (
          <button
            type="button"
            onClick={preview}
            disabled={pending}
            className="shrink-0 px-3 py-1.5 border border-brass rounded-md font-display uppercase tracking-wider text-xs text-brass hover:brightness-110 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
          >
            {pending ? "Reviewing…" : "Rebuild"}
          </button>
        ) : null}
      </div>

      {pending && view.step === "idle" ? (
        <p className={`text-canvas-dim text-sm mt-3 ${pulse}`}>
          Reviewing your recent training…
        </p>
      ) : null}

      {view.step === "review" ? (
        <div className="mt-4">
          <p className="text-canvas text-sm leading-relaxed mb-3">
            Proposed long-run progression from here to race day:
          </p>
          <ul className="space-y-1 mb-4">
            {view.longRun.map((s) => (
              <li
                key={s.date}
                className="flex items-baseline justify-between gap-3 font-mono text-sm"
              >
                <span className="text-canvas-dim">
                  Week {s.week} · {formatDayShort(s.date)}
                </span>
                <span className="text-canvas">{s.plannedKm} km</span>
              </li>
            ))}
          </ul>
          <p className="text-canvas-dim text-xs mb-4">
            {view.proposal.length} upcoming session
            {view.proposal.length === 1 ? "" : "s"} will be rewritten.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => apply(view.proposal)}
              disabled={pending}
              className="px-3 py-1.5 bg-brass text-field rounded-md font-display uppercase tracking-wider text-xs hover:brightness-110 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
            >
              {pending ? "Saving…" : "Apply"}
            </button>
            <button
              type="button"
              onClick={discard}
              disabled={pending}
              className="px-3 py-1.5 border border-line rounded-md font-display uppercase tracking-wider text-xs text-canvas-dim hover:text-canvas disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
            >
              Discard
            </button>
          </div>
        </div>
      ) : null}

      {view.step === "done" ? (
        <p className="text-confirmed text-sm mt-3">
          Plan rebuilt. {view.count} upcoming session{view.count === 1 ? "" : "s"} updated.
        </p>
      ) : null}

      {error ? (
        <p className="text-signal text-sm mt-3" role="alert">
          {error}{" "}
          <button
            type="button"
            onClick={view.step === "review" ? () => apply(view.proposal) : preview}
            className="text-brass underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
          >
            Try again
          </button>
        </p>
      ) : null}
    </section>
  );
}
