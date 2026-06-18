import type { EstimatedFinish } from "@/lib/stats";
import { formatHms } from "@/lib/stats";
import { formatPace } from "@/lib/pace";
import { formatNiceDate } from "@/lib/date";

interface Props {
  data: EstimatedFinish | null;
}

export default function EstimatedFinishCard({ data }: Props) {
  return (
    <section className="border border-line bg-panel rounded-md p-5">
      <div className="flex items-baseline justify-between mb-2">
        <p className="eyebrow">Projected finish</p>
        <p className="font-mono text-canvas-dim text-[0.65rem] uppercase tracking-wider">
          Estimate
        </p>
      </div>
      {data ? (
        <>
          <p className="font-mono text-brass text-3xl leading-none mb-1">
            {formatHms(data.totalSeconds)}
          </p>
          <p className="font-mono text-canvas-dim text-xs">
            {formatPace(data.paceSecPerKm)} from {data.source.type.toLowerCase()} on{" "}
            {formatNiceDate(data.source.date)}
          </p>
        </>
      ) : (
        <p className="text-canvas-dim text-sm">
          Log a quality or goal-pace run to see a projection.
        </p>
      )}
    </section>
  );
}
