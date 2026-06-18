import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import SessionDetail from "@/app/_components/SessionDetail";
import { getSession } from "@/lib/db";
import { formatNiceDate } from "@/lib/date";

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

  const target = await getSession(owner, date);
  if (!target) notFound();

  return (
    <main className="max-w-md mx-auto px-5 py-8">
      <Link
        href="/plan"
        className="eyebrow text-canvas-dim hover:text-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass rounded-sm"
      >
        ← Plan
      </Link>

      <p className="eyebrow mt-6 mb-2">{formatNiceDate(target.date)}</p>
      <SessionDetail session={target} />
    </main>
  );
}
