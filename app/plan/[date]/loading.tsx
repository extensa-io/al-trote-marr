import Skeleton from "@/app/_components/Skeleton";

export default function Loading() {
  return (
    <main className="max-w-md mx-auto px-5 py-8" aria-busy="true" aria-label="Loading session">
      <div className="flex items-baseline justify-between mb-6">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-3 w-28 mb-2" />
      <Skeleton className="h-60 w-full" />
    </main>
  );
}
