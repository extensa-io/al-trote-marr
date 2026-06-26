import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import SessionDetail from "@/app/_components/SessionDetail";
import StrengthDetail from "@/app/_components/StrengthDetail";
import { getProfile, getSession } from "@/lib/db";
import { formatNiceDate } from "@/lib/date";
import { hrTargetForZone } from "@/lib/prescription";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface PageProps {
  params: Promise<{ date: string }>;
}

export default async function PlanDate({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.email) redirect("/signin");
  const owner = session.user.email.toLowerCase();

  const { date } = await params;
  if (!DATE_RE.test(date)) notFound();

  const [target, profile] = await Promise.all([getSession(owner, date), getProfile(owner)]);
  if (!target) notFound();

  return (
    <main className="max-w-md mx-auto px-5 py-8">
      <div className="flex items-baseline justify-between mb-6">
        <Link
          href="/plan"
          className="eyebrow text-canvas-dim hover:text-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass rounded-sm"
        >
          ← Plan
        </Link>
        <Link
          href="/settings"
          className="eyebrow text-canvas-dim hover:text-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass rounded-sm"
        >
          Settings
        </Link>
      </div>

      <p className="eyebrow mb-2">{formatNiceDate(target.date)}</p>
      {target.type === "Strength" ? (
        <StrengthDetail session={target} />
      ) : (
        <SessionDetail
          session={target}
          hrTarget={profile ? hrTargetForZone(target.zone, profile.zones) : null}
        />
      )}
    </main>
  );
}
