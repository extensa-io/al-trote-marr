"use client";

import { useState, useTransition } from "react";
import { shiftWeek } from "@/app/actions/sessions";

interface Props {
  week: number;
}

export default function WeekShiftControls({ week }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function shift(delta: number) {
    setError(null);
    startTransition(async () => {
      const result = await shiftWeek(week, delta);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={`Shift week ${week} one day earlier`}
        disabled={pending}
        onClick={() => shift(-1)}
        className="px-2 py-0.5 border border-line rounded-md font-mono text-xs text-canvas-dim hover:text-canvas disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
      >
        ◀ day
      </button>
      <button
        type="button"
        aria-label={`Shift week ${week} one day later`}
        disabled={pending}
        onClick={() => shift(1)}
        className="px-2 py-0.5 border border-line rounded-md font-mono text-xs text-canvas-dim hover:text-canvas disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
      >
        day ▶
      </button>
      {error ? <span className="font-mono text-signal text-xs">{error}</span> : null}
    </div>
  );
}
