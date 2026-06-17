import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { getNextSession, getProfile, getSession, listSessions } from "@/lib/db";
import { daysBetween, todayStr } from "@/lib/date";
import TodayFocus from "@/app/_components/TodayFocus";
import NextSession from "@/app/_components/NextSession";

export default async function Home() {
  const session = await auth();
  if (!session?.user?.email) redirect("/signin");
  const owner = session.user.email.toLowerCase();

  const profile = await getProfile(owner);
  const today = todayStr();
  const [todaySession, nextSession, all] = await Promise.all([
    getSession(owner, today),
    getNextSession(owner, today),
    listSessions(owner),
  ]);
  const done = all.filter((s) => s.status === "done").length;

  return (
    <main className="max-w-md mx-auto px-5 py-8">
      <header className="flex items-baseline justify-between mb-8">
        <h1 className="font-display font-bold text-brass text-2xl leading-none">Al Trote Marr!</h1>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/signin" });
          }}
        >
          <button className="eyebrow hover:text-canvas transition">Sign out</button>
        </form>
      </header>

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
            <Stat label="Logged" value={`${done}/${all.length}`} />
          </section>

          <p className="eyebrow mb-2">Today</p>
          {todaySession ? (
            <TodayFocus session={todaySession} />
          ) : (
            <section className="border border-line rounded-md p-5 text-canvas-dim text-sm">
              Rest day. Nothing scheduled today.
            </section>
          )}

          <div className="mt-6">
            <NextSession session={nextSession} fromDate={today} />
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
