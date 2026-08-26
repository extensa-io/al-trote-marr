"use client";

import { useState, useTransition } from "react";
import { saveProfileContext } from "@/app/actions/profile";

interface Props {
  trainingContext: string;
  zonesSource: string;
}

const TRAINING_MAX = 1000;
const ZONES_MAX = 200;

// Edits the two free-text fields the AI prompts read. Until this existed the
// only way to set them was a terminal script with a database connection, which
// meant the text shaping every recap and daily note was the least editable thing
// in the app.
export default function ContextEditor({ trainingContext, zonesSource }: Props) {
  const [training, setTraining] = useState(trainingContext);
  const [zones, setZones] = useState(zonesSource);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = training !== trainingContext || zones !== zonesSource;

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveProfileContext({
        trainingContext: training,
        zonesSource: zones,
      });
      if (result.ok) setSaved(true);
      else setError(result.error ?? "couldn't save");
    });
  }

  return (
    <section className="border border-line bg-panel rounded-md p-5 mb-4">
      <p className="eyebrow mb-1">How your numbers are read</p>
      <p className="text-canvas-dim text-xs leading-relaxed mb-4">
        Standing facts that change what your stats mean. Every AI note and recap reads this, so a
        metric one of these explains stops being reported as a fitness signal.
      </p>

      <label className="block mb-4">
        <span className="eyebrow mb-1.5 block">Training context</span>
        <textarea
          value={training}
          onChange={(e) => setTraining(e.target.value)}
          maxLength={TRAINING_MAX}
          rows={5}
          disabled={pending}
          placeholder="e.g. Easy Z2 runs are run/walk intervals, so average pace reflects the walk ratio, not turnover."
          className="w-full bg-field border border-line rounded-md px-3 py-2 text-canvas text-sm leading-relaxed resize-none focus:border-brass focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
        />
        <span className="font-mono text-canvas-dim text-[0.65rem] mt-1 block">
          {training.length}/{TRAINING_MAX}
        </span>
      </label>

      <label className="block mb-4">
        <span className="eyebrow mb-1.5 block">Where your zones came from</span>
        <input
          value={zones}
          onChange={(e) => setZones(e.target.value)}
          maxLength={ZONES_MAX}
          disabled={pending}
          placeholder="e.g. observed from Garmin data, not formula-derived"
          className="w-full bg-field border border-line rounded-md px-3 py-2 text-canvas text-sm focus:border-brass focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
        />
      </label>

      {error ? <p className="text-signal text-sm font-mono mb-3">{error}</p> : null}

      <div className="flex items-baseline gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty}
          className="bg-brass text-field font-display uppercase tracking-wider text-sm px-4 py-2 rounded-md disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {saved && !dirty ? (
          <span className="font-mono text-confirmed text-xs">
            Saved. Takes effect on the next note or recap.
          </span>
        ) : null}
      </div>
    </section>
  );
}
