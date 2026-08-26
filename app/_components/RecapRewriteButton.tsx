"use client";

import { useState, useTransition } from "react";
import { generateRecap } from "@/app/actions/recap";

interface Props {
  date: string;
}

// Force-regenerates the stored recap for `date`. The recap is otherwise
// idempotent on the run's `updatedAt`, so without this the only way to replace
// one is to edit the logged run. Costs one model call per press.
export default function RecapRewriteButton({ date }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  function run() {
    setError(false);
    startTransition(async () => {
      const result = await generateRecap(date, { force: true });
      if (!result.ok) setError(true);
    });
  }

  // Styled as a bordered control, not with `eyebrow`: that class is what the
  // "Insights" and "Suggestions" labels above use, so the button read as a third
  // section heading and was easy to press by accident. The rule above it
  // separates the action from the content it acts on.
  return (
    <div className="mt-4 pt-4 border-t border-line flex items-center gap-3">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="px-3 py-1.5 border border-line rounded-md font-display uppercase tracking-wider text-xs text-canvas-dim hover:text-canvas hover:border-canvas-dim disabled:opacity-50 disabled:hover:text-canvas-dim disabled:hover:border-line transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
      >
        {pending ? "Rewriting…" : "Rewrite"}
      </button>
      {error && !pending && (
        <span className="text-signal text-sm font-mono">Couldn&apos;t rewrite it.</span>
      )}
    </div>
  );
}
