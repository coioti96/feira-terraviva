import { Skeleton } from "@/components/ui/skeleton";

export function ProductGridSkeleton({ n = 8 }: { n?: number }) {
  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: n }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col bg-[var(--tv-white)] rounded-[var(--r-xl)] border border-[var(--tv-stone-200)] overflow-hidden"
        >
          <div className="pt-6 pb-3 px-6 flex justify-center">
            <Skeleton className="h-32 w-32 rounded-full" />
          </div>
          <div className="p-4 flex flex-col items-center gap-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-8 w-full rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}