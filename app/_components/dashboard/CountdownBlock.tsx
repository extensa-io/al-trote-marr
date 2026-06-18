import type { Countdown, PhaseStatus } from "@/lib/stats";
import { formatPercent } from "@/lib/stats";

interface Props {
  raceName: string;
  raceDate: string;
  countdown: Countdown;
  phaseStatus: PhaseStatus;
}

export default function CountdownBlock({ raceName, raceDate, countdown, phaseStatus }: Props) {
  return (
    <section className="border border-line bg-panel rounded-md p-5">
      <p className="eyebrow mb-1">Race</p>
      <p className="text-canvas text-lg leading-snug">{raceName}</p>
      <p className="font-mono text-canvas-dim text-xs mb-4">{raceDate}</p>

      <div className="flex items-baseline gap-6 mb-4">
        <div>
          <p className="font-mono text-brass text-3xl leading-none">{countdown.daysToRace}</p>
          <p className="eyebrow mt-1">Days to race</p>
        </div>
        <div>
          <p className="font-mono text-canvas text-2xl leading-none">{countdown.weeksToRace}</p>
          <p className="eyebrow mt-1">Weeks</p>
        </div>
      </div>

      {phaseStatus.phase ? (
        <div>
          <div className="flex items-baseline justify-between mb-1">
            <p className="eyebrow">Phase · {phaseStatus.phase}</p>
            <p className="font-mono text-canvas-dim text-xs">
              {formatPercent(phaseStatus.progress)} complete
            </p>
          </div>
          <div
            role="progressbar"
            aria-valuenow={Math.round(phaseStatus.progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${phaseStatus.phase} phase progress`}
            className="h-1.5 bg-field rounded-sm overflow-hidden"
          >
            <div
              className="h-full bg-brass"
              style={{ width: `${Math.min(100, Math.max(0, phaseStatus.progress * 100))}%` }}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
