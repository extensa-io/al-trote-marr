import Skeleton from "@/app/_components/Skeleton";

export default function Loading() {
  return (
    <main className="max-w-md mx-auto px-5 py-8" aria-busy="true" aria-label="Loading today">
      <div className="flex items-baseline justify-between mb-6">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-14 w-full mb-6" />
      <Skeleton className="h-3 w-16 mb-2" />
      <Skeleton className="h-44 w-full mb-6" />
      <Skeleton className="h-24 w-full" />
    </main>
  );
}
