"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { generateRecap } from "@/app/actions/recap";

interface Props {
  date: string;
}

// Fires recap generation for `date` on mount and shows a placeholder until the
// action's revalidation re-renders the home page and swaps this out for the
// recap. On failure it offers a retry rather than spinning forever.
export default function RecapGenerator({ date }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);
  const fired = useRef(false);

  function run() {
    setError(false);
    startTransition(async () => {
      const result = await generateRecap(date);
      if (!result.ok) setError(true);
    });
  }

  useEffect(() => {
    // Guard against React's double-invoke in development; the server action is
    // also idempotent, so at worst this avoids a redundant round trip.
    if (fired.current) return;
    fired.current = true;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  if (error && !pending) {
    return (
      <section className="border border-line bg-panel rounded-md p-4">
        <p className="eyebrow mb-2">Run recap</p>
        <p className="text-canvas-dim text-sm leading-relaxed">
          Couldn&apos;t write a recap.{" "}
          <button
            type="button"
            onClick={run}
            className="text-brass underline underline-offset-2"
          >
            Try again
          </button>
        </p>
      </section>
    );
  }

  return (
    <section className="border border-line bg-panel rounded-md p-4" aria-busy="true">
      <p className="eyebrow mb-2">Run recap</p>
      <p className="text-canvas-dim text-sm leading-relaxed animate-pulse">
        Writing recap…
      </p>
    </section>
  );
}
