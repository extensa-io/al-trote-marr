import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getProfile, listSessions } from "@/lib/db";
import { formatDayShort, todayStr } from "@/lib/date";
import type { Phase, Session } from "@/lib/types";
import PageHeader from "@/app/_components/PageHeader";

const PHASES: ReadonlyArray<Phase> = ["Base", "Build", "Peak", "Taper"];

function isPhase(v: string | undefined): v is Phase {
  return !!v && (PHASES as readonly string[]).includes(v);
}

interface PageProps {
  searchParams: Promise<{ phase?: string }>;
}

export default async function PlanPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.email) redirect("/signin");
  const owner = session.user.email.toLowerCase();

  const { phase } = await searchParams;
  const activePhase = isPhase(phase) ? phase : null;

  const [profile, all] = await Promise.all([getProfile(owner), listSessions(owner)]);

  if (!profile || all.length === 0) {
    return (
      <main className="max-w-md mx-auto px-5 py-8">
        <PageHeader title="Plan" />
        <section className="border border-line rounded-md p-6 text-center mt-6">
          <p className="font-display uppercase tracking-widest text-canvas-dim text-sm mb-2">
            No plan yet
          </p>
          <p className="text-sm text-canvas-dim">
            You don&apos;t have any sessions scheduled.
          </p>
        </section>
      </main>
    );
  }

  const today = todayStr();
  const todayIdx = all.findIndex((s) => s.date === today);
  const nextIdx = todayIdx >= 0 ? todayIdx : all.findIndex((s) => s.date > today);
  const currentWeek = nextIdx >= 0 ? all[nextIdx].week : all[all.length - 1].week;

  const filtered = activePhase ? all.filter((s) => s.phase === activePhase) : all;
  const weeks = groupByWeek(filtered);
  const visibleWeeks = new Set(weeks.map(([w]) => w));
  const showJump = visibleWeeks.has(currentWeek);

  return (
    <main className="max-w-md mx-auto px-5 py-8">
      <PageHeader title="Plan" />

      <nav aria-label="Filter by phase" className="flex flex-wrap gap-2 mt-6 mb-4">
        <PhaseChip href="/plan" active={activePhase == null}>
          All
        </PhaseChip>
        {PHASES.map((p) => (
          <PhaseChip key={p} href={`/plan?phase=${p}`} active={activePhase === p}>
            {p}
          </PhaseChip>
        ))}
      </nav>

      {showJump ? (
        <div className="text-right mb-4">
          <Link
            href={`#week-${currentWeek}`}
            className="inline-block eyebrow text-brass hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass rounded-sm"
          >
            Jump to current week
          </Link>
        </div>
      ) : null}

      <div className="space-y-6">
        {weeks.map(([week, sessions], i) => {
          const prevPhase = i === 0 ? null : weeks[i - 1][1][0].phase;
          const currentPhase = sessions[0].phase;
          const showBand = prevPhase !== currentPhase;
          const isCurrent = week === currentWeek;
          return (
            <div key={week} id={`week-${week}`} className="scroll-mt-6">
              {showBand ? <PhaseBand phase={currentPhase} /> : null}
              <h2
                className={`eyebrow mb-2 ${isCurrent ? "text-brass" : ""}`}
                aria-current={isCurrent ? "true" : undefined}
              >
                Week {week}
              </h2>
              <ul className="space-y-1">
                {sessions.map((s) => (
                  <li key={s.date}>
                    <PlanRow session={s} today={today} />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </main>
  );
}

function groupByWeek(sessions: Session[]): Array<[number, Session[]]> {
  const map = new Map<number, Session[]>();
  for (const s of sessions) {
    const arr = map.get(s.week) ?? [];
    arr.push(s);
    map.set(s.week, arr);
  }
  return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
}

function PhaseChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1 rounded-md border font-display uppercase tracking-wider text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass ${
        active ? "border-brass text-brass" : "border-line text-canvas-dim hover:text-canvas"
      }`}
    >
      {children}
    </Link>
  );
}

function PhaseBand({ phase }: { phase: Phase }) {
  return (
    <div className="border-t border-line pt-3 mb-3">
      <p className="eyebrow text-brass">Phase · {phase}</p>
    </div>
  );
}

function PlanRow({ session, today }: { session: Session; today: string }) {
  const isToday = session.date === today;
  const accent = isToday
    ? "border-l-brass"
    : session.status === "done"
      ? "border-l-confirmed"
      : session.status === "skipped"
        ? "border-l-signal"
        : "border-l-line";

  return (
    <Link
      href={`/plan/${session.date}`}
      className={`block border border-line border-l-4 ${accent} bg-panel rounded-md px-3 py-2 hover:bg-raised transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-canvas-dim">{formatDayShort(session.date)}</p>
          <p className="text-canvas text-sm leading-snug truncate">
            {session.type} · {session.zone}
          </p>
        </div>
        <p className="font-mono text-canvas text-sm shrink-0">{session.plannedKm} km</p>
      </div>
    </Link>
  );
}
