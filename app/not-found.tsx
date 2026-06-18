import Link from "next/link";

export default function NotFound() {
  return (
    <main className="max-w-md mx-auto px-5 py-12 text-center">
      <p className="eyebrow mb-2">Not found</p>
      <p className="text-canvas text-base leading-snug mb-6">
        This page or session doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="inline-block px-4 py-2 border border-line text-canvas-dim hover:text-canvas font-display uppercase tracking-wider text-sm rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
      >
        Back to Today
      </Link>
    </main>
  );
}
