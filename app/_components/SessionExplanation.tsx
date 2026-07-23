interface Props {
  text: string;
}

export default function SessionExplanation({ text }: Props) {
  return (
    <section className="border border-line bg-panel rounded-md p-4">
      <p className="eyebrow mb-2">What this means</p>
      <p className="text-canvas text-sm leading-relaxed">{text}</p>
    </section>
  );
}
