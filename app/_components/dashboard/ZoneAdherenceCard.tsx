import type { ZoneAdherence } from "@/lib/stats";
import { formatPercent } from "@/lib/stats";

interface Props {
  data: ZoneAdherence | null;
}

export default function ZoneAdherenceCard({ data }: Props) {
  return (
    <section className="border border-line bg-panel rounded-md p-5">
      <p className="eyebrow mb-2">Aerobic discipline</p>
      {data ? (
        <>
          <p className="font-mono text-canvas text-2xl leading-none mb-1">
            {formatPercent(data.ratio)}
          </p>
          <p className="font-mono text-canvas-dim text-xs">
            {data.adherent} of {data.total} easy runs stayed at or below {data.z2Max} bpm
          </p>
        </>
      ) : (
        <p className="text-canvas-dim text-sm">
          Log an easy run with average HR to see Z2 discipline.
        </p>
      )}
    </section>
  );
}
