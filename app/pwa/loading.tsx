import { Skeleton } from "@/components/ui/skeleton";

export default function PWAPageLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-8">
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-80" />
        <Skeleton className="h-8 w-28 rounded-full" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}
