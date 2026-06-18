"use client";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: Props) {
  return (
    <main className="max-w-md mx-auto px-5 py-12 text-center">
      <p className="eyebrow mb-2">Something went wrong</p>
      <p className="text-canvas text-base leading-snug mb-2">
        We couldn&apos;t load this page.
      </p>
      {error.digest ? (
        <p className="font-mono text-canvas-dim text-xs mb-6">ref {error.digest}</p>
      ) : (
        <p className="font-mono text-canvas-dim text-xs mb-6">{error.message || "unknown error"}</p>
      )}
      <button
        type="button"
        onClick={reset}
        className="px-4 py-2 bg-brass text-field font-display uppercase tracking-wider text-sm rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
      >
        Try again
      </button>
    </main>
  );
}
