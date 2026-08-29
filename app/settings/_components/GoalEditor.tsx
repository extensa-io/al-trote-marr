"use client";

import { useState, useTransition } from "react";
import { saveRaceGoal } from "@/app/actions/profile";

interface Props {
  goal: string;
  goalPace: string;
}

// Edits the race goal as a target finish time, deriving the pace from it. The
// two were seed-only and free to disagree; a goal pace the runner cannot hold is
// what made the plan rebuild prescribe unrunnable goal-pace sessions, and
// nothing in the app could correct it.
export default function GoalEditor({ goal, goalPace }: Props) {
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveRaceGoal(target);
      if (result.ok) setEditing(false);
      else setError(result.error ?? "couldn't save");
    });
  }

  if (!editing) {
    return (
      <div className="mt-4 pt-4 border-t border-line flex items-center justify-between gap-3">
        <p className="font-mono text-canvas-dim text-xs">
          Target {goal} · {goalPace}
        </p>
        <button
          type="button"
          onClick={() => {
            setTarget("");
            setError(null);
            setEditing(true);
          }}
          className="px-3 py-1.5 border border-line rounded-md font-display uppercase tracking-wider text-xs text-canvas-dim hover:text-canvas hover:border-canvas-dim transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-line">
      <label className="block mb-3">
        <span className="eyebrow mb-1.5 block">Target finish time</span>
        <input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          inputMode="numeric"
          disabled={pending}
          placeholder="3:20"
          className="w-full bg-field border border-line rounded-md px-3 py-2 font-mono text-canvas text-sm focus:border-brass focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
        />
        <span className="block text-canvas-dim text-xs leading-relaxed mt-1.5">
          Pace is worked out from this. It sets what every plan rebuild, projection and note
          measures you against.
        </span>
      </label>
      {error ? <p className="text-signal text-sm font-mono mb-3">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={pending || !target.trim()}
          className="bg-brass text-field font-display uppercase tracking-wider text-sm px-4 py-2 rounded-md disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={pending}
          className="px-4 py-2 border border-line rounded-md font-display uppercase tracking-wider text-sm text-canvas-dim hover:text-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
