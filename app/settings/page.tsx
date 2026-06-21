import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { getProfile } from "@/lib/db";
import { formatPace } from "@/lib/pace";
import { formatNiceDate } from "@/lib/date";
import PageHeader from "@/app/_components/PageHeader";
import DailyReminderToggle from "./_components/DailyReminderToggle";

export default async function Settings() {
  const session = await auth();
  if (!session?.user?.email) redirect("/signin");
  const owner = session.user.email.toLowerCase();

  const profile = await getProfile(owner);

  return (
    <main className="max-w-md mx-auto px-5 py-8">
      <PageHeader title="Settings" />

      <section className="border border-line bg-panel rounded-md p-5 mb-4">
        <p className="eyebrow mb-3">Account</p>
        <div className="space-y-1">
          {session.user.name ? (
            <p className="text-canvas text-sm">{session.user.name}</p>
          ) : null}
          <p className="font-mono text-canvas-dim text-xs">{session.user.email}</p>
        </div>
      </section>

      <DailyReminderToggle />

      {profile ? (
        <>
          <section className="border border-line bg-panel rounded-md p-5 mb-4">
            <p className="eyebrow mb-3">Goal</p>
            <dl className="grid grid-cols-2 gap-y-3 gap-x-4 font-mono text-sm">
              <Row label="Race" value={profile.raceName} />
              <Row label="Date" value={formatNiceDate(profile.raceDate)} />
              <Row label="Goal" value={profile.goal} />
              <Row label="Baseline" value={profile.baseline} />
              <Row label="Goal pace" value={formatPace(profile.goalPaceSecPerKm)} />
            </dl>
          </section>

          <section className="border border-line bg-panel rounded-md p-5 mb-4">
            <p className="eyebrow mb-3">Physiology</p>
            <dl className="grid grid-cols-2 gap-y-3 gap-x-4 font-mono text-sm">
              <Row label="Max HR" value={`${profile.maxHr} bpm`} />
              <Row label="VO₂ est." value={`${profile.vo2}`} />
            </dl>
          </section>

          <section className="border border-line bg-panel rounded-md p-5 mb-4">
            <p className="eyebrow mb-3">Heart-rate zones</p>
            <ul className="space-y-2 font-mono text-sm">
              {profile.zones.map((z) => (
                <li key={z.z} className="flex items-baseline justify-between gap-3">
                  <span className="text-canvas">
                    Z{z.z} · <span className="text-canvas-dim">{z.name}</span>
                  </span>
                  <span className="text-canvas">
                    {z.min}–{z.max} bpm
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <section className="border border-line rounded-md p-6 text-center mb-4">
          <p className="text-sm text-canvas-dim">No profile loaded yet.</p>
        </section>
      )}

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/signin" });
        }}
      >
        <button
          type="submit"
          className="w-full border border-signal text-signal font-display uppercase tracking-wider text-sm py-2 rounded-md hover:bg-signal hover:text-canvas transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="eyebrow mb-0.5">{label}</dt>
      <dd className="text-canvas">{value}</dd>
    </div>
  );
}
