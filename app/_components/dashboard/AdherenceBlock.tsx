import type { AdherenceCounts } from "@/lib/stats";
import { formatPercent } from "@/lib/stats";

interface Props {
  overall: AdherenceCounts;
  fourWeek: AdherenceCounts;
  streak: number;
}

export default function AdherenceBlock({ overall, fourWeek, streak }: Props) {
  return (
    <section className="border border-line bg-panel rounded-md p-5">
      <p className="eyebrow mb-3">Adherence</p>
      <div className="grid grid-cols-3 gap-4">
        <Metric
          value={overall.due === 0 ? "—" : formatPercent(overall.ratio)}
          label="Overall"
          sub={overall.due === 0 ? "no runs due" : `${overall.done}/${overall.due}`}
        />
        <Metric
          value={fourWeek.due === 0 ? "—" : formatPercent(fourWeek.ratio)}
          label="Last 4 wk"
          sub={fourWeek.due === 0 ? "no runs due" : `${fourWeek.done}/${fourWeek.due}`}
        />
        <Metric value={`${streak}`} label="Streak" sub={streak === 1 ? "run" : "runs"} />
      </div>
    </section>
  );
}

function Metric({ value, label, sub }: { value: string; label: string; sub: string }) {
  return (
    <div>
      <p className="font-mono text-canvas text-2xl leading-none">{value}</p>
      <p className="eyebrow mt-1">{label}</p>
      <p className="font-mono text-canvas-dim text-[0.65rem] mt-0.5">{sub}</p>
    </div>
  );
}
