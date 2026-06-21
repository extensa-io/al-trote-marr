import { daysBetween, formatNiceDate, relativeDays } from "@/lib/date";
import type { Session } from "@/lib/types";

interface Props {
  session: Session | null;
  fromDate: string;
}

export default function NextSession({ session, fromDate }: Props) {
  if (!session) {
    return (
      <section className="border border-line rounded-md p-4 text-canvas-dim text-sm">
        <p className="eyebrow mb-1">Next</p>
        <p>No upcoming sessions.</p>
      </section>
    );
  }

  const daysAhead = daysBetween(fromDate, session.date);

  return (
    <section className="border border-line bg-panel rounded-md p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="eyebrow">Next</p>
        <p className="font-mono text-canvas-dim text-xs">
          {formatNiceDate(session.date)} · {relativeDays(daysAhead)}
        </p>
      </div>
      <p className="font-display uppercase tracking-wider text-canvas text-sm mb-1">
        {session.type === "Strength" ? "Strength" : `${session.type} · ${session.zone}`}
      </p>
      <p className="text-canvas text-sm leading-snug mb-2">{session.title}</p>
      <p className="font-mono text-canvas-dim text-xs">
        {session.type === "Strength"
          ? `~15-20 min · Week ${session.week} · ${session.phase}`
          : `Planned ${session.plannedKm} km · Week ${session.week} · ${session.phase}`}
      </p>
    </section>
  );
}
