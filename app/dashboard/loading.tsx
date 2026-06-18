import Skeleton from "@/app/_components/Skeleton";

export default function Loading() {
  return (
    <main className="max-w-md mx-auto px-5 py-8" aria-busy="true" aria-label="Loading dashboard">
      <div className="flex items-baseline justify-between mb-6">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    </main>
  );
}
