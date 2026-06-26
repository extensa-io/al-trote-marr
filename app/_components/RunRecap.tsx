import type { DailySummary } from "@/lib/types";

interface Props {
  entry: DailySummary;
  isRace?: boolean;
}

export default function RunRecap({ entry, isRace }: Props) {
  const insights = entry.insights ?? [];
  const suggestions = entry.suggestions ?? [];

  return (
    <section className="border border-line bg-panel rounded-md p-4">
      <p className="eyebrow mb-2">{isRace ? "Race recap" : "Run recap"}</p>
      <p className="text-canvas text-sm leading-relaxed whitespace-pre-line">
        {entry.text}
      </p>

      {insights.length > 0 && (
        <RecapList label="Insights" items={insights} />
      )}
      {suggestions.length > 0 && (
        <RecapList label="Suggestions" items={suggestions} />
      )}
    </section>
  );
}

function RecapList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="mt-4">
      <p className="eyebrow mb-2">{label}</p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-canvas text-sm leading-relaxed">
            <span aria-hidden className="text-brass shrink-0">
              •
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
