import Skeleton from "@/app/_components/Skeleton";

export default function Loading() {
  return (
    <main className="max-w-md mx-auto px-5 py-8" aria-busy="true" aria-label="Loading plan">
      <div className="flex items-baseline justify-between mb-6">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-14" />
        ))}
      </div>
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, w) => (
          <div key={w}>
            <Skeleton className="h-3 w-20 mb-2" />
            <div className="space-y-1">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
