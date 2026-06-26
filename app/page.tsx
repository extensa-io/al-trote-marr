import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  getDailySummary,
  getNextSession,
  getProfile,
  getSession,
  listSessions,
} from "@/lib/db";
import { daysBetween, todayStr } from "@/lib/date";
import { hrTargetForZone } from "@/lib/prescription";
import SessionDetail from "@/app/_components/SessionDetail";
import StrengthDetail from "@/app/_components/StrengthDetail";
import NextSession from "@/app/_components/NextSession";
import PageHeader from "@/app/_components/PageHeader";
import InstallHint from "@/app/_components/InstallHint";
import DailySummary from "@/app/_components/DailySummary";

export default async function Home() {
  const session = await auth();
  if (!session?.user?.email) redirect("/signin");
  const owner = session.user.email.toLowerCase();

  const profile = await getProfile(owner);
  const today = todayStr();
  const [todaySession, nextSession, all, summary] = await Promise.all([
    getSession(owner, today),
    getNextSession(owner, today),
    listSessions(owner),
    getDailySummary(owner, today),
  ]);
  const runs = all.filter((s) => s.type !== "Strength");
  const done = runs.filter((s) => s.status === "done").length;

  return (
    <main className="max-w-md mx-auto px-5 py-8">
      <PageHeader title="Al Trote Marr!" />

      {!profile ? (
        <section className="border border-line rounded-md p-6 text-center">
          <p className="font-display uppercase tracking-widest text-canvas-dim text-sm mb-2">
            No plan yet
          </p>
          <p className="text-sm text-canvas-dim">
            You&apos;re signed in, {session.user.name?.split(" ")[0] ?? "runner"}, but no plan has
            been added for you yet.
          </p>
        </section>
      ) : (
        <>
          <section className="border border-line bg-panel rounded-md p-3 mb-6 flex justify-between text-center">
            <Stat label="Days to race" value={`${daysBetween(today, profile.raceDate)}`} />
            <Stat label="Goal" value={profile.goal} />
            <Stat label="Logged" value={`${done}/${runs.length}`} />
          </section>

          <p className="eyebrow mb-2">Today</p>
          {todaySession ? (
            todaySession.type === "Strength" ? (
              <StrengthDetail session={todaySession} />
            ) : (
              <SessionDetail
                session={todaySession}
                hrTarget={hrTargetForZone(todaySession.zone, profile.zones)}
              />
            )
          ) : (
            <section className="border border-line rounded-md p-5 text-canvas-dim text-sm">
              Rest day. Nothing scheduled today.
            </section>
          )}

          <div className="mt-6">
            <NextSession session={nextSession} fromDate={today} />
          </div>

          {summary && (
            <div className="mt-6">
              <DailySummary summary={summary} />
            </div>
          )}

          <div className="mt-6">
            <InstallHint />
          </div>
        </>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1">
      <p className="font-mono text-lg text-canvas">{value}</p>
      <p className="eyebrow">{label}</p>
    </div>
  );
}
