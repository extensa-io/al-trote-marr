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

  return (
    <div className="mt-4 flex items-baseline gap-3">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="eyebrow text-canvas-dim hover:text-canvas disabled:hover:text-canvas-dim focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass rounded-sm"
      >
        {pending ? "Rewriting…" : "Rewrite"}
      </button>
      {error && !pending && (
        <span className="text-canvas-dim text-sm">Couldn&apos;t rewrite it.</span>
      )}
    </div>
  );
}
