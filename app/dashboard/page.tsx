import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user?.email) redirect("/signin");

  return (
    <main className="max-w-md mx-auto px-5 py-8">
      <h1 className="font-display font-bold text-brass text-2xl leading-none mb-6">Dashboard</h1>
      <section className="border border-line bg-panel rounded-md p-6">
        <p className="eyebrow mb-2">Coming next</p>
        <p className="text-canvas-dim text-sm leading-relaxed">
          Volume, adherence, and aerobic-efficiency views land in the next phase.
        </p>
      </section>
    </main>
  );
}
