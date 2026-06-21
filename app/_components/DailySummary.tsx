import type { DailySummary } from "@/lib/types";

interface Props {
  summary: DailySummary | null;
}

export default function DailySummary({ summary }: Props) {
  if (!summary) return null;

  return (
    <section className="border border-line bg-panel rounded-md p-4">
      <p className="eyebrow mb-2">Progress note</p>
      <p className="text-canvas text-sm leading-relaxed whitespace-pre-line">
        {summary.text}
      </p>
    </section>
  );
}
