import type { RaceProjection } from "@/lib/stats";
import { formatHms } from "@/lib/stats";
import { formatPace } from "@/lib/pace";
import { formatNiceDate } from "@/lib/date";

interface Props {
  data: RaceProjection[];
}

const BASIS_LABEL: Record<RaceProjection["basis"], string> = {
  speed: "Speed",
  endurance: "Endurance",
};

// Riegel-scaled projections, up to one per basis. The headline is the slower of
// the two: the endurance side is what decides a first half marathon, and showing
// the optimistic number alone was the old card's flattery.
export default function EstimatedFinishCard({ data }: Props) {
  const headline = data.length
    ? data.reduce((a, b) => (b.totalSeconds > a.totalSeconds ? b : a))
    : null;

  return (
    <section className="border border-line bg-panel rounded-md p-5">
      <div className="flex items-baseline justify-between mb-2">
        <p className="eyebrow">Projected finish</p>
        <p className="font-mono text-canvas-dim text-[0.65rem] uppercase tracking-wider">
          Estimate
        </p>
      </div>
      {headline ? (
        <>
          <p className="font-mono text-brass text-3xl leading-none mb-3">
            {formatHms(headline.totalSeconds)}
          </p>
          <ul className="space-y-1">
            {data.map((p) => (
              <li key={p.basis} className="font-mono text-canvas-dim text-xs">
                {BASIS_LABEL[p.basis]} {formatHms(p.totalSeconds)} · {p.source.km} km at{" "}
                {formatPace(p.source.paceSecPerKm)}, {formatNiceDate(p.source.date)}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-canvas-dim text-sm">
          Log a quality run or a long run to see a projection.
        </p>
      )}
    </section>
  );
}
