import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getProfile, listSessions } from "@/lib/db";
import { todayStr } from "@/lib/date";
import {
  adherence4wk,
  adherenceOverall,
  aerobicEfficiency,
  countdown,
  cumulativeKm,
  estimatedFinish,
  longRunProgression,
  phaseStatus,
  streak,
  weeklyVolume,
  zoneAdherence,
} from "@/lib/stats";
import CountdownBlock from "@/app/_components/dashboard/CountdownBlock";
import AdherenceBlock from "@/app/_components/dashboard/AdherenceBlock";
import WeeklyVolumeChart from "@/app/_components/dashboard/WeeklyVolumeChart";
import CumulativeChart from "@/app/_components/dashboard/CumulativeChart";
import LongRunChart from "@/app/_components/dashboard/LongRunChart";
import ZoneAdherenceCard from "@/app/_components/dashboard/ZoneAdherenceCard";
import AerobicEfficiencyChart from "@/app/_components/dashboard/AerobicEfficiencyChart";
import EstimatedFinishCard from "@/app/_components/dashboard/EstimatedFinishCard";
import PageHeader from "@/app/_components/PageHeader";

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user?.email) redirect("/signin");
  const owner = session.user.email.toLowerCase();

  const [profile, sessions] = await Promise.all([getProfile(owner), listSessions(owner)]);
  const today = todayStr();

  return (
    <main className="max-w-md mx-auto px-5 py-8">
      <PageHeader title="Dashboard" />

      {!profile || sessions.length === 0 ? (
        <section className="border border-line rounded-md p-6 text-center">
          <p className="font-display uppercase tracking-widest text-canvas-dim text-sm mb-2">
            No plan yet
          </p>
          <p className="text-sm text-canvas-dim">
            Stats appear once a plan is loaded and runs start coming in.
          </p>
        </section>
      ) : (
        <div className="space-y-4">
          <CountdownBlock
            raceName={profile.raceName}
            raceDate={profile.raceDate}
            countdown={countdown(profile, today)}
            phaseStatus={phaseStatus(sessions, today)}
          />
          <AdherenceBlock
            overall={adherenceOverall(sessions, today)}
            fourWeek={adherence4wk(sessions, today)}
            streak={streak(sessions, today)}
          />
          <WeeklyVolumeChart data={weeklyVolume(sessions)} />
          <CumulativeChart data={cumulativeKm(sessions)} />
          <LongRunChart data={longRunProgression(sessions)} />
          <ZoneAdherenceCard data={zoneAdherence(sessions, profile)} />
          <AerobicEfficiencyChart data={aerobicEfficiency(sessions)} />
          <EstimatedFinishCard data={estimatedFinish(sessions)} />
        </div>
      )}
    </main>
  );
}
