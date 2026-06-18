import Link from "next/link";

interface Props {
  title: string;
}

export default function PageHeader({ title }: Props) {
  return (
    <header className="flex items-baseline justify-between mb-6">
      <h1 className="font-display font-bold text-brass text-2xl leading-none">{title}</h1>
      <Link
        href="/settings"
        className="eyebrow text-canvas-dim hover:text-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass rounded-sm"
      >
        Settings
      </Link>
    </header>
  );
}
